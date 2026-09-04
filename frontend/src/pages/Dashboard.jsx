import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { formatDate, timeAgo, percent } from '../lib/format.js'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx'
import Badge from '../components/ui/badge.jsx'
import Button from '../components/ui/button.jsx'
import Spinner from '../components/ui/spinner.jsx'
import EmptyState from '../components/ui/empty-state.jsx'
import { Upload, MessageSquare, BookOpen, BarChart3, TrendingUp, TrendingDown, Minus, AlertTriangle, FileText, ArrowRight } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({ queryKey: ['analytics'], queryFn: api.analytics })
  const { data: recsData } = useQuery({ queryKey: ['recommendations'], queryFn: api.recommendations })
  const { data: docsData } = useQuery({ queryKey: ['documents'], queryFn: () => api.documents.list({ limit: 5 }) })

  const analytics = analyticsData?.overview ?? {}
  const weakTopics = analyticsData?.weakTopics ?? []
  const recommendations = recsData?.recommendations ?? []
  const recentDocs = docsData?.documents ?? []

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900">{greeting()}, {user?.name?.split(' ')[0]}</h2>
        <p className="text-slate-500 text-sm mt-1">Here's your learning overview</p>
      </div>

      {/* Stat Cards */}
      {analyticsLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Documents', value: analytics.documentCount ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Questions Asked', value: analytics.conversationCount ?? 0, icon: MessageSquare, color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: 'Quizzes Taken', value: analytics.quizCount ?? 0, icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Avg. Score', value: percent(analytics.overallAccuracy ?? 0), icon: BarChart3, color: 'text-accent-emerald', bg: 'bg-emerald-50' }
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} hover className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">{label}</p>
                  <p className="text-xl font-bold text-slate-900">{value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to: '/documents', label: 'Upload Document', desc: 'Add study material', icon: Upload, color: 'from-blue-500 to-cyan-400' },
            { to: '/chat', label: 'Ask AI Tutor', desc: 'Get answers grounded in your notes', icon: MessageSquare, color: 'from-primary-500 to-violet-500' },
            { to: '/quizzes', label: 'Generate Quiz', desc: 'Test your knowledge', icon: BookOpen, color: 'from-accent-violet to-purple-400' }
          ].map(({ to, label, desc, icon: Icon, color }) => (
            <Link key={to} to={to} className="card p-5 flex items-center gap-4 hover:shadow-card-hover transition-all group">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{label}</p>
                <p className="text-xs text-slate-500 truncate">{desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition" />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weak Topics */}
        <Card>
          <CardHeader><CardTitle>Weak Topics</CardTitle></CardHeader>
          <CardContent>
            {weakTopics.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No weak topics yet — take some quizzes to unlock insights.</p>
            ) : (
              <div className="space-y-2">
                {weakTopics.slice(0, 4).map((t) => (
                  <div key={t.name} className="flex items-center justify-between bg-rose-50 rounded-lg px-4 py-2.5 border border-rose-100">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-accent-rose" />
                      <span className="text-sm font-medium text-slate-900">{t.name}</span>
                    </div>
                    <Badge variant="danger">{percent(t.accuracy)} accuracy</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader><CardTitle>Recommended for You</CardTitle></CardHeader>
          <CardContent>
            {recommendations.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No recommendations yet — upload a document to get started.</p>
            ) : (
              <div className="space-y-2">
                {recommendations.slice(0, 4).map((r, i) => (
                  <Link key={i} to={r.actionUrl || '/dashboard'} className="flex items-start gap-3 p-3 rounded-lg border border-surface-200 hover:border-primary-200 hover:bg-primary-50/30 transition group">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TrendingUp className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 group-hover:text-primary-700">{r.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.reason}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Documents</CardTitle>
          <Link to="/documents" className="text-sm text-primary-600 hover:underline">View all</Link>
        </CardHeader>
        <CardContent>
          {recentDocs.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentDocs.map((d) => (
                <Link key={d.id} to={`/documents/${d.id}`} className="flex items-center justify-between p-3 rounded-lg border border-surface-200 hover:border-primary-200 hover:bg-surface-50 transition">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 truncate max-w-xs">{d.name}</p>
                      <p className="text-xs text-slate-400">{timeAgo(d.createdAt)}</p>
                    </div>
                  </div>
                  <Badge variant="success">Ready</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
