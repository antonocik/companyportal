import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { Avatar, Badge, EmptyState, InfoRow, Modal, Page, useToast } from '../components/ui'
import { roleLabel, roleTone } from '../lib/labels'
import { formatDate } from '../lib/utils'
import type { Department, Presence, User } from '../types'

const departments: Array<'Semua' | Department> = [
  'Semua',
  'Engineering',
  'Product',
  'Design',
  'HR',
  'Finance',
  'Marketing',
  'Operations',
]

const presenceLabel: Record<Presence, string> = {
  online: 'Online',
  sibuk: 'Sibuk',
  offline: 'Offline',
}

const presenceTone: Record<Presence, 'success' | 'warning' | 'secondary'> = {
  online: 'success',
  sibuk: 'warning',
  offline: 'secondary',
}

const tenure = (joinedAt: string) => {
  const joined = new Date(`${joinedAt}T00:00:00`)
  const now = new Date()
  let months =
    (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth())
  if (now.getDate() < joined.getDate()) months -= 1
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (years <= 0) return `${Math.max(0, remainingMonths)} bulan`
  return remainingMonths > 0 ? `${years} tahun ${remainingMonths} bulan` : `${years} tahun`
}

export default function Directory() {
  const { db, isAdmin } = useApp()
  const notify = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryParam = searchParams.get('q') ?? ''

  const [search, setSearch] = useState(queryParam)
  const [department, setDepartment] = useState<'Semua' | Department>('Semua')
  const [sort, setSort] = useState<'nama' | 'departemen'>('nama')
  const [selected, setSelected] = useState<User | null>(null)

  useEffect(() => {
    if (queryParam) setSearch(queryParam)
  }, [queryParam])

  const employees = useMemo(() => {
    const term = search.trim().toLowerCase()
    return db.users
      .filter((user) => user.active)
      .filter((user) => {
        const matchesDepartment = department === 'Semua' || user.department === department
        const matchesTerm =
          !term ||
          user.name.toLowerCase().includes(term) ||
          user.position.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.location.toLowerCase().includes(term)
        return matchesDepartment && matchesTerm
      })
      .sort((a, b) =>
        sort === 'nama'
          ? a.name.localeCompare(b.name)
          : a.department.localeCompare(b.department) || a.name.localeCompare(b.name),
      )
  }, [db.users, department, search, sort])

  const departmentCount = useMemo(() => {
    const counts = new Map<string, number>()
    db.users
      .filter((user) => user.active)
      .forEach((user) => counts.set(user.department, (counts.get(user.department) ?? 0) + 1))
    return counts
  }, [db.users])

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      notify(`Email ${email} disalin ke clipboard.`, 'info')
    } catch {
      notify('Gagal menyalin email. Silakan salin secara manual.', 'danger')
    }
  }

  return (
    <Page
      title="Direktori Karyawan"
      subtitle={`${db.users.filter((user) => user.active).length} karyawan aktif di ${departmentCount.size} departemen`}
      actions={
        isAdmin ? (
          <Link to="/admin" className="btn btn-outline-secondary">
            <i className="bi bi-person-gear me-1" aria-hidden="true" />
            Kelola karyawan
          </Link>
        ) : (
          <a href="mailto:people@nusantara.co.id" className="btn btn-outline-secondary">
            <i className="bi bi-envelope me-1" aria-hidden="true" />
            Hubungi People & Culture
          </a>
        )
      }
    >
      <div className="row g-3 mb-1">
        {Array.from(departmentCount.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(0, 4)
          .map(([name, count], index) => (
            <div className="col-sm-6 col-xl-3" key={name}>
              <div className="card border-0 shadow-sm department-stat h-100">
                <div className="card-body d-flex align-items-center gap-3">
                  <span className={`department-icon dept-tone-${index % 4}`}>
                    <i className="bi bi-diagram-3" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="fs-5 fw-bold lh-1">{count}</div>
                    <div className="small text-secondary">{name}</div>
                  </div>
                  <Badge tone="secondary" className="ms-auto">
                    tim
                  </Badge>
                </div>
              </div>
            </div>
          ))}
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-lg-6">
              <label className="form-label small text-secondary" htmlFor="directory-search">
                Cari karyawan
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" aria-hidden="true" />
                </span>
                <input
                  id="directory-search"
                  type="search"
                  className="form-control"
                  placeholder="Cari nama, jabatan, email, atau lokasi..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <label className="form-label small text-secondary" htmlFor="directory-department">
                Departemen
              </label>
              <select
                id="directory-department"
                className="form-select"
                value={department}
                onChange={(event) =>
                  setDepartment(event.target.value as 'Semua' | Department)
                }
              >
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item === 'Semua' ? 'Semua departemen' : item}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-lg-3">
              <label className="form-label small text-secondary" htmlFor="directory-sort">
                Urutkan
              </label>
              <select
                id="directory-sort"
                className="form-select"
                value={sort}
                onChange={(event) => setSort(event.target.value as 'nama' | 'departemen')}
              >
                <option value="nama">Nama (A–Z)</option>
                <option value="departemen">Departemen</option>
              </select>
            </div>
          </div>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
            <span className="small text-secondary">
              Menampilkan <strong>{employees.length}</strong> karyawan
              {department !== 'Semua' ? ` di departemen ${department}` : ''}
            </span>
            {search || department !== 'Semua' ? (
              <button
                type="button"
                className="btn btn-sm btn-link p-0"
                onClick={() => {
                  setSearch('')
                  setDepartment('Semua')
                  setSearchParams({}, { replace: true })
                }}
              >
                <i className="bi bi-x-circle me-1" aria-hidden="true" />
                Reset filter
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <EmptyState
              icon="bi-people"
              title="Karyawan tidak ditemukan"
              message="Coba gunakan kata kunci lain atau pilih departemen yang berbeda."
            />
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {employees.map((employee) => (
            <div className="col-md-6 col-xl-4" key={employee.id}>
              <article className="card border-0 shadow-sm employee-card h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex align-items-start gap-3">
                    <Avatar
                      name={employee.name}
                      size={56}
                      presence={employee.presence}
                      className="employee-avatar"
                    />
                    <div className="min-w-0 flex-grow-1">
                      <div className="d-flex align-items-center gap-1 flex-wrap">
                        <h3 className="h6 mb-0 text-truncate">{employee.name}</h3>
                        {employee.role === 'admin' ? (
                          <i
                            className="bi bi-patch-check-fill text-primary small"
                            title="Administrator"
                            aria-label="Administrator"
                          />
                        ) : null}
                      </div>
                      <div className="small text-secondary text-truncate">{employee.position}</div>
                      <div className="d-flex flex-wrap gap-1 mt-2">
                        <Badge tone="info">{employee.department}</Badge>
                        <Badge tone={presenceTone[employee.presence]} dot>
                          {presenceLabel[employee.presence]}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="employee-contact mt-3">
                    <button
                      type="button"
                      className="employee-contact-row"
                      onClick={() => copyEmail(employee.email)}
                    >
                      <i className="bi bi-envelope" aria-hidden="true" />
                      <span className="text-truncate">{employee.email}</span>
                      <i className="bi bi-clipboard ms-auto small" aria-hidden="true" />
                    </button>
                    <div className="employee-contact-row">
                      <i className="bi bi-telephone" aria-hidden="true" />
                      <span>{employee.phone}</span>
                    </div>
                    <div className="employee-contact-row">
                      <i className="bi bi-geo-alt" aria-hidden="true" />
                      <span>{employee.location}</span>
                      <span className="ms-auto small text-secondary">
                        Sejak {formatDate(employee.joinedAt, 'short')}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex gap-2 mt-auto pt-3">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary flex-grow-1"
                      onClick={() => setSelected(employee)}
                    >
                      Lihat profil
                    </button>
                    <a
                      href={`mailto:${employee.email}`}
                      className="btn btn-sm btn-outline-secondary"
                      aria-label={`Kirim email ke ${employee.name}`}
                      title="Kirim email"
                    >
                      <i className="bi bi-send" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Profil karyawan"
        icon="bi-person-vcard"
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-light" onClick={() => setSelected(null)}>
              Tutup
            </button>
            {selected ? (
              <a href={`mailto:${selected.email}`} className="btn btn-primary">
                <i className="bi bi-envelope me-1" aria-hidden="true" />
                Kirim email
              </a>
            ) : null}
          </>
        }
      >
        {selected ? (
          <>
            <div className="text-center mb-4">
              <Avatar
                name={selected.name}
                size={88}
                presence={selected.presence}
                className="mx-auto mb-3"
              />
              <h3 className="h4 mb-1">{selected.name}</h3>
              <div className="text-secondary">{selected.position}</div>
              <div className="d-flex justify-content-center flex-wrap gap-2 mt-2">
                <Badge tone={roleTone[selected.role]}>{roleLabel[selected.role]}</Badge>
                <Badge tone="info">{selected.department}</Badge>
                <Badge tone={presenceTone[selected.presence]} dot>
                  {presenceLabel[selected.presence]}
                </Badge>
              </div>
            </div>

            <div className="profile-detail-grid">
              <InfoRow
                icon="bi-envelope"
                label="Email perusahaan"
                value={<a href={`mailto:${selected.email}`}>{selected.email}</a>}
              />
              <InfoRow
                icon="bi-telephone"
                label="Nomor telepon"
                value={
                  <a href={`tel:${selected.phone.replace(/^0/, '+62').replace(/-/g, '')}`}>
                    {selected.phone}
                  </a>
                }
              />
              <InfoRow icon="bi-geo-alt" label="Lokasi kerja" value={selected.location} />
              <InfoRow icon="bi-building" label="Departemen" value={selected.department} />
              <InfoRow icon="bi-briefcase" label="Jabatan" value={selected.position} />
              <InfoRow
                icon="bi-calendar3"
                label="Bergabung"
                value={`${formatDate(selected.joinedAt, 'long')} (${tenure(selected.joinedAt)})`}
              />
              <InfoRow
                icon="bi-calendar2-check"
                label="Kuota cuti tahunan"
                value={`${selected.leaveQuota} hari per tahun`}
              />
              <InfoRow
                icon="bi-shield-check"
                label="Status akun"
                value={selected.active ? 'Aktif' : 'Tidak aktif'}
              />
            </div>

            <div className="alert alert-light border mt-3 mb-0">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-lightbulb text-warning" aria-hidden="true" />
                <span className="small">
                  Untuk urusan mendesak, hubungi rekan kerja melalui email atau telepon yang
                  tertera. Mohon jaga kerahasiaan data internal perusahaan.
                </span>
              </div>
            </div>
          </>
        ) : null}
      </Modal>
    </Page>
  )
}
