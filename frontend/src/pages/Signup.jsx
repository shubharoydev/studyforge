import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import Button from '../components/ui/button.jsx'
import Input from '../components/ui/input.jsx'
import Label from '../components/ui/label.jsx'

export default function Signup() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(name, email, password)
      toast.success('Account created!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-surface-50 via-white to-primary-50/30">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-violet flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="font-display font-bold text-xl text-slate-900">StudyForge</span>
      </Link>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
          <p className="text-sm text-slate-500">Start learning with AI that cites its sources</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Full Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div><Label>Password</Label><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" /></div>
          <Button type="submit" disabled={loading} className="w-full" size="lg">{loading ? 'Creating account...' : 'Create account'}</Button>
        </form>
        <p className="text-sm text-slate-500 text-center mt-6">
          Already have an account? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
