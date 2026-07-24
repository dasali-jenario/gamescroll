import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import App from './App'
import { CreatePage } from './pages/CreatePage'
import { ModPage } from './pages/ModPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/mod" element={<ModPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
