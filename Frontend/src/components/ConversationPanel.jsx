import React, { useEffect, useState, useRef } from 'react'
import api from '../api/axios'
import FileCard from './FileCard'
import { useChunkedUpload } from '../hooks/useChunkedUpload'

export default function ConversationPanel({ userId, userObj, showNotification }){
  const [files, setFiles] = useState([])
  const [fileInput, setFileInput] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const mounted = useRef(true)
  const { uploadFile } = useChunkedUpload()

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
    setMsg('')
    
    try{
      // Pass progress callback to update progress bar in real-time
      const result = await uploadFile(fileInput, userId, (progress) => {
        setUploadProgress(progress)
      })
      
      setMsg('File sent successfully!')
      showNotification && showNotification('File sent', 'success')
      setFileInput(null)
      
      // Refresh file list
      const r = await api.get(`/files/with/${userId}`)
      setFiles(r.data)
      
      // Reset progress bar after a short delay
      setTimeout(() => {
        setUploadProgress(0)
        setMsg('')
      }, 2000)
    }catch(err){
      const errorMsg = err?.response?.data?.message || err?.message || 'Upload failed'
      setMsg(errorMsg)
      showNotification && showNotification(errorMsg, 'error')
    }finally{
      setIsUploading(false)
    }
  }

  const onDownload = async (fileId, fileMeta) => {
    try{
      showNotification && showNotification('Starting download...', 'info')

      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated')
      }

      const downloadUrl = `${api.defaults.baseURL}/files/download/${fileId}?token=${encodeURIComponent(token)}`

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileMeta?.originalFileName || 'file'
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showNotification && showNotification('Download started', 'success')
    }catch(err){
      const errorMsg = err?.message || 'Download failed'
      showNotification && showNotification(errorMsg, 'error')
      console.error('Download error:', err)
    }
  }

  return (
    <div className="h-full p-3 flex flex-col">
      <div className="border-b pb-2 mb-2">
        <div className="font-semibold">{userObj ? `${userObj.name || userObj.username}` : 'Select a user'}</div>
        <div className="text-xs text-gray-500">Share files securely</div>
      </div>

      <div className="flex-1 overflow-auto space-y-3 mb-3">
        {loading && <div className="text-sm text-gray-500">Loading files...</div>}
        {files.map(f => (
          <FileCard key={f._id} file={f} onDownload={() => onDownload(f._id, f)} onDelete={async (id) => {
            if (!window.confirm('Delete this file? This cannot be undone.')) return
            try{
              await api.delete(`/files/${id}`)
              setFiles(prev => prev.filter(x => x._id !== id))
              showNotification && showNotification('File deleted', 'success')
            }catch(err){
              showNotification && showNotification(err?.response?.data?.message || 'Delete failed', 'error')
            }
          }} />
        ))}
        {files.length === 0 && !loading && <div className="text-sm text-gray-500">No files exchanged yet.</div>}
      </div>

      <div className="mt-2 border-t pt-2 sticky bottom-0 bg-white z-10 shadow-md">
        <form className="flex items-center gap-2 py-2" onSubmit={submit}>
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded cursor-pointer hover:bg-gray-50">
            <input type="file" className="hidden" onChange={e=>setFileInput(e.target.files[0])} disabled={isUploading} />
            <span>📎 Attach</span>
          </label>
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <div className="text-sm flex-1">{fileInput ? fileInput.name : 'No file selected'}</div>
              {uploadProgress > 0 && <div className="text-sm font-medium text-sky-600 ml-2">{uploadProgress}%</div>}
            </div>
            {uploadProgress > 0 && (
              <div className="w-full bg-gray-200 h-2.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  style={{width: `${uploadProgress}%`}} 
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    uploadProgress === 100 ? 'bg-green-500' : 'bg-sky-500'
                  }`}
                />
              </div>
            )}
            {uploadProgress === 100 && isUploading && (
              <div className="text-xs text-gray-500 mt-1">Finalizing upload...</div>
            )}
          </div>
          <button 
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isUploading 
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                : 'bg-sky-500 text-white hover:bg-sky-600'
            }`}
            type="submit" 
            disabled={isUploading}
          >
            {isUploading ? `Uploading... ${uploadProgress}%` : 'Send'}
          </button>
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
