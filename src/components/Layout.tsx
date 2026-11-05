import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { Avatar, Badge, Dropdown, useToast } from './ui'
import { roleLabel, roleTone } from '../lib/labels'
import { classNames, dateISO, formatDate, timeAgo } from '../lib/utils'

interface NavItem {
  to: string
  label: string
  icon: string
  end?: boolean
  badge?: number
  badgeTone?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

function GlobalSearch() {
  const { db } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const term = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (term.length < 2) return { users: [], documents: [], announcements: [] }
    return {
      users: db.users
        .filter(
          (user) =>
            user.active &&
            (user.name.toLowerCase().includes(term) ||
              user.position.toLowerCase().includes(term) ||
              user.department.toLowerCase().includes(term)),
        )
        .slice(0, 3),
      documents: db.documents
        .filter(
          (document) =>
            document.name.toLowerCase().includes(term) ||
            document.category.toLowerCase().includes(term),
        )
        .slice(0, 3),
      announcements: db.announcements
        .filter(
          (announcement) =>
            announcement.title.toLowerCase().includes(term) ||
            announcement.body.toLowerCase().includes(term),
        )
        .slice(0, 3),
    }
  }, [db, term])

  const total =
    results.users.length + results.documents.length + results.announcements.length

  const go = (path: string) => {
    navigate(path)
    setOpen(false)
    setQuery('')
  }

  const submit = () => {
    if (!query.trim()) return
    go(`/direktori?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="global-search position-relative" ref={containerRef}>
      <form
        className="navbar-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="navbar-search-field">
          <input
            type="search"
            className="form-control"
            placeholder="Cari karyawan, dokumen, pengumuman..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false)
            }}
            aria-label="Pencarian global"
            autoComplete="off"
          />
          <button className="navbar-search-submit" type="submit" aria-label="Cari">
            <i className="bi bi-search" aria-hidden="true" />
          </button>
        </div>
      </form>

      {open && term.length >= 2 ? (
        <div className="dropdown-menu show global-search-menu">
          {total === 0 ? (
            <div className="px-3 py-4 text-center text-secondary small">
              <i className="bi bi-search d-block fs-4 mb-2" aria-hidden="true" />
              Tidak ada hasil untuk “{query.trim()}”.
            </div>
          ) : (
            <>
              {results.users.length > 0 ? (
                <div className="search-group">
                  <div className="search-group-title">Karyawan</div>
                  {results.users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="search-result"
                      onClick={() => go(`/direktori?q=${encodeURIComponent(user.name)}`)}
                    >
                      <Avatar name={user.name} size={30} />
                      <span className="min-w-0">
                        <span className="d-block text-truncate fw-medium">{user.name}</span>
                        <span className="d-block small text-secondary text-truncate">
                          {user.position} · {user.department}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {results.documents.length > 0 ? (
                <div className="search-group">
                  <div className="search-group-title">Dokumen</div>
                  {results.documents.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      className="search-result"
                      onClick={() => go(`/dokumen?q=${encodeURIComponent(document.name)}`)}
                    >
                      <span className="search-result-icon">
                        <i className="bi bi-file-earmark-text" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="d-block text-truncate fw-medium">{document.name}</span>
                        <span className="d-block small text-secondary">
                          {document.category} · {document.fileType}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {results.announcements.length > 0 ? (
                <div className="search-group">
                  <div className="search-group-title">Pengumuman</div>
                  {results.announcements.map((announcement) => (
                    <button
                      key={announcement.id}
                      type="button"
                      className="search-result"
                      onClick={() =>
                        go(`/pengumuman?q=${encodeURIComponent(announcement.title)}`)
                      }
                    >
                      <span className="search-result-icon">
                        <i className="bi bi-megaphone" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="d-block text-truncate fw-medium">
                          {announcement.title}
                        </span>
                        <span className="d-block small text-secondary">
                          {announcement.category} · {formatDate(announcement.createdAt.slice(0, 10))}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="search-footer">
                <span className="small text-secondary">Tekan Enter untuk melihat semua hasil</span>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function Layout() {
  const { currentUser, isAdmin, db, logout, markAllAnnouncementsRead } = useApp()
  const notify = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.getItem('nusantara-theme') === 'dark' ? 'dark' : 'light',
  )

  useEffect(() => {
    const bodyClasses = ['layout-fixed', 'sidebar-expand-lg', 'bg-body-tertiary']
    document.body.classList.add(...bodyClasses)
    return () => document.body.classList.remove(...bodyClasses)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme)
    localStorage.setItem('nusantara-theme', theme)
  }, [theme])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', mobileOpen)
    return () => document.body.classList.remove('sidebar-open')
  }, [mobileOpen])

  const user = currentUser
  const unreadAnnouncements = user
    ? db.announcements.filter((announcement) => !announcement.readBy.includes(user.id))
    : []
  const pendingLeaves = db.leaves.filter((leave) => leave.status === 'menunggu')
  const myPendingLeaves = user
    ? pendingLeaves.filter((leave) => leave.userId === user.id)
    : []
  const openTickets = user
    ? db.tickets.filter(
        (ticket) =>
          ticket.status !== 'selesai' &&
          (isAdmin || ticket.requesterId === user.id || ticket.assigneeId === user.id),
      )
    : []
  const today = dateISO()
  const myAttendance = user
    ? db.attendance.find((record) => record.userId === user.id && record.date === today)
    : undefined

  const notifications = useMemo(() => {
    const items: Array<{
      id: string
      icon: string
      tone: string
      title: string
      detail: string
      time: string
      to: string
    }> = []

    unreadAnnouncements.slice(0, 3).forEach((announcement) => {
      items.push({
        id: announcement.id,
        icon: 'bi-megaphone-fill',
        tone: 'primary',
        title: announcement.title,
        detail: `Pengumuman ${announcement.category} belum dibaca`,
        time: timeAgo(announcement.createdAt),
        to: `/pengumuman?q=${encodeURIComponent(announcement.title)}`,
      })
    })

    if (isAdmin) {
      pendingLeaves.slice(0, 3).forEach((leave) => {
        const employee = db.users.find((item) => item.id === leave.userId)
        items.push({
          id: leave.id,
          icon: 'bi-calendar2-check-fill',
          tone: 'warning',
          title: `Pengajuan ${leave.type.toLowerCase()} menunggu persetujuan`,
          detail: `${employee?.name ?? 'Karyawan'} · ${leave.days} hari`,
          time: timeAgo(leave.createdAt),
          to: '/cuti',
        })
      })
    }

    openTickets.slice(0, 3).forEach((ticket) => {
      items.push({
        id: ticket.id,
        icon: 'bi-headset',
        tone: ticket.status === 'terbuka' ? 'danger' : 'info',
        title: ticket.subject,
        detail: `${ticket.id} · ${ticket.status === 'terbuka' ? 'Terbuka' : 'Sedang diproses'}`,
        time: timeAgo(ticket.updatedAt),
        to: `/tiket?q=${encodeURIComponent(ticket.id)}`,
      })
    })

    return items.slice(0, 6)
  }, [db.users, isAdmin, openTickets, pendingLeaves, unreadAnnouncements])

  if (!currentUser) return null

  const navSections: NavSection[] = [
    {
      title: 'Utama',
      items: [
        { to: '/', label: 'Dashboard', icon: 'bi-grid-1x2-fill', end: true },
        {
          to: '/pengumuman',
          label: 'Pengumuman',
          icon: 'bi-megaphone-fill',
          badge: unreadAnnouncements.length,
          badgeTone: 'primary',
        },
      ],
    },
    {
      title: 'Karyawan',
      items: [
        { to: '/direktori', label: 'Direktori', icon: 'bi-people-fill' },
        { to: '/dokumen', label: 'Dokumen', icon: 'bi-folder-fill' },
      ],
    },
    {
      title: 'Layanan',
      items: [
        {
          to: '/cuti',
          label: 'Cuti & Absensi',
          icon: 'bi-calendar2-check-fill',
          badge: isAdmin ? pendingLeaves.length : myPendingLeaves.length,
          badgeTone: 'warning',
        },
        {
          to: '/tiket',
          label: 'Tiket IT',
          icon: 'bi-headset',
          badge: openTickets.length,
          badgeTone: 'danger',
        },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: 'Administrasi',
            items: [{ to: '/admin', label: 'Manajemen Karyawan', icon: 'bi-person-gear' }],
          },
        ]
      : []),
    {
      title: 'Akun',
      items: [{ to: '/profil', label: 'Profil Saya', icon: 'bi-person-circle' }],
    },
  ]

  const notificationCount = unreadAnnouncements.length + (isAdmin ? pendingLeaves.length : 0)
  const initial = currentUser.name.split(' ')[0]

  return (
    <div className="app-wrapper">
      <nav className="app-header navbar navbar-expand bg-body border-bottom">
        <div className="container-fluid">
          <ul className="navbar-nav align-items-center">
            <li className="nav-item d-lg-none">
              <button
                type="button"
                className="nav-link btn btn-link"
                aria-label="Buka menu navigasi"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((previous) => !previous)}
              >
                <i className="bi bi-list fs-5" aria-hidden="true" />
              </button>
            </li>
            <li className="nav-item d-none d-md-flex align-items-center">
              <GlobalSearch />
            </li>
            <li className="nav-item d-md-none">
              <Link to="/direktori" className="nav-link" aria-label="Cari karyawan">
                <i className="bi bi-search" aria-hidden="true" />
              </Link>
            </li>
          </ul>

          <ul className="navbar-nav ms-auto align-items-center flex-row">
            <li className="nav-item d-none d-xl-block me-2">
              <span className="text-secondary small">
                <i className="bi bi-calendar3 me-1" aria-hidden="true" />
                {formatDate(today, 'long')}
              </span>
            </li>

            <li className="nav-item">
              <Dropdown
                label="Aksi cepat"
                trigger={
                  <>
                    <i className="bi bi-plus-circle" aria-hidden="true" />
                    <span className="d-none d-sm-inline ms-1">Baru</span>
                  </>
                }
                menuClassName="dropdown-menu-sm shadow"
              >
                <h6 className="dropdown-header">Aksi cepat</h6>
                <Link className="dropdown-item" to="/cuti?baru=1">
                  <i className="bi bi-calendar2-plus me-2 text-primary" aria-hidden="true" />
                  Ajukan cuti
                </Link>
                <Link className="dropdown-item" to="/tiket?baru=1">
                  <i className="bi bi-headset me-2 text-info" aria-hidden="true" />
                  Buat tiket IT
                </Link>
                {isAdmin ? (
                  <>
                    <div className="dropdown-divider" />
                    <Link className="dropdown-item" to="/pengumuman?baru=1">
                      <i className="bi bi-megaphone me-2 text-warning" aria-hidden="true" />
                      Buat pengumuman
                    </Link>
                    <Link className="dropdown-item" to="/admin?baru=1">
                      <i className="bi bi-person-plus me-2 text-success" aria-hidden="true" />
                      Tambah karyawan
                    </Link>
                  </>
                ) : null}
              </Dropdown>
            </li>

            <li className="nav-item">
              <button
                type="button"
                className="nav-link btn btn-link"
                onClick={() => setTheme((previous) => (previous === 'light' ? 'dark' : 'light'))}
                aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
                title={theme === 'light' ? 'Mode gelap' : 'Mode terang'}
              >
                <i
                  className={`bi ${theme === 'light' ? 'bi-moon-stars' : 'bi-sun'}`}
                  aria-hidden="true"
                />
              </button>
            </li>

            <li className="nav-item">
              <Dropdown
                label={`Notifikasi: ${notificationCount} belum dibaca`}
                trigger={
                  <>
                    <i className="bi bi-bell" aria-hidden="true" />
                    {notificationCount > 0 ? (
                      <span className="navbar-badge badge text-bg-danger">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    ) : null}
                  </>
                }
                menuClassName="dropdown-menu-lg shadow"
              >
                <div className="dropdown-header d-flex justify-content-between align-items-center">
                  <span>Notifikasi</span>
                  <Badge tone="primary">{notificationCount} baru</Badge>
                </div>
                <div className="dropdown-divider mt-0" />
                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div className="text-center text-secondary small py-4">
                      <i className="bi bi-bell-slash d-block fs-4 mb-2" aria-hidden="true" />
                      Tidak ada notifikasi baru
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <Link key={item.id} to={item.to} className="notification-item">
                        <span className={`notification-icon text-bg-${item.tone}`}>
                          <i className={`bi ${item.icon}`} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="d-block fw-medium text-truncate">{item.title}</span>
                          <span className="d-block small text-secondary">{item.detail}</span>
                          <span className="d-block small text-secondary opacity-75">
                            {item.time}
                          </span>
                        </span>
                      </Link>
                    ))
                  )}
                </div>
                {unreadAnnouncements.length > 0 ? (
                  <>
                    <div className="dropdown-divider" />
                    <button
                      type="button"
                      className="dropdown-item text-center small"
                      onClick={() => {
                        markAllAnnouncementsRead()
                        notify('Semua pengumuman ditandai sudah dibaca.')
                      }}
                    >
                      Tandai semua pengumuman dibaca
                    </button>
                  </>
                ) : null}
              </Dropdown>
            </li>

            <li className="nav-item">
              <Dropdown
                label="Menu pengguna"
                trigger={
                  <span className="d-flex align-items-center gap-2">
                    <Avatar name={currentUser.name} size={30} />
                    <span className="d-none d-md-inline">
                      <span className="d-block lh-1 small fw-semibold">{initial}</span>
                      <span className="d-block lh-1 text-secondary user-role-label">
                        {isAdmin ? 'Admin' : 'Karyawan'}
                      </span>
                    </span>
                    <i className="bi bi-chevron-down small d-none d-md-inline" aria-hidden="true" />
                  </span>
                }
                menuClassName="dropdown-menu-lg shadow user-dropdown"
              >
                <div className="px-3 py-3 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <Avatar name={currentUser.name} size={44} presence={currentUser.presence} />
                    <div className="min-w-0">
                      <div className="fw-semibold text-truncate">{currentUser.name}</div>
                      <div className="small text-secondary text-truncate">{currentUser.email}</div>
                    </div>
                  </div>
                  <div className="d-flex gap-1 mt-2 flex-wrap">
                    <Badge tone={roleTone[currentUser.role]}>{roleLabel[currentUser.role]}</Badge>
                    <Badge tone="info">{currentUser.department}</Badge>
                  </div>
                </div>
                <Link className="dropdown-item" to="/profil">
                  <i className="bi bi-person me-2" aria-hidden="true" />
                  Profil saya
                </Link>
                <Link className="dropdown-item" to="/cuti">
                  <i className="bi bi-calendar2-check me-2" aria-hidden="true" />
                  Cuti & absensi
                </Link>
                <Link className="dropdown-item" to="/tiket">
                  <i className="bi bi-headset me-2" aria-hidden="true" />
                  Tiket IT saya
                </Link>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item text-danger"
                  onClick={() => {
                    logout()
                    notify('Anda telah keluar dari portal.', 'info')
                    navigate('/login')
                  }}
                >
                  <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
                  Keluar
                </button>
              </Dropdown>
            </li>
          </ul>
        </div>
      </nav>

      <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
        <div className="sidebar-brand">
          <Link to="/" className="brand-link">
            <span className="brand-logo">
              <i className="bi bi-buildings" aria-hidden="true" />
            </span>
            <span className="brand-text">
              <span className="d-block fw-bold lh-1">Nusantara</span>
              <span className="d-block brand-subtitle">COMPANY PORTAL</span>
            </span>
          </Link>
        </div>

        <div className="sidebar-user">
          <Avatar name={currentUser.name} size={40} presence={currentUser.presence} />
          <div className="min-w-0 flex-grow-1">
            <div className="fw-semibold text-truncate">{currentUser.name}</div>
            <div className="small text-secondary text-truncate">{currentUser.position}</div>
          </div>
          <Link to="/profil" className="sidebar-user-action" aria-label="Buka profil">
            <i className="bi bi-gear" aria-hidden="true" />
          </Link>
        </div>

        <div className="sidebar-wrapper">
          <nav aria-label="Navigasi utama">
            <ul className="nav sidebar-menu flex-column" role="list">
              {navSections.map((section) => (
                <li key={section.title} className="nav-section">
                  <div className="nav-header">{section.title}</div>
                  {section.items.map((item) => (
                    <div key={item.to} className="nav-item">
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          classNames('nav-link', isActive && 'active')
                        }
                      >
                        <i className={`nav-icon bi ${item.icon}`} aria-hidden="true" />
                        <p className="mb-0">
                          {item.label}
                          {item.badge ? (
                            <span
                              className={`nav-badge badge rounded-pill text-bg-${item.badgeTone ?? 'secondary'}`}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </p>
                      </NavLink>
                    </div>
                  ))}
                </li>
              ))}
            </ul>

            <div className="sidebar-help-wrap">
              <div className="sidebar-help">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <i className="bi bi-life-preserver" aria-hidden="true" />
                  <span className="fw-semibold small">Butuh bantuan?</span>
                </div>
                <p className="small text-secondary mb-2">
                  Tim IT siap membantu kendala perangkat dan akses Anda.
                </p>
                <Link to="/tiket?baru=1" className="btn btn-sm btn-light w-100">
                  <i className="bi bi-plus-lg me-1" aria-hidden="true" />
                  Buat tiket
                </Link>
              </div>
              <div className="sidebar-version">
                <span>Nusantara Portal v1.0</span>
                <span className="d-flex align-items-center gap-1">
                  <span className="status-dot" /> Sistem normal
                </span>
              </div>
            </div>
          </nav>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="sidebar-overlay d-lg-none"
          aria-label="Tutup menu navigasi"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="container-fluid d-flex flex-wrap justify-content-between gap-2 py-2">
          <span>
            © {new Date().getFullYear()} <strong>PT Nusantara Digital</strong>. Internal use only.
          </span>
          <span className="d-flex align-items-center gap-3">
            <span>
              <i className="bi bi-shield-check me-1" aria-hidden="true" />
              Data terlindungi
            </span>
            <span className="d-none d-sm-inline">
              <i className="bi bi-clock-history me-1" aria-hidden="true" />
              {myAttendance?.clockIn ? `Absen masuk ${myAttendance.clockIn}` : 'Belum absen hari ini'}
            </span>
          </span>
        </div>
      </footer>
    </div>
  )
}
