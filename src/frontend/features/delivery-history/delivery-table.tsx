/** @jsxImportSource react */
import type { Delivery } from '../../shared/api'
import { EmptyState, StatusBadge, formatDate } from '../../shared/ui'

export function DeliveryTable({
  deliveries,
  hasUnfilteredData,
}: {
  deliveries: Delivery[]
  hasUnfilteredData: boolean
}) {
  if (deliveries.length === 0)
    return (
      <EmptyState
        title="Ничего не найдено"
        description={
          hasUnfilteredData
            ? 'Измените фильтры или поисковый запрос.'
            : 'Срабатываний пока нет.'
        }
      />
    )

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="border-b px-5 py-3 text-xs font-semibold text-muted-foreground sm:px-6">
              Время
            </th>
            <th className="border-b px-5 py-3 text-xs font-semibold text-muted-foreground sm:px-6">
              Кампания
            </th>
            <th className="border-b px-5 py-3 text-xs font-semibold text-muted-foreground sm:px-6">
              Состояние
            </th>
            <th className="border-b px-5 py-3 text-xs font-semibold text-muted-foreground sm:px-6">
              Публичный ответ
            </th>
            <th className="border-b px-5 py-3 text-xs font-semibold text-muted-foreground sm:px-6">
              Ошибка
            </th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((delivery) => (
            <tr key={delivery.id}>
              <td className="border-b px-5 py-4 align-top text-xs text-muted-foreground sm:px-6">
                {formatDate(delivery.createdAt)}
              </td>
              <td className="border-b px-5 py-4 align-top sm:px-6">
                <strong className="block text-sm font-semibold">
                  {delivery.campaignName ?? delivery.campaignId}
                </strong>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {delivery.commentId}
                </span>
              </td>
              <td className="border-b px-5 py-4 align-top sm:px-6">
                <StatusBadge status={delivery.status} />
              </td>
              <td className="border-b px-5 py-4 align-top sm:px-6">
                <StatusBadge status={delivery.publicReplyStatus} />
              </td>
              <td className="border-b px-5 py-4 align-top text-xs text-muted-foreground sm:px-6">
                {delivery.errorCode ?? delivery.publicReplyErrorCode ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
