import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFound(){
  const { user } = useAuth()

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-6">
      <div className="section-card max-w-xl w-full p-8 text-center">
        <h1 className="text-6xl font-bold text-[#113730] mb-2">404</h1>
        <p className="text-2xl text-[#315e56] mb-4">Page Not Found</p>
        <p className="text-[#5b7a72] mb-7">The page you're looking for doesn't exist or has moved.</p>
      </div>
      
      <div className="flex gap-3 justify-center mt-2">
        <Link to={user ? "/" : "/login"} className="ui-btn ui-btn-primary">
          {user ? "← Back to Chat" : "← Back to Login"}
        </Link>
        {!user && (
          <Link to="/register" className="ui-btn ui-btn-secondary">
            Register →
          </Link>
        )}
      </div>
    </div>
  )
}
