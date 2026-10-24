/** @jsxImportSource react */
import type { UseFormReturn } from 'react-hook-form'
import type { CampaignFormValues } from '../../entities/campaign'
import { Field, Input, Textarea, Label } from '../../shared/ui'

export function PublicReplySection({
  form,
}: {
  form: UseFormReturn<CampaignFormValues>
}) {
  const error = form.formState.errors.publicReplyVariantsText?.message
  return (
    <section className="grid gap-6 rounded-xl border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
      <div className="grid gap-1.5">
        <h2 className="font-heading text-base font-semibold">
          Публичный ответ
        </h2>
        <p className="text-sm text-muted-foreground">
          Ответ появляется только после успешной отправки Direct.
        </p>
      </div>
      <div className="grid gap-5">
        <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/60">
          <Input
            className="peer sr-only"
            type="checkbox"
            {...form.register('publicReplyEnabled')}
          />
          <span
            className="relative mt-0.5 flex h-5 w-9 shrink-0 rounded-full bg-muted-foreground/30 p-0.5 transition-colors after:block after:size-4 after:rounded-full after:bg-background after:shadow-sm after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/40 peer-disabled:opacity-50"
            aria-hidden="true"
          />
          <span className="grid gap-1">
            <strong className="text-sm font-semibold">
              Отвечать под подходящим комментарием
            </strong>
            <small className="text-xs text-muted-foreground">
              Публичный текст выбирается по очереди.
            </small>
          </span>
        </Label>
        <Field
          id="campaign-public-replies"
          label="Варианты ответа"
          hint="Один вариант на строку, максимум 10."
          error={error}
        >
          <Textarea rows={5} {...form.register('publicReplyVariantsText')} />
        </Field>
      </div>
    </section>
  )
}
