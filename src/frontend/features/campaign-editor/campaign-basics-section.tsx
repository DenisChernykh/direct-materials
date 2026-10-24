/** @jsxImportSource react */
import type { UseFormReturn } from 'react-hook-form'
import { mediaLabel, type CampaignFormValues } from '../../entities/campaign'
import type { Media } from '../../shared/api'
import { Field, Input, Textarea } from '../../shared/ui'

export function CampaignBasicsSection(props: {
  form: UseFormReturn<CampaignFormValues>
  media: Media[]
}) {
  const values = props.form.watch()
  const errors = props.form.formState.errors
  return (
    <section className="grid gap-6 rounded-xl border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
      <div className="grid gap-1.5">
        <h2 className="font-heading text-base font-semibold">Основное</h2>
        <p className="text-sm text-muted-foreground">
          Правило, по которому комментарий запускает сценарий.
        </p>
      </div>
      <div className="grid gap-5">
        <Field
          id="campaign-name"
          label="Название кампании"
          error={errors.name?.message}
        >
          <Input autoComplete="off" {...props.form.register('name')} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="campaign-trigger-mode"
            label="Режим публикации"
            error={errors.triggerMode?.message}
          >
            <select
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              {...props.form.register('triggerMode')}
            >
              <option value="specific">Конкретная публикация</option>
              <option value="any">Любая публикация</option>
              <option value="next">Следующая публикация</option>
            </select>
          </Field>
          <Field
            id="campaign-match-mode"
            label="Правило совпадения"
            error={errors.matchMode?.message}
          >
            <select
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              {...props.form.register('matchMode')}
            >
              <option value="contains">Содержит слово или фразу</option>
              <option value="exact">Точный комментарий</option>
            </select>
          </Field>
        </div>
        <Field
          id="campaign-media-id"
          label="ID публикации или Reel"
          hint={
            values.triggerMode === 'specific'
              ? 'Обязательно для конкретной публикации.'
              : 'Поле не используется в этом режиме.'
          }
          error={errors.mediaId?.message}
        >
          <Input
            list="instagram-media"
            disabled={values.triggerMode !== 'specific'}
            {...props.form.register('mediaId')}
          />
        </Field>
        <datalist id="instagram-media">
          {props.media.map((media) => (
            <option value={media.id} key={media.id}>
              {mediaLabel(media)}
            </option>
          ))}
        </datalist>
        <Field
          id="campaign-keywords"
          label="Ключевые слова"
          hint="По одному слову или фразе на строку."
          error={errors.keywordsText?.message}
        >
          <Textarea rows={5} {...props.form.register('keywordsText')} />
        </Field>
      </div>
    </section>
  )
}
