/** @jsxImportSource react */
import type { CampaignEditorModel } from './use-campaign-editor'
import {
  AlertDialogTrigger,
  Button,
  Input,
  Label,
  Textarea,
} from '../../shared/ui'

export function RecoverDeliveryPanel({
  model,
}: {
  model: CampaignEditorModel
}) {
  if (!model.editing || model.campaign?.status !== 'active') return null
  const ready = Boolean(
    model.recoveryCommentId.trim() && model.recoveryText.trim(),
  )

  return (
    <div className="mt-0 grid gap-3 rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
      <span className="text-[10px] font-extrabold tracking-[0.14em] text-muted-foreground uppercase">
        ВОССТАНОВЛЕНИЕ
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Повторно поставит пропущенный комментарий в очередь. Обычная кнопка,
        проверка подписки и публичный ответ сохранятся.
      </p>
      <Label htmlFor="recovery-comment-id">ID комментария</Label>
      <Input
        id="recovery-comment-id"
        inputMode="numeric"
        value={model.recoveryCommentId}
        onChange={(event) => model.setRecoveryCommentId(event.target.value)}
      />
      <Label htmlFor="recovery-comment-text">Текст комментария</Label>
      <Textarea
        id="recovery-comment-text"
        rows={3}
        value={model.recoveryText}
        onChange={(event) => model.setRecoveryText(event.target.value)}
      />
      <AlertDialogTrigger
        render={<Button variant="outline" className="w-full" />}
        type="button"
        disabled={!ready || model.actionPending}
        onClick={() =>
          model.setConfirmation({
            message: `Восстановить стандартную доставку для комментария ${model.recoveryCommentId.trim()}?`,
            action: model.recoverDelivery,
          })
        }
      >
        Восстановить доставку
      </AlertDialogTrigger>
    </div>
  )
}
