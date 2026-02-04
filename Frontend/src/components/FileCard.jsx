import React from 'react'
import { Menu } from '@headlessui/react'
import { EllipsisVerticalIcon, ArrowDownTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

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

export default function FileCard({ file, onDownload, onDelete, isSent, currentUserId, isDownloading, downloadProgress, downloadStage }){
  const name = file.originalFileName || file.originalName || 'file'
  const sizeFormatted = formatFileSize(file.fileSize)
  const time = file.createdAt ? new Date(file.createdAt).toLocaleString() : ''
  
  // Check if this specific file is being downloaded
  const isThisFileDownloading = isDownloading && !isSent
  
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl shadow-sm border transition-all hover:shadow-md ${
      isSent 
        ? 'bg-green-50 border-green-200 ml-8' 
        : 'bg-blue-50 border-blue-200 mr-8'
    }`}>
      {/* File Icon or Download Progress */}
      <div className="relative flex-shrink-0">
        {isThisFileDownloading ? (
          <div className="flex flex-col items-center gap-1">
            <CircularProgress progress={downloadProgress} size={48} strokeWidth={4} />
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
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">{name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-600">{sizeFormatted}</span>
              {time && <span className="text-xs text-gray-400">• {new Date(file.createdAt).toLocaleDateString()}</span>}
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isSent && (
              isThisFileDownloading ? (
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
                <button 
                  onClick={() => onDownload(file._id)} 
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Download</span>
                </button>
              )
            )}
            
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
          </div>
        </div>
      </div>
    </div>
  )
}  
