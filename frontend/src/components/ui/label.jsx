import { cn } from '../../lib/utils.js'

export default function Label({ className, children, ...props }) {
  return (
    <label className={cn('block text-sm font-medium text-slate-700 mb-1.5', className)} {...props}>
      {children}
    </label>
  )
}
