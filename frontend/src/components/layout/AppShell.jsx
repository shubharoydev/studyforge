import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { cn, initials } from '../../lib/utils.js'
import { LayoutDashboard, FileText, MessageSquare, BookOpen, BarChart3, Settings, LogOut, Menu, X, Sparkles } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/chat', label: 'AI Tutor', icon: MessageSquare },
  { to: '/quizzes', label: 'Quizzes', icon: BookOpen },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export default function AppShell() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const currentNav = NAV.find((n) => location.pathname.startsWith(n.to)) || NAV[0]

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-surface-200 fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-surface-200">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-accent-violet flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-slate-900">StudyForge</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-surface-50 hover:text-slate-900'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary-50 to-violet-50 border border-primary-100">
            <p className="text-xs text-primary-700 font-medium mb-0.5">AI Provider</p>
            <p className="text-xs text-primary-600/80">Offline mode active</p>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Mobile Sidebar */}
      <aside className={cn('fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-surface-200 transform transition-transform duration-200 lg:hidden', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-surface-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-accent-violet flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg">StudyForge</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
        </div>
        <nav className="px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-surface-50'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-surface-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-surface-100 lg:hidden"><Menu className="w-5 h-5" /></button>
            <h1 className="text-lg font-semibold text-slate-900 font-display">{currentNav.label}</h1>
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-50 transition">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">{initials(user?.name)}</div>
                <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" sideOffset={8} className="w-48 bg-white rounded-xl border border-surface-200 shadow-lg p-1 z-50">
              <DropdownMenu.Item asChild>
                <NavLink to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-surface-50 cursor-pointer">
                  <Settings className="w-4 h-4" /> Settings
                </NavLink>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-surface-200 my-1" />
              <DropdownMenu.Item onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-rose-50 text-accent-rose cursor-pointer">
                <LogOut className="w-4 h-4" /> Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
