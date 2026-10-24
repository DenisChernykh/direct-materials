/** @jsxImportSource react */
import { Link } from 'react-router-dom'
import type { Campaign } from '../../../shared/api'
import { EmptyState, StatusBadge, targetLabel } from '../../../shared/ui'

export function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0)
    return (
      <EmptyState
        title="Кампаний пока нет"
        description="Создайте первую кампанию после подключения Instagram."
        action={
          <Link
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            to="/admin/campaigns/new"
          >
            Создать кампанию
          </Link>
        }
      />
    )

  return (
    <div className="grid overflow-hidden rounded-xl border bg-card">
      {campaigns.map((campaign) => (
        <Link
          className="group flex items-center gap-3 border-b px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/50"
          to={`/admin/campaigns/${campaign.id}`}
          key={campaign.id}
        >
          <span className="flex size-2 shrink-0 rounded-full bg-primary/70">
            <span className="sr-only">Статус кампании</span>
          </span>
          <span className="grid min-w-0 flex-1 gap-1">
            <strong className="truncate text-sm font-semibold text-foreground">
              {campaign.name}
            </strong>
            <span className="truncate text-xs text-muted-foreground">
              {targetLabel(campaign)}
            </span>
          </span>
          <StatusBadge status={campaign.status} />
          <span className="text-xl text-muted-foreground/60" aria-hidden="true">
            ›
          </span>
        </Link>
      ))}
    </div>
  )
}
