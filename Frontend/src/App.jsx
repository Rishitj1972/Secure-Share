import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import UserFiles from './pages/UserFiles'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

function PrivateRoute({ children }){
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

export default function App(){
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Redirect to login when user becomes null (logout triggered)
  useEffect(() => {
    if (!user && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])

  return (
    <div className="app flex flex-col h-screen">
      <nav className="nav bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">🔐 Secure-Share</Link>
        </div>
        
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Link to="/profile" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">👤 Profile</Link>
              <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">Login</Link>
              <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Register</Link>
            </>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 space-y-2">
          {user ? (
            <>
              <Link to="/profile" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100" onClick={() => setMobileMenuOpen(false)}>👤 Profile</Link>
              <button className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600" onClick={() => { logout(); setMobileMenuOpen(false); }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/register" className="block px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onClick={() => setMobileMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}

      <Routes>
        <Route path="/" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/users/:id" element={<PrivateRoute><UserFiles /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

