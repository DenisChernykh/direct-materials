/** @jsxImportSource react */
import type { CampaignEditorModel } from './use-campaign-editor'
import { Button, StatusBadge } from '../../shared/ui'
import { mediaLabel } from '../../entities/campaign'

export function CampaignStatusPanel({ model }: { model: CampaignEditorModel }) {
  const status = model.campaign?.status
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
      <span className="text-[10px] font-extrabold tracking-[0.14em] text-muted-foreground uppercase">
        СТАТУС
      </span>
      <div className="flex items-center gap-2">
        <span
          className={
            status === 'active'
              ? 'size-2 rounded-full bg-emerald-500'
              : 'size-2 rounded-full bg-muted-foreground/40'
          }
          aria-hidden="true"
        />
        {status ? <StatusBadge status={status} /> : 'Черновик'}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {status === 'active'
          ? 'Кампания принимает подходящие комментарии.'
          : 'Сохраните кампанию, затем активируйте её после подключения Instagram.'}
      </p>
      <div className="grid gap-3">
        {model.editing && status !== 'active' && (
          <Button
            className="w-full"
            type="button"
            isLoading={model.statusPending}
            loadingLabel="Активируем кампанию"
            disabled={model.actionPending && !model.statusPending}
            onClick={() => model.setStatus('active')}
          >
            {model.statusPending ? 'Активируем…' : 'Активировать'}
          </Button>
        )}
        {model.editing && status === 'active' && (
          <Button
            variant="outline"
            className="w-full"
            type="button"
            isLoading={model.statusPending}
            loadingLabel="Ставим на паузу"
            disabled={model.actionPending && !model.statusPending}
            onClick={() => model.setStatus('paused')}
          >
            {model.statusPending ? 'Ставим на паузу…' : 'Поставить на паузу'}
          </Button>
        )}
        {model.selectedMedia && (
          <span className="text-xs text-muted-foreground">
            Выбрано: {mediaLabel(model.selectedMedia)}
          </span>
        )}
      </div>
    </div>
  )
}
