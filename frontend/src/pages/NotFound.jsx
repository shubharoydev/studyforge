import { Link } from 'react-router-dom'
import Button from '../components/ui/button.jsx'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="text-6xl font-bold text-slate-200 mb-4">404</p>
      <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
      <p className="text-slate-500 mb-6">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/"><Button><Home className="w-4 h-4" /> Back to Home</Button></Link>
    </div>
  )
}
