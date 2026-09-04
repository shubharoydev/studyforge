import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import { toast } from 'sonner'
import { formatDate, formatBytes } from '../lib/format.js'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx'
import Badge from '../components/ui/badge.jsx'
import Button from '../components/ui/button.jsx'
import Spinner from '../components/ui/spinner.jsx'
import { ArrowLeft, FileText, Trash2, MessageSquare, BookOpen, FileDown, Clock, Layers } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const STATUS_BADGE = { UPLOADING: 'warning', PROCESSING: 'warning', INDEXING: 'primary', READY: 'success', FAILED: 'danger' }

export default function DocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['document', id],
    queryFn: () => api.documents.get(id),
    refetchInterval: (q) => {
      const doc = q.state.data?.document
      return doc && ['UPLOADING', 'PROCESSING', 'INDEXING'].includes(doc.status) ? 3000 : false
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.documents.delete(id),
    onSuccess: () => { toast.success('Deleted'); navigate('/documents') },
    onError: (err) => toast.error(err.message)
  })

  const summaryMutation = useMutation({
    mutationFn: () => api.documents.summary(id),
    onSuccess: () => { toast.success('Summary generated!'); queryClient.invalidateQueries({ queryKey: ['document', id] }) },
    onError: (err) => toast.error(err.message || 'Summary generation failed')
  })

  const doc = data?.document
  const summary = doc?.summary

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (error || !doc) return <div className="text-center py-20 text-slate-500">Document not found.</div>

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Link to="/documents" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Back to documents
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">{doc.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant={STATUS_BADGE[doc.status] || 'default'}>{doc.status}</Badge>
              {doc.pageCount && <span className="text-xs text-slate-400">{doc.pageCount} pages</span>}
              <span className="text-xs text-slate-400">{formatBytes(doc.fileSize)}</span>
              <span className="text-xs text-slate-400">Uploaded {formatDate(doc.createdAt)}</span>
            </div>
          </div>
        </div>
        {doc.status === 'READY' && (
          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate()}><Trash2 className="w-4 h-4 text-slate-400 hover:text-accent-rose" /></Button>
        )}
      </div>

      {/* Actions */}
      {doc.status === 'READY' && (
        <div className="flex gap-3">
          <Link to={`/chat?doc=${id}`}><Button variant="secondary" size="sm"><MessageSquare className="w-4 h-4" /> Ask about this document</Button></Link>
        </div>
      )}

      {/* Summary Section */}
      {doc.status === 'READY' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5 text-primary-500" /> Document Summary</CardTitle>
            {!summary && !summaryMutation.isPending && (
              <Button size="sm" onClick={() => summaryMutation.mutate()}>Generate Summary</Button>
            )}
          </CardHeader>
          <CardContent>
            {summaryMutation.isPending ? (
              <div className="flex flex-col items-center py-8 gap-3"><Spinner /><p className="text-sm text-slate-500">Generating summary...</p></div>
            ) : summary ? (
              <div className="space-y-4 md-content text-sm text-slate-700">
                {summary.overview && <div><h3 className="font-semibold text-slate-900 mb-1">Overview</h3><p>{summary.overview}</p></div>}
                {summary.keyConcepts?.length > 0 && <div><h3 className="font-semibold text-slate-900 mb-1">Key Concepts</h3><ul className="list-disc pl-5">{summary.keyConcepts.map((c, i) => <li key={i}>{c}</li>)}</ul></div>}
                {summary.definitions?.length > 0 && <div><h3 className="font-semibold text-slate-900 mb-1">Definitions</h3><dl className="space-y-2">{summary.definitions.map((d, i) => <div key={i}><dt className="font-medium text-slate-900">{d.term}</dt><dd className="text-slate-600 ml-2">{d.definition}</dd></div>)}</dl></div>}
                {summary.formulas?.length > 0 && <div><h3 className="font-semibold text-slate-900 mb-1">Important Formulas/Rules</h3><ul className="list-disc pl-5">{summary.formulas.map((f, i) => <li key={i} className="font-mono text-xs">{f}</li>)}</ul></div>}
                {summary.examPoints?.length > 0 && <div><h3 className="font-semibold text-slate-900 mb-1">Exam-Focused Points</h3><ul className="list-disc pl-5">{summary.examPoints.map((p, i) => <li key={i}>{p}</li>)}</ul></div>}
                {summary.suggestedQuestions?.length > 0 && <div><h3 className="font-semibold text-slate-900 mb-1">Suggested Questions</h3><ul className="list-disc pl-5">{summary.suggestedQuestions.map((q, i) => <li key={i} className="text-primary-700">{q}</li>)}</ul></div>}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4">Generate a summary to see an overview, key concepts, definitions, and suggested questions.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing Status */}
      {doc.status !== 'READY' && (
        <Card>
          <CardContent className="py-12 text-center">
            {doc.status === 'FAILED' ? (
              <div className="text-accent-rose"><p className="font-medium mb-1">Processing failed</p><p className="text-sm text-slate-500">{doc.errorMessage || 'We couldn\'t process this document. Please try another PDF.'}</p></div>
            ) : (
              <div><Spinner className="mx-auto mb-3" /><p className="text-sm text-slate-500">Document is being processed...</p></div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
