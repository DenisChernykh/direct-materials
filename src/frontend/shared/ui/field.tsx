/** @jsxImportSource react */
import {
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Label } from './label'
import { cn } from './utils'

export function Field(props: {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  const hintId = `${props.id}-hint`
  const errorId = `${props.id}-error`
  const describedBy =
    [props.hint ? hintId : '', props.error ? errorId : '']
      .filter(Boolean)
      .join(' ') || undefined
  const child = isValidElement(props.children)
    ? cloneElement(props.children as ReactElement<Record<string, unknown>>, {
        id: props.id,
        'aria-invalid': Boolean(props.error),
        'aria-describedby': describedBy,
      })
    : props.children

  return (
    <div
      role="group"
      data-slot="field"
      data-invalid={Boolean(props.error)}
      className={cn('flex w-full flex-col gap-2', props.className)}
    >
      <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
      {child}
      {props.hint && (
        <FieldDescription id={hintId}>{props.hint}</FieldDescription>
      )}
      {props.error && <FieldError id={errorId}>{props.error}</FieldError>}
    </div>
  )
}

export function FieldLabel({ className, ...props }: ComponentProps<'label'>) {
  return <Label data-slot="field-label" className={className} {...props} />
}

export function FieldDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  )
}

export function FieldError({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="field-error"
      role="alert"
      className={cn('text-xs text-destructive', className)}
      {...props}
    />
  )
}
