import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import { toast } from 'sonner'
import { formatDate, percent, scoreBadgeColor } from '../lib/format.js'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx'
import Badge from '../components/ui/badge.jsx'
import Button from '../components/ui/button.jsx'
import Spinner from '../components/ui/spinner.jsx'
import EmptyState from '../components/ui/empty-state.jsx'
import { BookOpen, Plus, Trophy, Clock, BarChart3, Loader2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

export default function Quizzes() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [genCount, setGenCount] = useState(5)
  const [genDifficulty, setGenDifficulty] = useState('MEDIUM')
  const [genDocId, setGenDocId] = useState('')

  const { data: quizzesData, isLoading } = useQuery({ queryKey: ['quizzes'], queryFn: api.quizzes.list })
  const { data: docsData } = useQuery({ queryKey: ['documents'], queryFn: () => api.documents.list() })

  const generateMutation = useMutation({
    mutationFn: (body) => api.quizzes.generate(body),
    onSuccess: (data) => {
      if (!data || !data.quiz || !data.quiz.id) {
        toast.error('Invalid response from server')
        console.error('Invalid quiz data:', data)
        return
      }
      toast.success('Quiz generated!')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      window.location.href = `/quiz/${data.quiz.id}`
    },
    onError: (err) => toast.error(err.message || 'Quiz generation failed')
  })

  const quizzes = quizzesData?.quizzes ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Quizzes</h2>
          <p className="text-sm text-slate-500 mt-1">Test your knowledge with AI-generated quizzes</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> Generate Quiz</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : quizzes.length === 0 ? (
        <EmptyState icon="quizzes" title="No quizzes yet" description="Generate your first quiz from a document or topic." action={
          <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="w-4 h-4" /> Generate Quiz</Button>
        } />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((q) => (
            <Link key={q.id} to={`/quiz/${q.id}`}>
              <Card hover className="p-5 h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={q.difficulty === 'EASY' ? 'success' : q.difficulty === 'HARD' ? 'danger' : 'warning'}>
                    {q.difficulty}
                  </Badge>
                  {q.bestScore !== null && q.bestScore !== undefined && (
                    <span className={`text-sm font-bold ${scoreBadgeColor(q.bestScore).split(' ')[1]}`}>
                      Best: {percent(q.bestScore)}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 truncate">{q.title}</h3>
                <div className="flex items-center gap-3 mt-auto pt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {q.questionCount} questions</span>
                  <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> {q.attemptCount} attempts</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDate(q.createdAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 w-full max-w-md shadow-xl z-50">
            <Dialog.Title className="font-display text-lg font-bold text-slate-900 mb-4">Generate a Quiz</Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Source Document (optional)</label>
                <select value={genDocId} onChange={(e) => setGenDocId(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  <option value="">All documents</option>
                  {(docsData?.documents ?? []).filter((d) => d.status === 'READY').map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Number of Questions</label>
                <div className="flex gap-2">
                  {[5, 10, 20].map((n) => (
                    <button key={n} onClick={() => setGenCount(n)} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${genCount === n ? 'bg-primary-600 text-white border-primary-600' : 'border-surface-300 text-slate-700 hover:border-primary-300'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Difficulty</label>
                <div className="flex gap-2">
                  {['EASY', 'MEDIUM', 'HARD'].map((d) => (
                    <button key={d} onClick={() => setGenDifficulty(d)} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${genDifficulty === d ? 'bg-primary-600 text-white border-primary-600' : 'border-surface-300 text-slate-700 hover:border-primary-300'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Dialog.Close asChild><Button variant="secondary" className="flex-1">Cancel</Button></Dialog.Close>
              <Button onClick={() => {
                const payload = { count: genCount, difficulty: genDifficulty }
                if (genDocId) payload.documentId = genDocId
                generateMutation.mutate(payload)
              }} disabled={generateMutation.isPending} className="flex-1">
                {generateMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : 'Generate'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
