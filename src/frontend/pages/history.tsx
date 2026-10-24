/** @jsxImportSource react */
import { useMemo, useState } from 'react'
import { useHistory } from '../features/delivery-history/use-history'
import { DeliveryTable } from '../features/delivery-history/delivery-table'
import { HistoryFilters } from '../features/delivery-history/history-filters'
import { Card, ErrorState, PageHeader, ScreenState } from '../shared/ui'

export function HistoryPage() {
  const history = useHistory()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [replyStatus, setReplyStatus] = useState('all')
  const deliveries = useMemo(() => {
    if (!history.data) return []
    const needle = query.trim().toLocaleLowerCase('ru-RU')
    return history.data.deliveries.filter((delivery) => {
      const matchesStatus = status === 'all' || delivery.status === status
      const matchesReply =
        replyStatus === 'all' || delivery.publicReplyStatus === replyStatus
      const haystack =
        `${delivery.campaignName ?? ''} ${delivery.commentId} ${delivery.errorCode ?? ''}`.toLocaleLowerCase(
          'ru-RU',
        )
      return (
        matchesStatus && matchesReply && (!needle || haystack.includes(needle))
      )
    })
  }, [history.data, query, replyStatus, status])
  if (history.isPending) return <ScreenState label="Загружаем историю…" />
  if (history.isError) return <ErrorState error={history.error} />
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Операции"
        title="История доставок"
        description="Последние 50 срабатываний. Старые записи удаляются через 30 дней."
      />
      <Card className="gap-0 p-0">
        <div className="flex items-end justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          <div>
            <h2 className="font-heading text-base font-semibold">
              Последние доставки
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Фильтры работают в браузере и не меняют данные.
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {deliveries.length}
          </span>
        </div>
        <HistoryFilters
          query={query}
          status={status}
          replyStatus={replyStatus}
          onQueryChange={setQuery}
          onStatusChange={setStatus}
          onReplyStatusChange={setReplyStatus}
        />
        <DeliveryTable
          deliveries={deliveries}
          hasUnfilteredData={history.data.deliveries.length > 0}
        />
      </Card>
    </div>
  )
}
