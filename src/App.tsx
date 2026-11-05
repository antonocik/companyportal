import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import Layout from './components/Layout'
import { useApp } from './store/AppStore'
import { EmptyState, Page } from './components/ui'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Announcements from './pages/Announcements'
import Directory from './pages/Directory'
import Documents from './pages/Documents'
import Leave from './pages/Leave'
import Tickets from './pages/Tickets'
import Admin from './pages/Admin'
import Profile from './pages/Profile'

function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser } = useApp()
  const location = useLocation()
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { currentUser } = useApp()
  if (currentUser?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

function NotFound() {
  return (
    <Page title="Halaman tidak ditemukan">
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <EmptyState
            icon="bi-compass"
            title="Halaman tidak ditemukan"
            message="Tautan yang Anda buka tidak tersedia atau telah dipindahkan."
            action={
              <a href="/" className="btn btn-primary">
                Kembali ke dashboard
              </a>
            }
          />
        </div>
      </div>
    </Page>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="/pengumuman" element={<Announcements />} />
          <Route path="/direktori" element={<Directory />} />
          <Route path="/dokumen" element={<Documents />} />
          <Route path="/cuti" element={<Leave />} />
          <Route path="/tiket" element={<Tickets />} />
          <Route
            path="/admin"
            element={
              <AdminOnly>
                <Admin />
              </AdminOnly>
            }
          />
          <Route path="/profil" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
