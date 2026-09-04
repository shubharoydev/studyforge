import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, clearToken } from '../lib/api.js'
import { toast } from 'sonner'
import { timeAgo, initials } from '../lib/format.js'
import { Send, Plus, Trash2, FileText, Copy, RotateCcw, MessageSquare, BookOpen, Sparkles } from 'lucide-react'
import Button from '../components/ui/button.jsx'
import Spinner from '../components/ui/spinner.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const SUGGESTED_PROMPTS = [
  { label: 'Explain this topic simply', icon: '💡' },
  { label: 'Give me the key concepts', icon: '🔑' },
  { label: 'What are the most important points?', icon: '📝' },
  { label: 'Create a real-world example', icon: '🌍' },
  { label: 'Test me on this topic', icon: '🧪' }
]

export default function Chat() {
  const { conversationId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamAnswer, setStreamAnswer] = useState('')
  const [streamSources, setStreamSources] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(conversationId || null)
  const messagesEndRef = useRef(null)

  const docId = searchParams.get('doc') || null

  const { data: convListData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.chat.conversations({ limit: 30 }),
    refetchInterval: false
  })

  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ['conversation', activeConversationId],
    queryFn: () => api.chat.getConversation(activeConversationId),
    enabled: !!activeConversationId
  })

  const sendMessageMutation = useMutation({
    mutationFn: async (message) => {
      const hasApi = import.meta.env.VITE_API_URL
      if (hasApi) {
        return api.chat.send({ message, conversationId: activeConversationId, documentId: docId })
      }
      const token = localStorage.getItem('sf_token')
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message, conversationId: activeConversationId, documentId: docId })
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Request failed') }
      return res.json()
    },
    onSuccess: (data) => {
      setActiveConversationId(data.conversationId)
      queryClient.invalidateQueries({ queryKey: ['conversation', data.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (err) => toast.error(err.message || 'Failed to send message')
  })

  const handleSend = () => {
    if (!input.trim() || streaming) return
    const msg = input.trim()
    setInput('')
    sendMessageMutation.mutate(msg)
  }

  const messages = convData?.messages || []
  const isSending = sendMessageMutation.isPending

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isSending])

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-4 lg:-m-6 animate-fade-in">
      {/* Conversation sidebar */}
      <div className="hidden md:flex flex-col w-72 border-r border-surface-200 bg-white flex-shrink-0">
        <div className="p-4 border-b border-surface-200">
          <Button variant="secondary" size="sm" className="w-full" onClick={() => { setActiveConversationId(null); navigate('/chat') }}>
            <Plus className="w-4 h-4" /> New conversation
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {(convListData?.conversations || []).map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveConversationId(c.id); navigate(`/chat/${c.id}`) }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${activeConversationId === c.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-600 hover:bg-surface-50'}`}
            >
              <div className="truncate">{c.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">{timeAgo(c.updatedAt)}</div>
            </button>
          ))}
          {convListData?.conversations?.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No conversations yet</p>}
        </div>
      </div>

      {/* Chat main */}
      <div className="flex-1 flex flex-col bg-surface-50 min-w-0">
        {messages.length === 0 && !isSending ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 mb-1">What would you like to learn?</h2>
            <p className="text-sm text-slate-500 mb-6 text-center">Ask questions about your uploaded study material. Every answer is grounded in your documents.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_PROMPTS.map((p) => (
                <button key={p.label} onClick={() => setInput(p.label)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-surface-200 text-sm text-slate-700 hover:border-primary-300 hover:bg-primary-50/50 transition">
                  <span>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 max-w-3xl mx-auto ${m.role === 'USER' ? 'justify-end' : ''}`}>
                {m.role !== 'USER' && (
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-primary-600" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'USER' ? 'bg-primary-600 text-white' : 'bg-white border border-surface-200 text-slate-800'}`}>
                  {m.role === 'USER' ? <p>{m.content}</p> : (
                    <>
                      <div className="md-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
                      {m.citations?.items?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-surface-200">
                          <p className="text-xs font-medium text-slate-500 mb-2">Sources:</p>
                          {m.citations.items.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                              <FileText className="w-3.5 h-3.5 text-primary-400" />
                              <span className="font-medium">{c.documentName}</span>
                              <span>Page {c.pageNumber}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {m.role === 'USER' && (
                  <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-slate-600">
                    {initials(user?.name)}
                  </div>
                )}
              </div>
            ))}
            {isSending && (
              <div className="flex gap-3 max-w-3xl mx-auto">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                </div>
                <div className="bg-white border border-surface-200 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Spinner size="sm" /> Thinking...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-surface-200 bg-white p-4">
          <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Ask a question about your study material..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-surface-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 max-h-32"
              style={{ minHeight: '44px' }}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isSending}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
