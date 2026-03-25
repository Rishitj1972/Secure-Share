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
    <div className="app-shell fade-up">
      <div className="h-full flex flex-col rounded-3xl glass-panel overflow-hidden">
      <nav className="px-4 md:px-6 py-3 md:py-4 border-b border-[#cde0d7] bg-white/70 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Link to="/" className="text-lg md:text-2xl font-bold text-[#0a7e6e] hover:text-[#07695d] truncate">Secure Share</Link>
          {user && <span className="hidden sm:inline-block soft-pill">Encrypted workspace</span>}
        </div>
        
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg border border-[#cde0d7] hover:bg-[#edf7f3]"
        >
          <svg className="w-6 h-6 text-[#315e56]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/profile" className="px-3 py-2 text-sm font-medium text-[#315e56] rounded-xl hover:bg-[#edf7f3] transition">Profile</Link>
              <button className="ui-btn ui-btn-danger text-sm" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-sm font-medium text-[#315e56] rounded-xl hover:bg-[#edf7f3] transition">Login</Link>
              <Link to="/register" className="ui-btn ui-btn-primary text-sm">Register</Link>
            </>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 border-b border-[#cde0d7] px-4 py-3 space-y-2">
          {user ? (
            <>
              <Link to="/profile" className="block px-3 py-2 rounded-xl text-[#315e56] hover:bg-[#edf7f3]" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
              <button className="w-full ui-btn ui-btn-danger" onClick={() => { logout(); setMobileMenuOpen(false); }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block px-3 py-2 rounded-xl text-[#315e56] hover:bg-[#edf7f3]" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/register" className="block px-3 py-2 ui-btn ui-btn-primary text-center" onClick={() => setMobileMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 p-1 md:p-4 overflow-hidden">
        <Routes>
          <Route path="/" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/users/:id" element={<PrivateRoute><UserFiles /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      </div>
    </div>
  )
}

