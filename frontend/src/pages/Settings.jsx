import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { toast } from 'sonner'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx'
import Button from '../components/ui/button.jsx'
import Input from '../components/ui/input.jsx'
import Label from '../components/ui/label.jsx'
import Spinner from '../components/ui/spinner.jsx'
import { User, Lock, Info, Zap } from 'lucide-react'

export default function Settings() {
  const { user, updateUser, logout } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')

  const profileMutation = useMutation({
    mutationFn: (body) => api.auth.updateProfile(body),
    onSuccess: (data) => { updateUser(data.user); toast.success('Profile updated') },
    onError: (err) => toast.error(err.message)
  })

  const passwordMutation = useMutation({
    mutationFn: (body) => api.auth.changePassword(body),
    onSuccess: () => { toast.success('Password changed'); setCurrentPw(''); setNewPw('') },
    onError: (err) => toast.error(err.message)
  })

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h2 className="font-display text-2xl font-bold text-slate-900">Settings</h2>

      {/* Profile */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <div className="flex gap-3">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
                <Button onClick={() => profileMutation.mutate({ name })} disabled={profileMutation.isPending || !name.trim()}>
                  {profileMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled className="bg-surface-50" />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Change Password</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div><Label>Current Password</Label><Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" /></div>
            <div><Label>New Password</Label><Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min. 8 characters" /></div>
            <Button onClick={() => passwordMutation.mutate({ currentPassword: currentPw, newPassword: newPw })} disabled={passwordMutation.isPending || !currentPw || newPw.length < 8}>
              {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Info className="w-5 h-5" /> About</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex justify-between"><span>Version</span><span className="font-medium">1.0.0</span></div>
            <div className="flex justify-between"><span>AI Provider</span><span className="font-medium">Offline mode (extractive fallback)</span></div>
            <div className="flex justify-between"><span>Embedding Provider</span><span className="font-medium">Keyword retrieval (offline)</span></div>
            <p className="text-xs text-slate-400 pt-2">StudyForge AI — Built for the Inter-College Hackathon</p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-accent-rose/30">
        <CardHeader><CardTitle className="text-accent-rose">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-3">Sign out of your account on this device.</p>
          <Button variant="danger" size="sm" onClick={logout}>Sign out</Button>
        </CardContent>
      </Card>
    </div>
  )
}
