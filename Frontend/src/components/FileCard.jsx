import React from 'react'
import { Menu } from '@headlessui/react'
import { EllipsisVerticalIcon, ArrowDownTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

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

function FileIcon({ mime }){
  // very simple mapping, extend as needed
  if(!mime) return <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl">?</div>
  if(mime.startsWith('image/')) return <div className="w-12 h-12 bg-gradient-to-br from-pink-300 to-yellow-300 rounded-xl flex items-center justify-center text-xl">🖼️</div>
  if(mime.startsWith('video/')) return <div className="w-12 h-12 bg-gradient-to-br from-indigo-300 to-purple-300 rounded-xl flex items-center justify-center text-xl">🎞️</div>
  if(mime.includes('pdf')) return <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center text-xl">📄</div>
  if(mime.includes('zip') || mime.includes('rar')) return <div className="w-12 h-12 bg-yellow-200 rounded-xl flex items-center justify-center text-xl">📦</div>
  if(mime.includes('audio')) return <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center text-xl">🎵</div>
  return <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl">📎</div>
}

// Circular progress component (Telegram-style)
function CircularProgress({ progress, size = 48, strokeWidth = 3 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3B82F6"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-blue-600">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatShortTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export default function FileCard({ file, onDownload, onDelete, isSent, isGroupMode = false, currentUserId, canDelete = true, isDownloading, downloadingFileId, downloadProgress, downloadStage }){
  const name = file.originalFileName || file.originalName || 'file'
  const sizeFormatted = formatFileSize(file.fileSize)
  const time = file.createdAt ? formatShortTime(file.createdAt) : ''
  const sharedBy = file?.sender?.username || file?.sender?.email || 'Unknown'
  const sharedByIsMe = String(file?.sender?._id || '') === String(currentUserId || '')
  const sharedByLabel = sharedByIsMe ? 'You' : sharedBy
  
  // Check if this specific file is being downloaded
  const isThisFileDownloading = isDownloading && !isSent && downloadingFileId === file._id

  if (isGroupMode) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="min-w-0 flex items-center gap-2">
            {file?.sender?.profilePhoto ? (
              <img
                src={getPhotoUrl(file.sender.profilePhoto)}
                alt={sharedBy}
                className="w-6 h-6 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-600">
                {getInitials(sharedBy)}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-700 truncate">{sharedByLabel}</div>
            </div>
          </div>
          {time && <div className="text-[10px] text-slate-400 whitespace-nowrap">{time}</div>}
        </div>

        <div className="flex items-start gap-2">
          <div className="relative flex-shrink-0 scale-75 origin-top-left">
            {isThisFileDownloading ? (
              <CircularProgress progress={downloadProgress} size={44} strokeWidth={3} />
            ) : (
              <FileIcon mime={file.mimeType} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{name}</div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-xs text-slate-500">{sizeFormatted}</span>
              {file.isEncrypted && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">🔒 E2EE</span>
              )}
              {!isSent && file.isDownloaded && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Downloaded</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!isSent && !isThisFileDownloading && (
              <button
                onClick={onDownload}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            )}

            {canDelete && (
              <Menu as="div" className="relative">
                <Menu.Button className="p-1.5 rounded-md hover:bg-slate-100 transition-colors">
                  <EllipsisVerticalIcon className="w-4 h-4 text-slate-600" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-20">
                  <Menu.Item>
                    {({active}) => (
                      <button
                        onClick={() => onDelete && onDelete(file._id)}
                        className={`w-full text-left px-3 py-2 rounded text-sm ${
                          active ? 'bg-red-50 text-red-600' : 'text-gray-700'
                        }`}
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`flex flex-col md:flex-row items-start gap-3 p-3 md:p-4 rounded-xl shadow-sm border transition-all hover:shadow-md ${
      isSent 
        ? 'bg-green-50 border-green-200 md:ml-8' 
        : 'bg-blue-50 border-blue-200 md:mr-8'
    }`}>
      {/* File Icon or Download Progress */}
      <div className="relative flex-shrink-0 scale-90 md:scale-100 origin-top">
        {isThisFileDownloading ? (
          <div className="flex flex-col items-center gap-1">
            <CircularProgress progress={downloadProgress} size={56} strokeWidth={4} />
            <div className="text-[10px] text-blue-600 font-medium mt-1">
              {downloadStage === 'downloading' && '📥'}
              {downloadStage === 'decrypting' && '🔓'}
              {downloadStage === 'verifying' && '✓'}
              {downloadStage === 'complete' && '✅'}
            </div>
          </div>
        ) : (
          <FileIcon mime={file.mimeType} />
        )}
      </div>
      
      <div className="flex-1 min-w-0 w-full">
        <div className="flex flex-col md:flex-row items-start justify-between gap-3 md:gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">{name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-600">{sizeFormatted}</span>
              {time && <span className="text-xs text-gray-400">• {time}</span>}
              {file.isEncrypted && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">🔒 E2EE</span>}
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center gap-2 mt-2">
              {isSent && (
                <div className="flex items-center gap-1 text-xs text-green-700">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Sent</span>
                </div>
              )}
              {!isSent && file.isDownloaded && (
                <div className="text-xs text-blue-700 flex items-center gap-1">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Downloaded</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end md:justify-start">
            {!isSent && (
              !isThisFileDownloading && (
                <button 
                  onClick={onDownload} 
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors w-full md:w-auto justify-center"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Download</span>
                </button>
              )
            )}
            
            {canDelete && (
              <Menu as="div" className="relative">
                <Menu.Button className="p-2 rounded-lg hover:bg-white/50 transition-colors">
                  <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-20">
                  <Menu.Item>
                    {({active}) => (
                      <button 
                        onClick={() => onDelete && onDelete(file._id)} 
                        className={`w-full text-left px-3 py-2 rounded text-sm ${
                          active ? 'bg-red-50 text-red-600' : 'text-gray-700'
                        }`}
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}  
