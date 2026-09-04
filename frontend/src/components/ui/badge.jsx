import { cn } from '../../lib/utils.js'

const badgeVariants = {
  default: 'bg-surface-100 text-slate-700 border-surface-300',
  primary: 'bg-primary-50 text-primary-700 border-primary-200',
  success: 'bg-emerald-50 text-accent-emerald border-emerald-200',
  warning: 'bg-amber-50 text-accent-amber border-amber-200',
  danger: 'bg-rose-50 text-accent-rose border-rose-200',
  violet: 'bg-violet-50 text-accent-violet border-violet-200'
}

export default function Badge({ variant = 'default', className, children, ...props }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border',
      badgeVariants[variant],
      className
    )} {...props}>
      {children}
    </span>
  )
}
