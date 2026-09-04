import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...args) {
  return twMerge(clsx(...args))
}

export function initials(name) {
  if (!name) return ''
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
