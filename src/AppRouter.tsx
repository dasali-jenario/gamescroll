import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import App from './App'

const CreatePage = lazy(() =>
  import('./pages/CreatePage').then((m) => ({ default: m.CreatePage })),
)
const ModPage = lazy(() =>
  import('./pages/ModPage').then((m) => ({ default: m.ModPage })),
)

function RouteFallback() {
  return (
    <div className="route-loading" role="status">
      Loading…
    </div>
  )
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>
}

/** Old share links were minted as /create?g=slug — send them to the feed. */
function CreateRoute() {
  const { search } = useLocation()
  const shared = new URLSearchParams(search).get('g')
  if (shared?.trim()) {
    return <Navigate to={`/?g=${encodeURIComponent(shared.trim())}`} replace />
  }
  return (
    <LazyRoute>
      <CreatePage />
    </LazyRoute>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/create" element={<CreateRoute />} />
        <Route
          path="/mod"
          element={
            <LazyRoute>
              <ModPage />
            </LazyRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
