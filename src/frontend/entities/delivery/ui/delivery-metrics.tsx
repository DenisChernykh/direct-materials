/** @jsxImportSource react */
import type { Dashboard } from '../../../shared/api'
import { Card } from '../../../shared/ui'
import { cn } from '../../../shared/ui/utils'

const metrics = [
  ['received', 'Получено', ''],
  ['initial_dm_sent', 'Direct', ''],
  ['waiting_for_follow', 'Ждут подписки', ''],
  ['delivered', 'Выдано', 'positive'],
  ['failed', 'Ошибки', 'negative'],
  ['unknown', 'Проверить', 'negative'],
] as const

export function DeliveryMetrics({
  counters,
}: {
  counters: Dashboard['counters']
}) {
  return (
    <section
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      aria-label="Сводка доставок"
    >
      {metrics.map(([key, label, tone]) => (
        <Card className="gap-2 p-4" key={key}>
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
          <strong
            className={cn(
              'text-2xl font-semibold tracking-tight',
              tone === 'positive' && 'text-emerald-600 dark:text-emerald-400',
              tone === 'negative' && 'text-rose-600 dark:text-rose-400',
            )}
          >
            {counters[key] ?? 0}
          </strong>
          <span className="text-[10px] text-muted-foreground">
            за последние 30 дней
          </span>
        </Card>
      ))}
    </section>
  )
}
