import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
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

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="/create"
          element={
            <LazyRoute>
              <CreatePage />
            </LazyRoute>
          }
        />
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
