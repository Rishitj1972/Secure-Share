import React, { useState, useRef } from 'react'
import { useChunkedUpload } from '../hooks/useChunkedUpload'

export default function FileUpload({ recipientId, onUploadComplete }) {
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [currentUploadId, setCurrentUploadId] = useState(null)
  const [uploadStarted, setUploadStarted] = useState(false)
  const { uploadFile, cancelUpload } = useChunkedUpload()

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadError(null)
      setUploadProgress(0)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatSpeed = (bytesPerSec) => {
    return formatFileSize(bytesPerSec) + '/s'
  }

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`
    return `${Math.round(seconds / 3600)}h`
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file')
      return
    }

    if (!recipientId) {
      setUploadError('Please select a recipient')
      return
    }

    setIsUploading(true)
    setUploadStarted(true)
    setUploadError(null)
    setUploadProgress(0)
    setUploadSpeed(0)
    setTimeRemaining(null)

    const startTime = Date.now()
    let lastProgress = 0

    try {
      const uploadResult = await uploadFile(
        selectedFile, 
        recipientId, 
        (progress) => {
          // Ensure progress never decreases
          const safeProgress = Math.max(lastProgress, Math.round(progress))
          lastProgress = safeProgress
          
          // Force state update with current progress
          setUploadProgress(safeProgress)
          
          const now = Date.now()
          const elapsedTime = (now - startTime) / 1000
          
          // Calculate speed
          if (safeProgress > 0 && elapsedTime > 1) {
            const bytesUploaded = (safeProgress / 100) * selectedFile.size
            const speed = bytesUploaded / elapsedTime
            setUploadSpeed(speed)
            
            // Calculate time remaining
            if (safeProgress < 100 && speed > 0) {
              const bytesRemaining = selectedFile.size - bytesUploaded
              const timeLeft = bytesRemaining / speed
              setTimeRemaining(timeLeft)
            }
          }
        },
        (uploadId) => {
          setCurrentUploadId(uploadId)
        }
      )

      if (uploadResult.success) {
        const endTime = Date.now()
        const totalTime = (endTime - startTime) / 1000
        const avgSpeed = selectedFile.size / totalTime
        
        setUploadProgress(100)
        setTimeRemaining(0)

        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''

        onUploadComplete?.({
          fileId: uploadResult.fileId,
          filename: selectedFile.name,
          size: selectedFile.size,
          uploadTime: totalTime,
          avgSpeed
        })

        setTimeout(() => {
          setUploadProgress(0)
          setUploadSpeed(0)
          setUploadStarted(false)
        }, 2000)
      }
    } catch (error) {
      const errorMsg = error.message || 'Upload failed'
      if (errorMsg.includes('cancelled') || errorMsg.includes('canceled')) {
        setUploadError(null)
      } else {
        setUploadError(errorMsg)
      }
    } finally {
      setIsUploading(false)
      setCurrentUploadId(null)
    }
  }

  const handleCancel = async () => {
    if (currentUploadId) {
      try {
        await cancelUpload(currentUploadId)
        setUploadError(null)
        setUploadProgress(0)
        setUploadSpeed(0)
        setTimeRemaining(null)
        setIsUploading(false)
        setUploadStarted(false)
        setCurrentUploadId(null)
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch (error) {
        console.error('Error cancelling upload:', error)
      }
    }
  }

  return (
    <div className="file-upload-container p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Upload File</h3>

      {uploadError && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
          {uploadError}
        </div>
      )}

      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="w-full"
        />
      </div>

      {selectedFile && (
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <div className="font-medium">{selectedFile.name}</div>
          <div className="text-sm text-gray-600">
            Size: {formatFileSize(selectedFile.size)}
          </div>
        </div>
      )}

      {(isUploading || uploadStarted) && (
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-bold text-blue-700">📤 Uploading...</span>
            <span className="text-sm font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden shadow-md">
            <div
              className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 h-4 rounded-full transition-all duration-300 ease-out shadow-lg"
              style={{ width: `${uploadProgress}%` }}
            >
              {uploadProgress > 5 && (
                <div className="h-full flex items-center justify-end pr-2">
                  <span className="text-xs font-bold text-white drop-shadow-md"></span>
                </div>
              )}
            </div>
          </div>
          {uploadSpeed > 0 && (
            <div className="flex justify-between text-xs text-gray-700 mt-2 font-medium">
              <span>🚀 Speed: {formatSpeed(uploadSpeed)}</span>
              {timeRemaining !== null && timeRemaining > 0 && (
                <span>⏱️ Time left: {formatTime(timeRemaining)}</span>
              )}
            </div>
          )}
          {uploadSpeed === 0 && uploadProgress > 0 && (
            <div className="text-xs text-gray-600 mt-2 font-medium animate-pulse">⏳ Initializing upload...</div>
          )}
        </div>
      )}

      {uploadProgress === 100 && !isUploading && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
          ✓ Upload completed successfully!
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 transition-colors"
        >
          {isUploading ? 'Uploading...' : 'Upload File'}
        </button>
        {(isUploading || uploadStarted) && currentUploadId && (
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium shadow-md hover:shadow-lg"
            title="Cancel upload"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
