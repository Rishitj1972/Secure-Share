import { useState, useCallback, useRef } from 'react'
import api from '../api/axios'
import CryptoJS from 'crypto-js'

export function useChunkedUpload() {
  const [uploads, setUploads] = useState({}) // uploadId -> upload state
  const abortControllers = useRef({}) // uploadId -> AbortController

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
    const maxRetries = 3
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
          timeout: 1800000, // 30 minutes timeout for each chunk
          signal: abortControllers.current[uploadId]?.signal,
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
        
        // Check if upload was cancelled
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          throw error // Don't retry if cancelled
        }
        
        const isTimeout = error.message.includes('timeout') || 
                         error.message.includes('context canceled') ||
                         error.code === 'ECONNABORTED'
        
        if (attempt < maxRetries && isTimeout) {
          const waitTime = 1000 * Math.pow(2, attempt) // Exponential backoff: 1s, 2s, 4s
          await sleep(waitTime)
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

  const uploadFile = useCallback(async (file, receiverId, onProgress, onUploadIdReady) => {
    const fileSizeInMB = file.size / (1024 * 1024);

    const pickSettings = (level) => {
      if (level === 0) {
        // Reduced chunk sizes for stable uploads through slow networks (Cloudflare tunnel)
        if (fileSizeInMB < 50) return { chunkSize: 2 * 1024 * 1024, parallel: 2 }; // 2MB chunks
        if (fileSizeInMB < 200) return { chunkSize: 5 * 1024 * 1024, parallel: 2 }; // 5MB chunks
        if (fileSizeInMB < 500) return { chunkSize: 10 * 1024 * 1024, parallel: 2 }; // 10MB chunks
        return { chunkSize: 15 * 1024 * 1024, parallel: 2 }; // 15MB chunks for large files
      }
      if (level === 1) {
        return { chunkSize: 5 * 1024 * 1024, parallel: 1 }; // 5MB, single parallel
      }
      return { chunkSize: 2 * 1024 * 1024, parallel: 1 }; // 2MB, single parallel
    };

    const runUpload = async ({ chunkSize: preferredChunkSize, parallel }) => {
      const { uploadId, chunkSize, totalChunks } = await initUpload(file, receiverId, preferredChunkSize)

      // Create AbortController for this upload
      abortControllers.current[uploadId] = new AbortController()

      // Notify caller that uploadId is ready
      if (onUploadIdReady) {
        onUploadIdReady(uploadId)
      }

      if (onProgress) onProgress(1)

      let completedChunks = 0
      let lastReportedProgress = 1
      const chunkSizes = {}
      const inFlightProgress = {}

      const reportProgressFromBytes = () => {
        const totalBytes = file.size
        let uploadedBytes = 0

        // Optimize by iterating directly over entries
        for (const key in chunkSizes) {
          const size = chunkSizes[key]
          const percent = inFlightProgress[key] ?? 0
          uploadedBytes += (percent / 100) * size
        }

        const progress = Math.min(95, Math.max(1, Math.round((uploadedBytes / totalBytes) * 95)))
        if (progress > lastReportedProgress) {
          lastReportedProgress = progress
          if (onProgress) {
            onProgress(progress)
          }
        }
      }

      for (let i = 1; i <= totalChunks; i += parallel) {
        const batch = []
        for (let j = 0; j < parallel && i + j <= totalChunks; j++) {
          const chunkNum = i + j
          const start = (chunkNum - 1) * chunkSize
          const end = Math.min(start + chunkSize, file.size)
          const chunk = file.slice(start, end)

          chunkSizes[chunkNum] = chunk.size
          inFlightProgress[chunkNum] = 0

          batch.push(
            uploadChunk(uploadId, chunkNum, chunk, totalChunks, (percent) => {
              inFlightProgress[chunkNum] = percent
              reportProgressFromBytes()
            }).then(() => {
              completedChunks++
              inFlightProgress[chunkNum] = 100
              reportProgressFromBytes()
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
        timeout: 1800000 // 30 minutes timeout for finalization
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

      // Clean up AbortController
      delete abortControllers.current[uploadId]

      return { success: true, fileId: completeRes.data.fileId, uploadId }
    };

    try {
      return await runUpload(pickSettings(0))
    } catch (error) {
      // Check if upload was cancelled
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        throw new Error('Upload cancelled')
      }
      
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
      // Abort ongoing requests
      if (abortControllers.current[uploadId]) {
        abortControllers.current[uploadId].abort()
        delete abortControllers.current[uploadId]
      }

      // Update local state immediately
      setUploads(prev => ({
        ...prev,
        [uploadId]: {
          ...prev[uploadId],
          status: 'cancelled',
          error: 'Upload cancelled by user'
        }
      }))

      // Notify backend to cleanup
      await api.delete(`/files/chunked/${uploadId}`)

      // Remove from state after backend confirms
      setTimeout(() => {
        setUploads(prev => {
          const updated = { ...prev }
          delete updated[uploadId]
          return updated
        })
      }, 1000)
    } catch (error) {
      // Even if backend call fails, local cancellation succeeded via AbortController
      // Silently handle server cleanup errors as they're not critical
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
