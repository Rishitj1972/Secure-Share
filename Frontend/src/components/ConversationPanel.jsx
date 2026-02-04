import React, { useEffect, useState, useRef } from 'react'
import api from '../api/axios'
import FileCard from './FileCard'
import { useChunkedUpload } from '../hooks/useChunkedUpload'
import { useFileEncryption } from '../hooks/useFileEncryption'
import { useFileDecryption } from '../hooks/useFileDecryption'
import { useAuth } from '../context/AuthContext'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const uploadsBase = baseURL.replace(/\/api\/?$/, '')

function getPhotoUrl(photo) {
  if (!photo) return ''
  if (photo.startsWith('http')) return photo
  return `${uploadsBase}${photo}`
}

function getInitials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean)
  const first = parts[0]?.[0] || ''
  const second = parts[1]?.[0] || ''
  return (first + second).toUpperCase() || '?'
}

export default function ConversationPanel({ userId, userObj, showNotification }){
  const [files, setFiles] = useState([])
  const [fileInput, setFileInput] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [currentUploadId, setCurrentUploadId] = useState(null)
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStage, setDownloadStage] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const mounted = useRef(true)
  const { uploadFile, cancelUpload } = useChunkedUpload()
  const { encryptFileForUpload, getReceiverPublicKey } = useFileEncryption()
  const { downloadAndDecrypt } = useFileDecryption()
  const { user } = useAuth()

  useEffect(()=>{
    mounted.current = true
    const load = async () => {
      if(!userId) return
      setLoading(true)
      try{
        const res = await api.get(`/files/with/${userId}`)
        if(!mounted.current) return
        setFiles(res.data)
      }catch(err){
        showNotification && showNotification(err?.response?.data?.message || 'Failed to load files', 'error')
      }finally{
        setLoading(false)
      }
    }
    load()
    return ()=>{ mounted.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[userId])

  const submit = async (e) => {
    e && e.preventDefault && e.preventDefault()
    if(!fileInput) return setMsg('Please select a file')
    if(!userId) return setMsg('Please select a user')
    if(isUploading) return setMsg('Upload already in progress')
    
    setIsUploading(true)
    setUploadProgress(0)
    setUploadSpeed(0)
    setElapsedTime(0)
    setCurrentUploadId(null)
    setMsg('')
    const startTime = Date.now()
    let lastUpdateTime = startTime
    
    try{
      // Step 1: Get receiver's public key
      setMsg('🔐 Fetching encryption key...')
      setIsEncrypting(true)
      const receiverPublicKey = await getReceiverPublicKey(userId)
      
      if (!receiverPublicKey) {
        throw new Error('Receiver has not set up encryption keys. Please ask them to register again.')
      }

      // Step 2: Encrypt file
      setMsg('🔐 Encrypting file...')
      const { encryptedFile, encryptedAesKey, iv, fileHash } = await encryptFileForUpload(fileInput, receiverPublicKey)
      setIsEncrypting(false)
      
      setMsg('📤 Uploading encrypted file...')
      
      // Step 3: Upload encrypted file
      const result = await uploadFile(
        encryptedFile,
        userId,
        (progress) => {
          const safeProgress = Math.max(0, Math.min(100, Math.round(progress)))
          setUploadProgress(prev => Math.max(prev, safeProgress))
          
          const now = Date.now()
          const elapsed = (now - startTime) / 1000
          setElapsedTime(Math.round(elapsed))

          // Update speed every 500ms to avoid too frequent updates
          if (elapsed > 0.5 && (now - lastUpdateTime) >= 500) {
            const bytesUploaded = (safeProgress / 100) * encryptedFile.size
            const speed = bytesUploaded / elapsed
            setUploadSpeed(speed)
            lastUpdateTime = now
          }
        },
        (uploadId) => {
          setCurrentUploadId(uploadId)
        },
        { encryptedAesKey, iv, fileHash } // Encryption metadata
      )
      
      setMsg('File sent successfully!')
      showNotification && showNotification('File sent', 'success')
      setFileInput(null)
      
      // Refresh file list
      const r = await api.get(`/files/with/${userId}`)
      setFiles(r.data)
      
      // Reset progress bar after a short delay
      setTimeout(() => {
        setUploadProgress(0)
        setUploadSpeed(0)
        setElapsedTime(0)
        setMsg('')
      }, 2000)
    }catch(err){
      const errorMsg = err?.response?.data?.message || err?.message || 'Upload failed'
      setMsg(errorMsg)
      showNotification && showNotification(errorMsg, 'error')
    }finally{
      setIsUploading(false)
      setCurrentUploadId(null)
    }
  }

  const handleCancel = async () => {
    if (!currentUploadId) return
    
    // Immediately update UI state
    setIsUploading(false)
    setUploadProgress(0)
    setUploadSpeed(0)
    setElapsedTime(0)
    const uploadIdToCancel = currentUploadId
    setCurrentUploadId(null)
    setFileInput(null)
    
    try {
      // Cancel upload and cleanup chunks on server
      await cancelUpload(uploadIdToCancel)
      setMsg('Upload cancelled - chunks cleared')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      // Even if server cancel fails, UI is already reset
      setMsg('Upload cancelled (local)')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const onDownload = async (fileId, fileMeta) => {
    try{
      setIsDownloading(true)
      setDownloadProgress(0)
      setDownloadStage('starting')
      showNotification && showNotification('Starting download...', 'info')

      // Download and decrypt file with progress tracking
      const decryptedBlob = await downloadAndDecrypt(
        fileId, 
        user?.id, 
        fileMeta,
        (progress, stage) => {
          // Map progress to cumulative scale:
          // Download: 0-60%
          // Decrypt: 60-90%
          // Verify: 90-100%
          let cumulativeProgress = 0
          
          if (stage === 'downloading') {
            cumulativeProgress = Math.round(progress * 0.6) // 0-60%
          } else if (stage === 'decrypting') {
            cumulativeProgress = 60 + Math.round(progress * 0.3) // 60-90%
          } else if (stage === 'verifying') {
            cumulativeProgress = 90 + Math.round(progress * 0.1) // 90-100%
          } else if (stage === 'complete') {
            cumulativeProgress = 100
          }
          
          setDownloadProgress(cumulativeProgress)
          setDownloadStage(stage)
          
          // Update notification based on stage
          if (stage === 'downloading' && cumulativeProgress % 15 === 0 && cumulativeProgress > 0) {
            showNotification && showNotification(`Downloading... ${cumulativeProgress}%`, 'info')
          } else if (stage === 'decrypting' && cumulativeProgress === 60) {
            showNotification && showNotification('Decrypting file...', 'info')
          } else if (stage === 'verifying' && cumulativeProgress === 90) {
            showNotification && showNotification('Verifying integrity...', 'info')
          }
        }
      )

      // Trigger download
      const url = window.URL.createObjectURL(decryptedBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileMeta?.originalFileName || 'file'
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up blob URL
      window.URL.revokeObjectURL(url)

      showNotification && showNotification(
        fileMeta.isEncrypted ? '🔓 File decrypted and downloaded' : 'Download complete', 
        'success'
      )
    }catch(err){
      const errorMsg = err?.message || 'Download failed'
      showNotification && showNotification(errorMsg, 'error')
      console.error('Download error:', err)
    } finally {
      setIsDownloading(false)
      setDownloadProgress(0)
      setDownloadStage('')
    }
  }

  return (
    <div className="h-full p-3 md:p-4 flex flex-col">
      <div className="border-b pb-3 mb-3">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 md:gap-0">
          <div className="flex items-center gap-3">
            {userObj ? (
              userObj.profilePhoto ? (
                <img
                  src={getPhotoUrl(userObj.profilePhoto)}
                  alt={userObj.username || userObj.name}
                  className="w-10 h-10 rounded-full object-cover border"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                  {getInitials(userObj.name || userObj.username)}
                </div>
              )
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-100" />
            )}
            <div>
              <div className="font-semibold text-lg md:text-base">{userObj ? `${userObj.name || userObj.username}` : 'Select a user'}</div>
              <div className="text-xs text-gray-500">Share files securely</div>
            </div>
          </div>
          <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono whitespace-nowrap">v4.2.0 🔐 E2EE</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-2 md:space-y-4 mb-3 px-1 md:px-2">
        {loading && <div className="text-sm text-gray-500">Loading files...</div>}
        
        {!loading && files.length > 0 && (
          <div className="space-y-2">
            {files.map(f => (
              <FileCard 
                key={f._id} 
                file={f} 
                isSent={f.sender._id === user?.id}
                currentUserId={user?.id}
                isDownloading={isDownloading}
                downloadProgress={downloadProgress}
                downloadStage={downloadStage}
                onDownload={() => onDownload(f._id, f)} 
                onDelete={async (id) => {
                  if (!window.confirm('Delete this file? This cannot be undone.')) return
                  try{
                    await api.delete(`/files/${id}`)
                    setFiles(prev => prev.filter(x => x._id !== id))
                    showNotification && showNotification('File deleted', 'success')
                  }catch(err){
                    showNotification && showNotification(err?.response?.data?.message || 'Delete failed', 'error')
                  }
                }} 
              />
            ))}
          </div>
        )}
        
        {files.length === 0 && !loading && <div className="text-sm text-gray-500">No files exchanged yet.</div>}
      </div>

      <div className="mt-2 border-t pt-2 sticky bottom-0 bg-white z-10 shadow-md">
        <form className="flex flex-col md:flex-row md:items-center gap-2 py-2" onSubmit={submit}>
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded cursor-pointer hover:bg-gray-50 md:flex-shrink-0">
            <input type="file" className="hidden" onChange={e=>setFileInput(e.target.files[0])} disabled={isUploading || isEncrypting} />
            <span className="text-sm md:text-base">📎 Attach</span>
          </label>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center gap-2">
              <div className="text-xs md:text-sm flex-1 truncate">{fileInput ? fileInput.name : 'No file selected'}</div>
              {uploadProgress > 0 && <div className="text-xs md:text-sm font-medium text-blue-600 flex-shrink-0">{uploadProgress}%</div>}
            </div>
            {uploadProgress > 0 && (
              <div className="w-full bg-gray-200 h-2.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  style={{width: `${uploadProgress}%`}} 
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    uploadProgress === 100 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                />
              </div>
            )}
            {uploadProgress > 0 && (
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>⚡ {uploadSpeed > 0 ? `${(uploadSpeed / (1024 * 1024)).toFixed(1)} MB/s` : 'Starting...'}</span>
                <span>⏱ {elapsedTime}s</span>
              </div>
            )}
            {uploadProgress === 100 && isUploading && (
              <div className="text-xs text-gray-500 mt-1">Finalizing upload...</div>
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              className={`px-3 md:px-4 py-2 rounded font-medium transition-colors flex-1 md:flex-initial text-sm md:text-base ${
                isUploading || isEncrypting
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              type="submit" 
              disabled={isUploading || isEncrypting}
            >
              {isEncrypting ? '🔐 Encrypting...' : isUploading ? `📤 ${uploadProgress}%` : '🔒 Send'}
            </button>
            {isUploading && currentUploadId && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 md:px-4 py-2 rounded font-medium text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        {msg && (
          <div className={`mt-2 text-sm px-2 py-1 rounded ${
            msg.includes('failed') || msg.includes('error') 
              ? 'text-red-600 bg-red-50' 
              : 'text-green-600 bg-green-50'
          }`}>
            {msg}
          </div>
        )}
      </div>
    </div>
  )
}  