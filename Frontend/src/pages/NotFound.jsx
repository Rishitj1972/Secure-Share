import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFound(){
  const { user } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] gap-6 bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-2xl text-gray-600 mb-4">Page Not Found</p>
        <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
      </div>
      
      <div className="flex gap-4">
        <Link to={user ? "/" : "/login"} className="btn">
          {user ? "← Back to Chat" : "← Back to Login"}
        </Link>
        {!user && (
          <Link to="/register" className="btn btn-secondary">
            Register →
          </Link>
        )}
      </div>
    </div>
  )
}
