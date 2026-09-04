import { forwardRef } from 'react'
import { cn } from '../../lib/utils.js'

const Textarea = forwardRef(({ className, error, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white placeholder:text-slate-400 resize-none',
      'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
      error ? 'border-accent-rose' : 'border-surface-300',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
export default Textarea
