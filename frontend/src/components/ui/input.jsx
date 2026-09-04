import { forwardRef } from 'react'
import { cn } from '../../lib/utils.js'

const Input = forwardRef(({ className, type = 'text', error, ...props }, ref) => (
  <div className="w-full">
    <input
      type={type}
      ref={ref}
      className={cn(
        'w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
        'transition-colors duration-150',
        error ? 'border-accent-rose' : 'border-surface-300',
        className
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-accent-rose">{error}</p>}
  </div>
))
Input.displayName = 'Input'
export default Input
