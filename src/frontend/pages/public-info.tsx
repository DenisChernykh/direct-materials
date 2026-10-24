/** @jsxImportSource react */
import { Link } from 'react-router-dom'

export function PublicInfoPage({ kind }: { kind: 'privacy' | 'deletion' }) {
  const deletion = kind === 'deletion'
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-12">
      <header className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <Link className="flex items-center gap-2.5 tracking-tight" to="/login">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-[11px] font-extrabold tracking-[-0.08em] text-primary-foreground">
            DM
          </span>
          <b className="text-sm font-semibold">Direct Materials</b>
        </Link>
        <Link
          className="text-sm font-semibold text-primary hover:underline"
          to="/login"
        >
          Войти →
        </Link>
      </header>
      <article className="mx-auto mt-12 max-w-2xl rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-10">
        <span className="text-[10px] font-extrabold tracking-[0.14em] text-muted-foreground uppercase">
          Direct Materials
        </span>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em]">
          {deletion ? 'Удаление данных' : 'Конфиденциальность'}
        </h1>
        {deletion ? (
          <>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Чтобы удалить данные, связанные с подключённым Instagram, напишите
              владельцу сервиса с адреса Cloudflare Access, указав username
              аккаунта.
            </p>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              История доставок автоматически удаляется через 30 дней. Кампании и
              подключение Instagram сохраняются, пока вы не попросите удалить их
              отдельно.
            </p>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              После проверки запроса удаляются сохранённые данные подключения и
              связанные с ним доставки.
            </p>
          </>
        ) : (
          <>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Direct Materials получает комментарии Instagram через webhook и
              отправляет подготовленные ответы в Direct пользователям, которые
              подходят под правила кампании.
            </p>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Мы храним только настройки кампаний, зашифрованный токен
              подключения и техническую историю доставок. Тексты комментариев и
              ответы не используются для рекламы.
            </p>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              История доставок хранится не дольше 30 дней. Доступ к панели
              защищён Cloudflare Access и сессионной cookie.
            </p>
          </>
        )}
        <p className="mt-8 border-t pt-6 text-sm">
          <Link
            className="font-semibold text-primary hover:underline"
            to="/login"
          >
            Вернуться ко входу →
          </Link>
        </p>
      </article>
    </main>
  )
}
