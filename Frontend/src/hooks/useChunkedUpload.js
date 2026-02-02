import { useState, useCallback } from 'react'
import api from '../api/axios'
import CryptoJS from 'crypto-js'

export function useChunkedUpload() {
  const [uploads, setUploads] = useState({}) // uploadId -> upload state

  const sleep = useCallback((ms) => new Promise((resolve) => setTimeout(resolve, ms)), [])

  const calculateChunkHash = useCallback((chunk) => {
    // Convert Uint8Array to hex string for hashing
    const wordArray = CryptoJS.lib.WordArray.create(chunk)
    return CryptoJS.SHA256(wordArray).toString()
  }, [])

  const initUpload = useCallback(async (file, receiverId, preferredChunkSize) => {
    try {
      const res = await api.post('/files/chunked/init', {
        filename: file.name,
        fileSize: file.size,
        receiver: receiverId,
        mimeType: file.type,
        preferredChunkSize
      })

      const { uploadId, chunkSize, totalChunks } = res.data

      setUploads(prev => ({
        ...prev,
        [uploadId]: {
          uploadId,
          file,
          chunkSize,
          totalChunks,
          uploadedChunks: [],
          progress: 0,
          status: 'initializing',
          error: null,
          startTime: Date.now()
        }
      }))

      return { uploadId, chunkSize, totalChunks }
    } catch (error) {
      throw error
    }
  }, [])

  const uploadChunk = useCallback(async (uploadId, chunkNumber, chunkData, totalChunks, onChunkProgress) => {
    const maxRetries = 2
    let lastError = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const formData = new FormData()
        
        // chunkData can be Blob or Uint8Array
        const blob = chunkData instanceof Blob ? chunkData : new Blob([chunkData])
        
        // Skip hash calculation for very large chunks (> 20MB) to avoid memory issues
        let chunkHash = null
        if (blob.size <= 20 * 1024 * 1024) {
          // For small chunks, calculate hash
          const arrayBuffer = await blob.arrayBuffer()
          const uint8 = new Uint8Array(arrayBuffer)
          chunkHash = calculateChunkHash(uint8)
        }

        formData.append('chunk', blob, `chunk_${chunkNumber}`)
        formData.append('uploadId', uploadId)
        formData.append('chunkNumber', chunkNumber)
        formData.append('totalChunks', totalChunks)
        if (chunkHash) {
          formData.append('chunkHash', chunkHash)
        }

        const res = await api.post('/files/chunked/upload-chunk', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 0,
          onUploadProgress: (event) => {
            if (!onChunkProgress || !event.total) return
            const percent = Math.min(100, Math.round((event.loaded / event.total) * 100))
            onChunkProgress(percent)
          }
        })

        const uploadedChunks = res.data.uploadedChunks || []
        
        setUploads(prev => ({
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            uploadedChunks: uploadedChunks,
            progress: Math.round((uploadedChunks.length / totalChunks) * 100),
            status: 'uploading'
          }
        }))

        return res.data
      } catch (error) {
        lastError = error
        if (attempt < maxRetries) {
          await sleep(500 * Math.pow(2, attempt))
          continue
        }
        setUploads(prev => ({
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            error: error.response?.data?.message || error.message,
            status: 'error'
          }
        }))
        throw error
      }
    }
    throw lastError
  }, [calculateChunkHash, sleep])

  const uploadFile = useCallback(async (file, receiverId, onProgress) => {
    const fileSizeInMB = file.size / (1024 * 1024);

    const pickSettings = (level) => {
      if (level === 0) {
        if (fileSizeInMB < 50) return { chunkSize: 5 * 1024 * 1024, parallel: 2 };
        if (fileSizeInMB < 200) return { chunkSize: 10 * 1024 * 1024, parallel: 3 };
        if (fileSizeInMB < 500) return { chunkSize: 25 * 1024 * 1024, parallel: 3 };
        return { chunkSize: 32 * 1024 * 1024, parallel: 3 };
      }
      if (level === 1) {
        return { chunkSize: 10 * 1024 * 1024, parallel: 2 };
      }
      return { chunkSize: 5 * 1024 * 1024, parallel: 2 };
    };

    const runUpload = async ({ chunkSize: preferredChunkSize, parallel }) => {
      const { uploadId, chunkSize, totalChunks } = await initUpload(file, receiverId, preferredChunkSize)

      if (onProgress) onProgress(1)

      let completedChunks = 0
      const inFlightProgress = {}

      for (let i = 1; i <= totalChunks; i += parallel) {
        const batch = []
        for (let j = 0; j < parallel && i + j <= totalChunks; j++) {
          const chunkNum = i + j
          const start = (chunkNum - 1) * chunkSize
          const end = Math.min(start + chunkSize, file.size)
          const chunk = file.slice(start, end)

          batch.push(
            uploadChunk(uploadId, chunkNum, chunk, totalChunks, (percent) => {
              inFlightProgress[chunkNum] = percent
              if (onProgress) {
                const inFlightSum = Object.values(inFlightProgress).reduce((acc, val) => acc + val, 0)
                const progress = Math.round(((completedChunks + (inFlightSum / 100)) / totalChunks) * 95)
                onProgress(progress)
              }
            })
              .then(() => {
                delete inFlightProgress[chunkNum]
                completedChunks++
                const progress = Math.round((completedChunks / totalChunks) * 95)
                if (onProgress) onProgress(progress)
              })
          )
        }
        await Promise.all(batch)
      }

      if (onProgress) onProgress(96)
      const completeRes = await api.post('/files/chunked/complete', {
        uploadId,
        fileHash: null
      }, {
        timeout: 0
      })

      if (onProgress) onProgress(100)

      setUploads(prev => ({
        ...prev,
        [uploadId]: {
          ...prev[uploadId],
          status: 'completed',
          fileId: completeRes.data.fileId
        }
      }))

      return { success: true, fileId: completeRes.data.fileId, uploadId }
    };

    try {
      return await runUpload(pickSettings(0))
    } catch (error) {
      const status = error?.response?.status
      const msg = error?.message || ''
      const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('network')
      if (status === 413 || status === 408 || isTimeout) {
        try {
          return await runUpload(pickSettings(1))
        } catch (err2) {
          return await runUpload(pickSettings(2))
        }
      }
      console.error('Upload failed:', error)
      throw error
    }
  }, [initUpload, uploadChunk])

  const getUploadStatus = useCallback(async (uploadId) => {
    try {
      const res = await api.get(`/files/chunked/status/${uploadId}`)
      return res.data
    } catch (error) {
      throw error
    }
  }, [])

  const cancelUpload = useCallback(async (uploadId) => {
    try {
      await api.delete(`/files/chunked/${uploadId}`)
      setUploads(prev => {
        const updated = { ...prev }
        delete updated[uploadId]
        return updated
      })
    } catch (error) {
      throw error
    }
  }, [])

  return {
    uploads,
    uploadFile,
    initUpload,
    uploadChunk,
    getUploadStatus,
    cancelUpload
  }
}
