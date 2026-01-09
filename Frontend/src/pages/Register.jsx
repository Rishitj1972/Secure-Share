import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register(){
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { register } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    try{
      await register({ username: name, email, password })
      nav('/login')
    }catch(err){
      setError(err?.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div>
      <h2>Register</h2>
      <form className="form" onSubmit={submit}>
        <input className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn" type="submit">Register</button>
        {error && <div style={{color:'red'}}>{error}</div>}
      </form>
    </div>
  )
}
