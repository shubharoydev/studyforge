import { cn } from '../../lib/utils.js'

export default function Card({ className, children, hover, ...props }) {
  return (
    <div className={cn('bg-white rounded-xl border border-surface-200', hover && 'shadow-card transition-shadow hover:shadow-card-hover', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return <div className={cn('px-5 pt-5 pb-3', className)} {...props}>{children}</div>
}

export function CardContent({ className, children, ...props }) {
  return <div className={cn('px-5 pb-5', className)} {...props}>{children}</div>
}

export function CardTitle({ className, children, ...props }) {
  return <h3 className={cn('font-semibold text-slate-900', className)} {...props}>{children}</h3>
}
