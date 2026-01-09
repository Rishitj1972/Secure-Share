import React from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import UserFiles from './pages/UserFiles'

function PrivateRoute({ children }){
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

export default function App(){
  const { user, logout } = useAuth()
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
      </Routes>
    </div>
  )
}
