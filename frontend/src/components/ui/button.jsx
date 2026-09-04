import { forwardRef } from 'react'
import { cn } from '../../lib/utils.js'

const variants = {
  default: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
  secondary: 'bg-surface-100 text-slate-700 hover:bg-surface-200 border border-surface-300',
  ghost: 'text-slate-600 hover:bg-surface-100 hover:text-slate-900',
  danger: 'bg-accent-rose text-white hover:bg-red-600',
  outline: 'border border-primary-300 text-primary-700 hover:bg-primary-50'
}
const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-2.5 text-base rounded-xl',
  icon: 'p-2 rounded-lg'
}

const Button = forwardRef(({ className, variant = 'default', size = 'md', disabled, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled}
    className={cn(
      'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
      variants[variant],
      sizes[size],
      className
    )}
    {...props}
  />
))
Button.displayName = 'Button'
export default Button
