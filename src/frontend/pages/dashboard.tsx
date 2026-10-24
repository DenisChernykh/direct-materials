/** @jsxImportSource react */
import { Link, useSearchParams } from 'react-router-dom'
import { ConnectionBanner } from '../features/instagram-connection/connection-banner'
import { CampaignList } from '../entities/campaign/ui/campaign-list'
import { DeliveryMetrics } from '../entities/delivery/ui/delivery-metrics'
import { useDashboard } from '../features/dashboard/use-dashboard'
import { ErrorState, PageHeader, ScreenState } from '../shared/ui'

export function DashboardPage() {
  const [searchParams] = useSearchParams()
  const dashboard = useDashboard()
  if (dashboard.isPending) return <ScreenState label="Загружаем обзор…" />
  if (dashboard.isError) return <ErrorState error={dashboard.error} />
  const { connection, campaigns, counters } = dashboard.data
  return (
    <div className="grid gap-8">
      {searchParams.get('connected') === '1' && (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          role="status"
        >
          Instagram подключён, webhook активен.
        </div>
      )}
      <PageHeader
        eyebrow="Рабочее пространство"
        title="Выдача материалов"
        description="Комментарий запускает Direct, подписка открывает ссылку."
        action={
          <Link
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90"
            to="/admin/campaigns/new"
          >
            <span aria-hidden="true">＋</span> Новая кампания
          </Link>
        }
      />
      <ConnectionBanner connection={connection} />
      <DeliveryMetrics counters={counters} />
      <section className="grid gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Кампании
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Управляйте правилами выдачи и статусами.
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {campaigns.length}
          </span>
        </div>
        <CampaignList campaigns={campaigns} />
      </section>
    </div>
  )
}
