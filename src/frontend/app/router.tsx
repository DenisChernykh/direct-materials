/** @jsxImportSource react */
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { useSession } from '../features/session/use-session'
import { AppShell } from './shell'
import { CampaignEditor } from '../pages/campaign-editor'
import { DashboardPage } from '../pages/dashboard'
import { HistoryPage } from '../pages/history'
import { LoginPage } from '../pages/login'
import { PublicInfoPage } from '../pages/public-info'
import { ScreenState } from '../shared/ui'

function RequireAuth() {
  const session = useSession()
  const location = useLocation()
  if (session.isPending) return <ScreenState label="Проверяем доступ…" />
  if (session.isError || !session.data?.authenticated)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
        replace
      />
    )
  return <Outlet />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy" element={<PublicInfoPage kind="privacy" />} />
      <Route
        path="/data-deletion"
        element={<PublicInfoPage kind="deletion" />}
      />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/campaigns/new" element={<CampaignEditor />} />
          <Route path="/admin/campaigns/:id" element={<CampaignEditor />} />
          <Route path="/admin/history" element={<HistoryPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export function Router() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
