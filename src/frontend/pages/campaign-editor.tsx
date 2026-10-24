/** @jsxImportSource react */
import { Link, useParams } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  InlineError,
  PageHeader,
  ScreenState,
  messageForError,
} from '../shared/ui'
import { CampaignForm } from '../features/campaign-editor/campaign-form'
import { useCampaignEditor } from '../features/campaign-editor/use-campaign-editor'

export function CampaignEditor() {
  const { id } = useParams()
  const model = useCampaignEditor(id)
  if (model.campaignPending) return <ScreenState label="Загружаем кампанию…" />
  if (model.editing && model.campaignError)
    return <InlineError message={messageForError(model.campaignError)} />

  return (
    <AlertDialog
      open={Boolean(model.confirmation)}
      onOpenChange={(open) => {
        if (!open) model.setConfirmation(null)
      }}
    >
      <div className="grid gap-8">
        <PageHeader
          eyebrow={model.editing ? 'Настройка кампании' : 'Новая кампания'}
          title={
            model.editing
              ? (model.campaign?.name ?? 'Кампания')
              : 'Новая кампания'
          }
          description="Настройте публикацию, ключевые слова и сообщение с материалом."
          action={
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
              to="/admin"
            >
              Отмена
            </Link>
          }
        />
        {Boolean(model.actionError) && (
          <InlineError message={messageForError(model.actionError)} />
        )}
        <CampaignForm model={model} />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите действие</AlertDialogTitle>
            <AlertDialogDescription>
              {model.confirmation?.message ?? ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                model.confirmation?.action()
                model.setConfirmation(null)
              }}
            >
              Продолжить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </div>
    </AlertDialog>
  )
}
