import React, { useEffect, useState, useRef } from 'react'
import api from '../api/axios'
import FileCard from './FileCard'

export default function ConversationPanel({ userId, userObj, showNotification }){
  const [files, setFiles] = useState([])
  const [fileInput, setFileInput] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const mounted = useRef(true)

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
        console.error(err)
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
    const fd = new FormData()
    fd.append('file', fileInput)
    fd.append('receiver', userId)
    setUploadProgress(0)
    try{
      const res = await api.post('/files/send', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
          setUploadProgress(percent)
        }
      })
      setMsg('File sent')
      showNotification && showNotification('File sent', 'success')
      setFileInput(null)
      setUploadProgress(0)
      // refresh conversation
      const r = await api.get(`/files/with/${userId}`)
      setFiles(r.data)
    }catch(err){
      console.error(err)
      const errorMsg = err?.response?.data?.message || 'Upload failed'
      setMsg(errorMsg)
      showNotification && showNotification(errorMsg, 'error')
    }
  }

  const onDownload = async (fileId, fileMeta) => {
    try{
      const res = await api.get(`/files/download/${fileId}`, { responseType: 'arraybuffer' })
      const blob = new Blob([res.data], { type: fileMeta?.mimeType || 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileMeta?.originalFileName || 'file'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      showNotification && showNotification('Download started', 'success')
    }catch(err){
      console.error(err)
      const errorMsg = err?.response?.data?.message || 'Download failed'
      showNotification && showNotification(errorMsg, 'error')
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
              console.error(err)
              showNotification && showNotification(err?.response?.data?.message || 'Delete failed', 'error')
            }
          }} />
        ))}
        {files.length === 0 && !loading && <div className="text-sm text-gray-500">No files exchanged yet.</div>}
      </div>

      <div className="mt-2 border-t pt-2 sticky bottom-0 bg-white z-10 shadow-md">
        <form className="flex items-center gap-2 py-2" onSubmit={submit}>
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded cursor-pointer">
            <input type="file" className="hidden" onChange={e=>setFileInput(e.target.files[0])} />
            <span>📎 Attach</span>
          </label>
          <div className="flex-1">
            <div className="text-sm">{fileInput ? fileInput.name : 'No file selected'}</div>
            {uploadProgress > 0 && (
              <div className="w-full bg-gray-200 h-2 rounded mt-1">
                <div style={{width: `${uploadProgress}%`}} className="h-2 bg-sky-500" />
              </div>
            )}
          </div>
          <button className="btn" type="submit">Send</button>
        </form>
        {msg && <div className="mt-2 text-sm text-gray-600">{msg}</div>}
      </div>
    </div>
  )
}  
