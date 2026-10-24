/** @jsxImportSource react */
import { Link, useLocation } from 'react-router-dom'
import { LoginForm } from '../features/session/login-form'
import { safeLoginNext } from '../shared/navigation'

export function LoginPage() {
  const location = useLocation()
  const next = safeLoginNext(new URLSearchParams(location.search).get('next'))
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background"
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-2.5 tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-[11px] font-extrabold tracking-[-0.08em] text-primary-foreground">
            DM
          </span>
          <b className="text-sm font-semibold">Direct Materials</b>
        </div>
        <div className="mt-10 grid gap-2">
          <h1 className="font-heading text-3xl leading-tight font-semibold tracking-[-0.05em]">
            С возвращением
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Войдите, чтобы управлять автоматическими ответами.
          </p>
        </div>
        <LoginForm next={next} />
        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link to="/privacy">Конфиденциальность</Link>
          <span>·</span>
          <Link to="/data-deletion">Удаление данных</Link>
        </div>
      </div>
    </main>
  )
}
