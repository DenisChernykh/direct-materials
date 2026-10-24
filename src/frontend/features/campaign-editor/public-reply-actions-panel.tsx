/** @jsxImportSource react */
import type { CampaignEditorModel } from './use-campaign-editor'
import { AlertDialogTrigger, Button } from '../../shared/ui'

export function PublicReplyActionsPanel({
  model,
}: {
  model: CampaignEditorModel
}) {
  if (
    !model.editing ||
    !model.campaign?.publicReplyEnabled ||
    (model.backfillCount === 0 && model.failedCount === 0)
  )
    return null

  return (
    <div className="mt-0 grid gap-3 rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
      <span className="text-[10px] font-extrabold tracking-[0.14em] text-muted-foreground uppercase">
        ОТВЕТЫ
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Публичные ответы можно безопасно повторить. Действие проверит, что
        список не изменился.
      </p>
      <div className="grid gap-3">
        {model.backfillCount > 0 && (
          <AlertDialogTrigger
            render={<Button variant="outline" className="w-full" />}
            type="button"
            disabled={model.actionPending}
            onClick={() =>
              model.setConfirmation({
                message: `Ответить под ${model.backfillCount} старыми комментариями?`,
                action: () => model.backfill(model.backfillCount),
              })
            }
          >
            Ответить под старыми ({model.backfillCount})
          </AlertDialogTrigger>
        )}
        {model.failedCount > 0 && (
          <AlertDialogTrigger
            render={<Button variant="outline" className="w-full" />}
            type="button"
            disabled={model.actionPending}
            onClick={() =>
              model.setConfirmation({
                message: `Повторить ${model.failedCount} неотправленных ответов?`,
                action: () => model.retry(model.failedCount),
              })
            }
          >
            Повторить ошибки ({model.failedCount})
          </AlertDialogTrigger>
        )}
      </div>
    </div>
  )
}
