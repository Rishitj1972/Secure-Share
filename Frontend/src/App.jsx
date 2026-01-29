import React, { useEffect } from 'react'
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import UserFiles from './pages/UserFiles'
import NotFound from './pages/NotFound'

function PrivateRoute({ children }){
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

export default function App(){
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Redirect to login when user becomes null (logout triggered)
  useEffect(() => {
    if (!user && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])

  return (
    <div className="app">
      <nav className="nav flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">Secure-Share</Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <button className="btn" onClick={logout}>Logout</button>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/users/:id" element={<PrivateRoute><UserFiles /></PrivateRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

