/** @jsxImportSource react */
import { useMutation } from '@tanstack/react-query'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { logout } from '../shared/api'
import { useSession } from '../features/session/use-session'
import { queryClient } from './providers'
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../shared/ui'
import { cn } from '../shared/ui/utils'

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const session = useSession()
  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['session'] })
      navigate('/login')
    },
  })

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search])

  const active = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  const sidebarProps = {
    location,
    active,
    sessionEmail: session.data?.email,
    onSignOut: () => signOut.mutate(),
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-[252px] shrink-0 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
          <SidebarContent {...sidebarProps} />
        </aside>
        <main className="min-w-0 flex-1 bg-background">
          <header className="flex items-center gap-3 border-b bg-background px-4 py-3 lg:hidden">
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  type="button"
                  aria-label="Открыть меню"
                />
              }
            >
              ☰
            </SheetTrigger>
            <span className="font-heading text-sm font-semibold">
              Direct Materials
            </span>
          </header>
          <div className="mx-auto w-[calc(100%-2rem)] max-w-[1080px] py-8 sm:w-[calc(100%-4.5rem)] sm:py-12 lg:py-14">
            <Outlet />
          </div>
        </main>
      </div>
      <SheetContent side="left" className="w-[252px] px-4 py-6 lg:hidden">
        <SheetHeader className="p-0 pb-8">
          <SheetTitle className="sr-only">Основная навигация</SheetTitle>
          <SheetDescription className="sr-only">
            Навигация по рабочему пространству Direct Materials.
          </SheetDescription>
        </SheetHeader>
        <SidebarContent {...sidebarProps} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

function SidebarContent(props: {
  location: ReturnType<typeof useLocation>
  active: (path: string) => boolean
  sessionEmail?: string | null
  onSignOut: () => void
  onNavigate?: () => void
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-3 pb-8 tracking-tight">
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-[11px] font-extrabold tracking-[-0.08em] text-primary-foreground">
          DM
        </span>
        <b className="text-sm font-semibold">Direct Materials</b>
      </div>
      <nav className="grid gap-1.5" aria-label="Основная навигация">
        <NavItem
          to="/admin"
          active={props.location.pathname === '/admin'}
          icon="⌂"
          onNavigate={props.onNavigate}
        >
          Обзор
        </NavItem>
        <NavItem
          to="/admin/campaigns/new"
          active={props.location.pathname === '/admin/campaigns/new'}
          icon="＋"
          onNavigate={props.onNavigate}
        >
          Новая кампания
        </NavItem>
        <NavItem
          to="/admin/history"
          active={props.active('/admin/history')}
          icon="◷"
          onNavigate={props.onNavigate}
        >
          История
        </NavItem>
      </nav>
      <div className="mt-auto grid gap-4">
        <Link
          to="/privacy"
          onClick={props.onNavigate}
          className="px-3 text-[11px] text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
        >
          Конфиденциальность
        </Link>
        <div className="flex items-center gap-2 border-t border-sidebar-border px-2 pt-3">
          <span className="grid size-7 place-items-center rounded-full bg-primary/20 text-xs font-extrabold text-sidebar-primary">
            {(props.sessionEmail ?? 'A').slice(0, 1).toUpperCase()}
          </span>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <strong className="truncate text-[11px] font-semibold text-sidebar-foreground">
              {props.sessionEmail ?? 'Владелец'}
            </strong>
            <span className="text-[10px] text-sidebar-foreground/60">
              Владелец
            </span>
          </div>
          <Button
            className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => {
              props.onNavigate?.()
              props.onSignOut()
            }}
            title="Выйти"
            aria-label="Выйти"
          >
            ↪
          </Button>
        </div>
      </div>
    </>
  )
}

function NavItem(props: {
  to: string
  active: boolean
  icon: string
  children: string
  onNavigate?: () => void
}) {
  return (
    <Link
      className={cn(
        'flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        props.active &&
          'bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_var(--sidebar-primary)]',
      )}
      to={props.to}
      onClick={props.onNavigate}
    >
      <span className="w-[17px] text-center text-lg leading-none text-sidebar-foreground/60">
        {props.icon}
      </span>
      {props.children}
    </Link>
  )
}
