/** @jsxImportSource react */
import type { ReactNode } from 'react'
import { ApiClientError, type Campaign } from '../api'
import { Alert, AlertDescription } from './alert'
import { Badge } from './badge'
import { Spinner } from './spinner'
import { cn } from './utils'

export function PageHeader(props: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="mb-2.5 block text-[10px] font-extrabold tracking-[0.14em] text-muted-foreground uppercase">
          {props.eyebrow}
        </span>
        <h1 className="font-heading text-3xl leading-tight font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
          {props.title}
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {props.description}
        </p>
      </div>
      {props.action}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    draft: 'Черновик',
    active: 'Активна',
    paused: 'Пауза',
    received: 'Получено',
    initial_dm_sent: 'Direct отправлен',
    waiting_for_follow: 'Ждёт подписки',
    delivered: 'Выдано',
    failed: 'Ошибка',
    unknown: 'Неизвестно',
    disabled: 'Отключён',
    pending: 'В очереди',
    sent: 'Отправлен',
  }
  const tone =
    status === 'active' || status === 'delivered' || status === 'sent'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
      : status === 'failed' || status === 'unknown'
        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300'
        : status === 'waiting_for_follow' || status === 'pending'
          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'
          : undefined
  return <Badge className={cn(tone)}>{labels[status] ?? status}</Badge>
}

export function EmptyState(props: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center"
      data-slot="empty-state"
    >
      <div
        className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted text-xl text-muted-foreground"
        aria-hidden="true"
      >
        ◌
      </div>
      <h3 className="font-heading text-base font-semibold">{props.title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        {props.description}
      </p>
      {props.action}
    </div>
  )
}

export function InlineError({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="flex items-center gap-2">
      <span aria-hidden="true" className="font-bold">
        !
      </span>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

export function ScreenState({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground"
      data-slot="screen-state"
    >
      <Spinner aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="flex flex-col gap-6">
      <InlineError message={messageForError(error)} />
    </div>
  )
}

export function messageForError(error: unknown) {
  const safeCodes = new Set([
    'AUTHENTICATION_REQUIRED',
    'INVALID_CREDENTIALS',
    'VALIDATION_FAILED',
    'NOT_FOUND',
    'CONFLICT',
    'DEPENDENCY_UNAVAILABLE',
    'INTERNAL_ERROR',
  ])
  return error instanceof ApiClientError && safeCodes.has(error.code)
    ? error.message
    : 'Произошла ошибка. Попробуйте ещё раз.'
}

export function targetLabel(campaign: Campaign) {
  if (campaign.triggerMode === 'any') return 'Любая публикация'
  if (campaign.triggerMode === 'next') return 'Следующая публикация'
  return campaign.mediaId || 'Публикация'
}

export function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
}

export { cn }
