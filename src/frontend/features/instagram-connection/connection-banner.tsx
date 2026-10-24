/** @jsxImportSource react */
import type { Connection } from '../../shared/api'
import { cn } from '../../shared/ui/utils'

export function ConnectionBanner({
  connection,
}: {
  connection: Connection | null
}) {
  const connected =
    connection?.status === 'connected' && connection.webhookSubscribed
  return (
    <section className="flex flex-col items-start gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground',
          connected &&
            'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
        )}
      >
        {connected ? '✓' : '!'}
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <strong className="text-sm font-semibold text-foreground">
          {connected
            ? `Instagram подключён · @${connection?.username}`
            : 'Instagram ещё не подключён'}
        </strong>
        <span className="text-xs leading-relaxed text-muted-foreground">
          {connected
            ? 'Webhook активен — кампании принимают комментарии.'
            : 'Разрешите чтение комментариев и отправку сообщений, чтобы начать.'}
        </span>
      </div>
      <a
        className={cn(
          'inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg px-3 text-xs font-semibold transition-colors',
          connected
            ? 'text-primary hover:bg-accent'
            : 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        )}
        href="/oauth/instagram/start"
      >
        {connected ? 'Переподключить →' : 'Подключить Instagram'}
      </a>
    </section>
  )
}
