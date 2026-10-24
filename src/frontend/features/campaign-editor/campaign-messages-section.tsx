/** @jsxImportSource react */
import type { UseFormReturn } from 'react-hook-form'
import type { CampaignFormValues } from '../../entities/campaign'
import { Field, Input, Textarea } from '../../shared/ui'

export function CampaignMessagesSection({
  form,
}: {
  form: UseFormReturn<CampaignFormValues>
}) {
  const errors = form.formState.errors
  return (
    <section className="grid gap-6 rounded-xl border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
      <div className="grid gap-1.5">
        <h2 className="font-heading text-base font-semibold">Сообщения</h2>
        <p className="text-sm text-muted-foreground">
          Короткие понятные сообщения для каждого шага сценария.
        </p>
      </div>
      <div className="grid gap-5">
        <Field
          id="campaign-initial-message"
          label="Первое сообщение в Direct"
          error={errors.initialMessage?.message}
        >
          <Textarea rows={4} {...form.register('initialMessage')} />
        </Field>
        <Field
          id="campaign-initial-button"
          label="Текст кнопки первого сообщения"
          error={errors.initialButtonText?.message}
        >
          <Input {...form.register('initialButtonText')} />
        </Field>
        <Field
          id="campaign-follow-message"
          label="Сообщение, если человек не подписан"
          error={errors.followMessage?.message}
        >
          <Textarea rows={4} {...form.register('followMessage')} />
        </Field>
        <Field
          id="campaign-recheck-button"
          label="Текст кнопки повторной проверки"
          error={errors.recheckButtonText?.message}
        >
          <Input {...form.register('recheckButtonText')} />
        </Field>
        <Field
          id="campaign-delivery-message"
          label="Сообщение перед ссылкой"
          error={errors.deliveryMessage?.message}
        >
          <Textarea rows={3} {...form.register('deliveryMessage')} />
        </Field>
        <Field
          id="campaign-unavailable-message"
          label="Сообщение при временной ошибке"
          error={errors.unavailableMessage?.message}
        >
          <Textarea rows={3} {...form.register('unavailableMessage')} />
        </Field>
        <Field
          id="campaign-material-url"
          label="HTTPS-ссылка на материал"
          error={errors.materialUrl?.message}
        >
          <Input
            type="url"
            inputMode="url"
            placeholder="https://"
            {...form.register('materialUrl')}
          />
        </Field>
      </div>
    </section>
  )
}
