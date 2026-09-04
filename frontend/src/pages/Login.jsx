import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { toast } from 'sonner'
import { Sparkles, Eye, EyeOff } from 'lucide-react'
import Button from '../components/ui/button.jsx'
import Input from '../components/ui/input.jsx'
import Label from '../components/ui/label.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Login failed')
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
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500">Sign in to continue learning</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div>
            <Label>Password</Label>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full" size="lg">{loading ? 'Signing in...' : 'Sign in'}</Button>
        </form>
        <p className="text-sm text-slate-500 text-center mt-6">
          Don't have an account? <Link to="/signup" className="text-primary-600 font-medium hover:underline">Sign up</Link>
        </p>
        <p className="text-xs text-slate-400 text-center mt-3">Demo: demo@studyforge.ai / demo1234</p>
      </div>
    </div>
  )
}
