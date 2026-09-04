import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import { toast } from 'sonner'
import { percent, scoreBadgeColor } from '../lib/format.js'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx'
import Badge from '../components/ui/badge.jsx'
import Button from '../components/ui/button.jsx'
import Spinner from '../components/ui/spinner.jsx'
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Trophy, RotateCcw, BarChart3 } from 'lucide-react'

export default function QuizTake() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(null)
  const [review, setReview] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => api.quizzes.get(id, review ? { review: 'true' } : {})
  })

  const attemptMutation = useMutation({
    mutationFn: (body) => api.quizzes.attempt(id, body),
    onSuccess: (data) => { setSubmitted(data); toast.success(`Quiz complete! Score: ${data.score}/${data.totalQuestions}`) },
    onError: (err) => toast.error(err.message || 'Failed to submit')
  })

  const quiz = data?.quiz
  const questions = quiz?.questions || []
  const q = questions[currentIdx]
  const isSubmitted = submitted !== null

  const handleSelect = (qId, idx) => {
    if (isSubmitted) return
    setAnswers((prev) => ({ ...prev, [qId]: idx }))
  }

  const handleSubmit = () => {
    const ans = Object.entries(answers).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex }))
    if (ans.length < questions.length) { toast.error('Please answer all questions before submitting'); return }
    attemptMutation.mutate({ answers: ans })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!quiz || questions.length === 0) return <div className="text-center py-20 text-slate-500">Quiz not found.</div>

  // Results View
  if (isSubmitted) {
    const score = submitted.score
    const total = submitted.totalQuestions
    const pct = submitted.percentage

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Link to="/quizzes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> All quizzes</Link>

        {/* Score Card */}
        <Card className="p-8 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center mb-4">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-display text-3xl font-bold text-slate-900 mb-1">{score} / {total}</h2>
          <p className={`text-2xl font-bold mb-4 ${pct >= 80 ? 'text-accent-emerald' : pct >= 60 ? 'text-accent-amber' : 'text-accent-rose'}`}>{percent(pct)}</p>
          <p className="text-sm text-slate-500 mb-6">
            {pct >= 80 ? 'Excellent work! You have a strong understanding of this material.' : pct >= 60 ? 'Good effort! There are some topics worth revising.' : 'Keep studying! Focus on the topics below and try again.'}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => { setSubmitted(null); setAnswers({}); setCurrentIdx(0); setReview(true) }}><RotateCcw className="w-4 h-4" /> Review Answers</Button>
            <Link to="/analytics"><Button><BarChart3 className="w-4 h-4" /> View Analytics</Button></Link>
          </div>
        </Card>

        {/* Topic Breakdown */}
        {submitted.questions && (() => {
          const topicMap = {}
          for (const q of submitted.questions) {
            if (!topicMap[q.topic]) topicMap[q.topic] = { correct: 0, total: 0 }
            topicMap[q.topic].total++
            if (q.isCorrect) topicMap[q.topic].correct++
          }
          return (
            <Card>
              <CardHeader><CardTitle>Topic Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(topicMap).map(([topic, { correct, total }]) => {
                    const topicPct = Math.round((correct / total) * 100)
                    return (
                      <div key={topic} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-900 w-40 truncate">{topic}</span>
                        <div className="flex-1 h-2.5 bg-surface-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${topicPct >= 80 ? 'bg-accent-emerald' : topicPct >= 60 ? 'bg-accent-amber' : 'bg-accent-rose'}`} style={{ width: `${topicPct}%` }} />
                        </div>
                        <span className={`text-sm font-semibold w-12 text-right ${topicPct >= 80 ? 'text-accent-emerald' : topicPct >= 60 ? 'text-accent-amber' : 'text-accent-rose'}`}>{percent(topicPct)}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })()}
      </div>
    )
  }

  // Quiz Runner View
  const answeredCount = Object.keys(answers).length

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link to="/quizzes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Back to quizzes</Link>

      {/* Progress */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-slate-900">{quiz.title}</h2>
        <Badge variant="primary">{currentIdx + 1} / {questions.length}</Badge>
      </div>
      <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Question Card */}
      {q && (
        <Card className="p-6">
          <div className="flex items-start gap-2 mb-4">
            <Badge variant={q.difficulty === 'EASY' ? 'success' : q.difficulty === 'HARD' ? 'danger' : 'warning'} className="mt-0.5">{q.difficulty}</Badge>
            <Badge variant="default">{q.topic}</Badge>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-5">{q.question}</h3>
          <div className="space-y-3">
            {(q.options || []).map((opt, i) => {
              const selected = answers[q.id] === i
              const isCorrect = isSubmitted && q.correctIndex === i
              const isWrong = isSubmitted && selected && !q.isCorrect
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(q.id, i)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm ${
                    isCorrect ? 'border-accent-emerald bg-emerald-50 text-accent-emerald' :
                    isWrong ? 'border-accent-rose bg-rose-50 text-accent-rose' :
                    selected ? 'border-primary-500 bg-primary-50 text-primary-700' :
                    'border-surface-200 hover:border-primary-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {isCorrect ? <CheckCircle className="w-4 h-4" /> : isWrong ? <XCircle className="w-4 h-4" /> : String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {isSubmitted && q.explanation && (
            <div className="mt-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
              <p className="text-sm font-medium text-slate-900 mb-1">Explanation</p>
              <p className="text-sm text-slate-600">{q.explanation}</p>
              {q.sourcePage && <p className="text-xs text-slate-400 mt-2">Source: Page {q.sourcePage}</p>}
            </div>
          )}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}>
          <ArrowLeft className="w-4 h-4" /> Previous
        </Button>
        {currentIdx < questions.length - 1 ? (
          <Button onClick={() => setCurrentIdx(currentIdx + 1)}>
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={attemptMutation.isPending || answeredCount < questions.length} className="bg-accent-emerald hover:bg-emerald-600">
            {attemptMutation.isPending ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        )}
      </div>
    </div>
  )
}
