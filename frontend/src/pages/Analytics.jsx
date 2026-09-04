import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import { percent, timeAgo, scoreBadgeColor } from '../lib/format.js'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx'
import Badge from '../components/ui/badge.jsx'
import Spinner from '../components/ui/spinner.jsx'
import { BarChart3, TrendingUp, TrendingDown, Minus, BookOpen, FileText, AlertTriangle, Star } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: api.analytics })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!data) return <div className="text-center py-20 text-slate-500">No analytics data available yet. Take some quizzes first!</div>

  const { overview, topicStats, weakTopics, strongTopics, needsPractice, recentActivity } = data

  const trendIcon = overview.improvementTrend === 'improving' ? TrendingUp : overview.improvementTrend === 'declining' ? TrendingDown : Minus
  const TrendIcon = trendIcon
  const trendColor = overview.improvementTrend === 'improving' ? 'text-accent-emerald' : overview.improvementTrend === 'declining' ? 'text-accent-rose' : 'text-slate-400'

  const chartData = topicStats.map((t) => ({ name: t.name.length > 15 ? t.name.slice(0, 15) + '…' : t.name, accuracy: t.accuracy, fill: t.accuracy >= 80 ? '#059669' : t.accuracy >= 60 ? '#d97706' : '#e11d48' }))

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-display text-2xl font-bold text-slate-900">Learning Analytics</h2>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Overall Accuracy', value: percent(overview.overallAccuracy), color: overview.overallAccuracy >= 70 ? 'text-accent-emerald' : 'text-accent-amber' },
          { label: 'Quizzes Taken', value: overview.quizCount, color: 'text-primary-600' },
          { label: 'Total Attempts', value: overview.totalAttempts, color: 'text-violet-600' },
          { label: 'Trend', value: overview.improvementTrend === 'insufficient' ? 'N/A' : overview.improvementTrend, color: trendColor, icon: TrendIcon }
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="p-4 text-center">
            {Icon && <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />}
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Topic Accuracy Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Topic Accuracy</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
                  <Bar dataKey="accuracy" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Strong Topics */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-accent-emerald" /> Strong Topics</CardTitle></CardHeader>
          <CardContent>
            {strongTopics.length === 0 ? <p className="text-sm text-slate-500 py-4">No strong topics yet.</p> : (
              <div className="space-y-2">
                {strongTopics.map((t) => (
                  <div key={t.name} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-sm font-medium text-slate-900">{t.name}</span>
                    <Badge variant="success">{percent(t.accuracy)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weak Topics */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-accent-rose" /> Weak Topics</CardTitle></CardHeader>
          <CardContent>
            {weakTopics.length === 0 ? <p className="text-sm text-slate-500 py-4">No weak topics identified.</p> : (
              <div className="space-y-2">
                {weakTopics.map((t) => (
                  <div key={t.name} className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-100">
                    <span className="text-sm font-medium text-slate-900">{t.name}</span>
                    <Badge variant="danger">{percent(t.accuracy)} ({t.total} questions)</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-surface-200">
                  {a.type === 'document' ? <FileText className="w-5 h-5 text-blue-500" /> : <BookOpen className="w-5 h-5 text-primary-500" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{a.name}</p>
                    <p className="text-xs text-slate-400">{a.type === 'document' ? 'Uploaded' : 'Quiz created'} · {timeAgo(a.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
