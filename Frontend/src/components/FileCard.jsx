import React from 'react'
import { Menu } from '@headlessui/react'
import { EllipsisVerticalIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

function FileIcon({ mime }){
  // very simple mapping, extend as needed
  if(!mime) return <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">?</div>
  if(mime.startsWith('image/')) return <div className="w-10 h-10 bg-gradient-to-br from-pink-300 to-yellow-300 rounded flex items-center justify-center">🖼️</div>
  if(mime.startsWith('video/')) return <div className="w-10 h-10 bg-gradient-to-br from-indigo-300 to-purple-300 rounded flex items-center justify-center">🎞️</div>
  if(mime.includes('pdf')) return <div className="w-10 h-10 bg-red-200 rounded flex items-center justify-center">📄</div>
  return <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">📎</div>
}

export default function FileCard({ file, onDownload, onDelete, downloading }){
  const name = file.originalFileName || file.originalName || 'file'
  const sizeKB = file.fileSize ? `${Math.round(file.fileSize/1024)} KB` : ''
  const time = file.createdAt ? new Date(file.createdAt).toLocaleString() : ''
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg shadow-sm">
      <FileIcon mime={file.mimeType} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-800">{name}</div>
            <div className="text-sm text-gray-500">{sizeKB} {time && <span className="ml-2 text-xs text-gray-400">• {time}</span>}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onDownload(file._id)} className="inline-flex items-center gap-2 px-2 py-1 bg-white border rounded text-sm hover:bg-gray-100">
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Download</span>
            </button>
            <Menu as="div" className="relative">
              <Menu.Button className="p-1 rounded hover:bg-gray-100"><EllipsisVerticalIcon className="w-5 h-5" /></Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg p-2">
                <Menu.Item>
                  {({active}) => <button onClick={() => onDelete && onDelete(file._id)} className={`w-full text-left p-2 rounded ${active ? 'bg-gray-100' : ''}`}>Delete</button>}
                </Menu.Item>
              </Menu.Items>
            </Menu>
          </div>
        </div>
        {file.progress != null && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
              <div style={{width: `${file.progress}%`}} className="h-2 bg-sky-500" />
            </div>
            <div className="text-sm text-gray-500 mt-1">{file.progress}%</div>
          </div>
        )}
        {file.isDownloaded && <div className="text-xs text-green-600 mt-2">Delivered</div>}
      </div>
    </div>
  )
}  
