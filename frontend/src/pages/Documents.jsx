import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import { toast } from 'sonner'
import { formatDate, formatBytes } from '../lib/format.js'
import Card from '../components/ui/card.jsx'
import Badge from '../components/ui/badge.jsx'
import Button from '../components/ui/button.jsx'
import Spinner from '../components/ui/spinner.jsx'
import EmptyState from '../components/ui/empty-state.jsx'
import { Upload, FileText, Trash2, Clock, CheckCircle, AlertCircle, Loader2, UploadCloud } from 'lucide-react'

const STATUS = {
  UPLOADING: { label: 'Uploading', icon: Loader2, variant: 'warning', spin: true },
  PROCESSING: { label: 'Processing', icon: Loader2, variant: 'warning', spin: true },
  INDEXING: { label: 'Indexing', icon: Loader2, variant: 'primary', spin: true },
  READY: { label: 'Ready', icon: CheckCircle, variant: 'success' },
  FAILED: { label: 'Failed', icon: AlertCircle, variant: 'danger' }
}

export default function Documents() {
  const queryClient = useQueryClient()
  const [uploadProgress, setUploadProgress] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.documents.list(),
    refetchInterval: (q) => {
      const docs = q.state.data?.documents ?? []
      return docs.some((d) => ['UPLOADING', 'PROCESSING', 'INDEXING'].includes(d.status)) ? 3000 : false
    }
  })

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setUploadProgress(0)
      const result = await api.documents.upload(file, (pct) => setUploadProgress(pct))
      return result
    },
    onSuccess: () => { toast.success('Document uploaded! Processing started.'); setUploadProgress(null); queryClient.invalidateQueries({ queryKey: ['documents'] }) },
    onError: (err) => { toast.error(err.message || 'Upload failed'); setUploadProgress(null) }
  })

  const deleteMutation = useMutation({
    mutationFn: api.documents.delete,
    onSuccess: () => { toast.success('Document deleted'); queryClient.invalidateQueries({ queryKey: ['documents'] }) },
    onError: (err) => toast.error(err.message)
  })

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported'); return
    }
    if (file.size > 25 * 1024 * 1024) { toast.error('File is too large (max 25 MB)'); return }
    uploadMutation.mutate(file)
  }, [uploadMutation])

  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }, [handleFile])
  const handleInput = useCallback((e) => { handleFile(e.target.files[0]); e.target.value = '' }, [handleFile])

  const docs = data?.documents ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${dragOver ? 'border-primary-500 bg-primary-50/50' : 'border-surface-300 hover:border-primary-300 hover:bg-surface-50'}`}
        onClick={() => document.getElementById('file-upload').click()}
      >
        <input id="file-upload" type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleInput} />
        {uploadProgress !== null ? (
          <div className="space-y-3">
            <Spinner size="lg" />
            <p className="text-sm text-slate-600">
              {uploadProgress >= 100 ? 'Uploaded — processing on server...' : `Uploading... ${uploadProgress}%`}
            </p>
            <div className="w-48 h-2 bg-surface-200 rounded-full mx-auto overflow-hidden">
              <div className={`h-full rounded-full transition-all ${uploadProgress >= 100 ? 'bg-accent-emerald' : 'bg-primary-500'}`} style={{ width: `${Math.min(uploadProgress, 100)}%` }} />
            </div>
          </div>
        ) : (
          <>
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="font-medium text-slate-900 mb-1">Drop a PDF here or click to browse</p>
            <p className="text-sm text-slate-500">Supports PDF files up to 25 MB</p>
          </>
        )}
      </div>

      {/* Document List */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Your Documents ({docs.length})</h3>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : docs.length === 0 ? (
          <EmptyState icon="documents" title="No documents yet" description="Upload your first study material to get started." action={
            <Button onClick={() => document.getElementById('file-upload').click()} size="sm"><Upload className="w-4 h-4" /> Upload PDF</Button>
          } />
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => {
              const statusInfo = STATUS[doc.status] || STATUS.READY
              const StatusIcon = statusInfo.icon
              return (
                <Card key={doc.id} hover className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/documents/${doc.id}`} className="font-medium text-slate-900 hover:text-primary-600 truncate block">
                        {doc.name}
                      </Link>
                      <div className="flex items-center gap-3 mt-0.5">
                        <Badge variant={statusInfo.variant} className={statusInfo.spin ? 'animate-pulse' : ''}>
                          <StatusIcon className={`w-3 h-3 mr-1 ${statusInfo.spin ? 'animate-spin' : ''}`} />
                          {statusInfo.label}
                        </Badge>
                        {doc.pageCount && <span className="text-xs text-slate-400">{doc.pageCount} pages</span>}
                        <span className="text-xs text-slate-400">{formatBytes(doc.fileSize)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.status === 'READY' && (
                        <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); deleteMutation.mutate(doc.id) }}>
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-accent-rose" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
