import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import FileCard from '../components/FileCard'
import { useAuth } from '../context/AuthContext'

export default function UserFiles(){
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [files, setFiles] = useState([])
  const [fileInput, setFileInput] = useState(null)
  const [msg, setMsg] = useState('')
  const [downloading, setDownloading] = useState(null)
  const [otherUser, setOtherUser] = useState(null)

  // Memoize load function so it can be safely used in dependency arrays
  const load = useCallback(async () => {
    try{
      const [filesRes, usersRes] = await Promise.all([
        api.get(`/files/with/${id}`),
        api.get('/users')
      ])
      setFiles(filesRes.data)
      const other = usersRes.data.find(u => u._id === id)
      setOtherUser(other)
    }catch(err){
      if (err?.response?.status === 401){
        logout()
        navigate('/login')
      }
    }
  }, [id, logout, navigate])

  // Load files when component mounts or id changes
  useEffect(()=>{
    load()
  },[id, load])

  // Removed all real-time and polling reloads per request




  // Removed all real-time and polling reloads per request

  const submit = async (e) => {
    e.preventDefault()
    if(!fileInput) return setMsg('Please select a file')
    const fd = new FormData()
    fd.append('file', fileInput)
    fd.append('receiver', id)
    try{
      await api.post('/files/send', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMsg('File sent')
      setFileInput(null)
      // refresh list
      await load()
    }catch(err){
      setMsg(err?.response?.data?.message || 'Upload failed')
      if (err?.response?.status === 401){
        logout()
        navigate('/login')
      }
    }
  }

  const onDownload = async (fileId, fileMeta) => {
    setDownloading(fileId)
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
    }catch(err){
      setMsg(err?.response?.data?.message || 'Download failed')
      if (err?.response?.status === 401){
        logout()
        navigate('/login')
      }
    }finally{
      setDownloading(null)
    }
  }

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      <div className="section-card p-4 md:p-5">
        <h2 className="text-xl font-semibold text-[#123a33]">{otherUser ? `${otherUser.name} (${otherUser.email})` : 'User files'}</h2>
        <p className="text-sm text-[#5b7a72] mt-1">Encrypted conversation file history</p>
      </div>

      <div className="section-card p-4">
        <form className="flex flex-col md:flex-row gap-3 md:items-center" onSubmit={submit}>
          <input className="ui-input" type="file" onChange={e=>setFileInput(e.target.files[0])} />
          <button className="ui-btn ui-btn-primary md:w-auto" type="submit">Send to {otherUser ? otherUser.name : 'user'}</button>
        </form>
        {msg && <div className="mt-2 text-sm text-[#315e56]">{msg}</div>}
      </div>

      <div className="space-y-3 overflow-auto pr-1 custom-scrollbar">
        {files.map(f => (
          <FileCard
            key={f._id}
            file={f}
            onDownload={() => onDownload(f._id, f)}
            onDelete={async (id) => {
              if(!window.confirm('Delete this file? This cannot be undone.')) return
              try{
                await api.delete(`/files/${id}`)
                setFiles(prev => prev.filter(x => x._id !== id))
                setMsg('File deleted')
              }catch(err){
                setMsg(err?.response?.data?.message || 'Delete failed')
              }
            }}
            downloading={downloading === f._id}
          />
        ))}
        {files.length === 0 && <div className="section-card p-6 text-center text-[#5b7a72]">No files exchanged yet.</div>}
      </div>
    </div>
  )
}
