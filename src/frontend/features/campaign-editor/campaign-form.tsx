/** @jsxImportSource react */
import { Link } from 'react-router-dom'
import type { CampaignEditorModel } from './use-campaign-editor'
import { CampaignBasicsSection } from './campaign-basics-section'
import { CampaignMessagesSection } from './campaign-messages-section'
import { CampaignStatusPanel } from './campaign-status-panel'
import { PublicReplyActionsPanel } from './public-reply-actions-panel'
import { PublicReplySection } from './public-reply-section'
import { RecoverDeliveryPanel } from './recover-delivery-panel'
import { Button } from '../../shared/ui'

export function CampaignForm({ model }: { model: CampaignEditorModel }) {
  return (
    <form
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start"
      onSubmit={model.form.handleSubmit(model.saveCampaign)}
      noValidate
    >
      <div className="grid gap-6">
        <CampaignBasicsSection form={model.form} media={model.media} />
        <PublicReplySection form={model.form} />
        <CampaignMessagesSection form={model.form} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <Button
            type="submit"
            isLoading={model.savePending}
            loadingLabel="Сохраняем кампанию"
            disabled={model.actionPending && !model.savePending}
          >
            {model.savePending ? 'Сохраняем…' : 'Сохранить кампанию'}
          </Button>
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
            to="/admin"
          >
            Отмена
          </Link>
        </div>
      </div>
      <aside className="grid gap-3 lg:sticky lg:top-6">
        <CampaignStatusPanel model={model} />
        <RecoverDeliveryPanel model={model} />
        <PublicReplyActionsPanel model={model} />
      </aside>
    </form>
  )
}
