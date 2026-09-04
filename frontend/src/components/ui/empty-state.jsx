import { cn } from '../../lib/utils.js'
import { FileX, MessageSquare, BookOpen, BarChart3 } from 'lucide-react'

const icons = { documents: FileX, chat: MessageSquare, quizzes: BookOpen, analytics: BarChart3 }

export default function EmptyState({ icon = 'documents', title, description, action, className }) {
  const Icon = icons[icon] || FileX
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in', className)}>
      <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}
