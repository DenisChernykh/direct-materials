/** @jsxImportSource react */
import type { ComponentProps } from 'react'
import { cn } from './utils'

export function Spinner({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="spinner"
      role="status"
      aria-label="Загрузка"
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
      {...props}
    />
  )
}
