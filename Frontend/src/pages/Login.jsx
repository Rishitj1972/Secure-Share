import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    try{
      await login(email, password)
      nav('/')
    }catch(err){
      console.error('Login error', err)
      setError(err?.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div>
      <h2>Login</h2>
      <form className="form" onSubmit={submit}>
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn" type="submit">Login</button>
        {error && <div style={{color:'red'}}>{error}</div>}
      </form>
    </div>
  )
}
