/** @jsxImportSource react */
import { Input, Label } from '../../shared/ui'

export function HistoryFilters(props: {
  query: string
  status: string
  replyStatus: string
  onQueryChange: (value: string) => void
  onStatusChange: (value: string) => void
  onReplyStatusChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:px-6">
      <Label
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-card px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
        htmlFor="history-search"
      >
        <span className="text-muted-foreground" aria-hidden="true">
          ⌕
        </span>
        <Input
          id="history-search"
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder="Кампания, comment ID…"
        />
      </Label>
      <label className="min-w-40">
        <span className="sr-only">Состояние доставки</span>
        <select
          className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          value={props.status}
          onChange={(event) => props.onStatusChange(event.target.value)}
        >
          <option value="all">Все состояния</option>
          <option value="delivered">Выдано</option>
          <option value="waiting_for_follow">Ждёт подписки</option>
          <option value="failed">Ошибка</option>
          <option value="unknown">Неизвестно</option>
        </select>
      </label>
      <label className="min-w-40">
        <span className="sr-only">Публичный ответ</span>
        <select
          className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          value={props.replyStatus}
          onChange={(event) => props.onReplyStatusChange(event.target.value)}
        >
          <option value="all">Все ответы</option>
          <option value="sent">Отправлены</option>
          <option value="pending">В очереди</option>
          <option value="failed">Ошибки ответа</option>
          <option value="disabled">Отключены</option>
        </select>
      </label>
    </div>
  )
}
