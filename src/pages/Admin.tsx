import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import {
  Avatar,
  Badge,
  ConfirmDialog,
  EmptyState,
  Modal,
  Page,
  useToast,
} from '../components/ui'
import { roleLabel, roleTone } from '../lib/labels'
import { dateISO, formatDate } from '../lib/utils'
import type { Department, Role, User } from '../types'

const departments: Department[] = [
  'Engineering',
  'Product',
  'Design',
  'HR',
  'Finance',
  'Marketing',
  'Operations',
]

const presenceLabel = {
  online: 'Online',
  sibuk: 'Sibuk',
  offline: 'Offline',
} as const

interface UserForm {
  name: string
  email: string
  password: string
  role: Role
  department: Department
  position: string
  phone: string
  location: string
  joinedAt: string
}

const emptyForm: UserForm = {
  name: '',
  email: '',
  password: 'karyawan123',
  role: 'karyawan',
  department: 'Engineering',
  position: '',
  phone: '',
  location: 'Jakarta',
  joinedAt: dateISO(),
}

export default function Admin() {
  const { db, currentUser, addUser, updateUser } = useApp()
  const notify = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState<'Semua' | Department>('Semua')
  const [role, setRole] = useState<'Semua' | Role>('Semua')
  const [status, setStatus] = useState<'semua' | 'aktif' | 'nonaktif'>('semua')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)

  useEffect(() => {
    if (searchParams.get('baru') === '1') {
      openAdd()
      const next = new URLSearchParams(searchParams)
      next.delete('baru')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (employee: User) => {
    setEditing(employee)
    setForm({
      name: employee.name,
      email: employee.email,
      password: '',
      role: employee.role,
      department: employee.department,
      position: employee.position,
      phone: employee.phone,
      location: employee.location,
      joinedAt: employee.joinedAt,
    })
    setFormError(null)
    setFormOpen(true)
  }

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return [...db.users]
      .filter((employee) => {
        const matchesDepartment = department === 'Semua' || employee.department === department
        const matchesRole = role === 'Semua' || employee.role === role
        const matchesStatus =
          status === 'semua' || (status === 'aktif' ? employee.active : !employee.active)
        const matchesTerm =
          !term ||
          employee.name.toLowerCase().includes(term) ||
          employee.email.toLowerCase().includes(term) ||
          employee.position.toLowerCase().includes(term)
        return matchesDepartment && matchesRole && matchesStatus && matchesTerm
      })
      .sort(
        (a, b) =>
          Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
      )
  }, [db.users, department, role, search, status])

  const activeCount = db.users.filter((employee) => employee.active).length
  const adminCount = db.users.filter((employee) => employee.role === 'admin').length
  const inactiveCount = db.users.length - activeCount
  const monthPrefix = dateISO().slice(0, 7)
  const newThisMonth = db.users.filter((employee) =>
    employee.joinedAt.startsWith(monthPrefix),
  ).length

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (form.name.trim().length < 2) {
      setFormError('Nama lengkap wajib diisi.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('Format email tidak valid.')
      return
    }
    if (!form.position.trim()) {
      setFormError('Jabatan wajib diisi.')
      return
    }
    if (!form.phone.trim()) {
      setFormError('Nomor telepon wajib diisi.')
      return
    }
    if (!editing && form.password.length < 6) {
      setFormError('Kata sandi minimal 6 karakter.')
      return
    }
    if (editing && form.password && form.password.length < 6) {
      setFormError('Kata sandi baru minimal 6 karakter.')
      return
    }
    if (
      editing &&
      editing.id === currentUser?.id &&
      form.role !== editing.role
    ) {
      setFormError('Anda tidak dapat mengubah role akun sendiri untuk mencegah kehilangan akses.')
      return
    }

    if (editing) {
      const patch: Partial<User> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department,
        position: form.position.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        joinedAt: form.joinedAt,
      }
      if (form.password) patch.password = form.password
      const result = updateUser(editing.id, patch)
      if (!result.ok) {
        setFormError(result.error ?? 'Perubahan gagal disimpan.')
        return
      }
      notify('Data karyawan berhasil diperbarui.')
    } else {
      const result = addUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        department: form.department,
        position: form.position.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        joinedAt: form.joinedAt,
      })
      if (!result.ok) {
        setFormError(result.error ?? 'Karyawan gagal ditambahkan.')
        return
      }
      notify('Karyawan baru berhasil ditambahkan ke portal.')
    }
    setFormOpen(false)
  }

  const handleToggleActive = (employee: User) => {
    if (employee.id === currentUser?.id) {
      notify('Anda tidak dapat menonaktifkan akun sendiri.', 'warning')
      return
    }
    if (employee.active) {
      setDeactivateTarget(employee)
      return
    }
    updateUser(employee.id, { active: true })
    notify(`Akun ${employee.name} diaktifkan kembali.`)
  }

  return (
    <Page
      title="Manajemen Karyawan"
      subtitle="Kelola akun, role, dan status keanggotaan karyawan di portal"
      actions={
        <button type="button" className="btn btn-primary" onClick={openAdd}>
          <i className="bi bi-person-plus me-1" aria-hidden="true" />
          Tambah karyawan
        </button>
      }
    >
      <div className="row g-2 mb-1">
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <span className="admin-stat-icon text-bg-primary">
                <i className="bi bi-people-fill" aria-hidden="true" />
              </span>
              <div>
                <div className="fs-4 fw-bold lh-1">{activeCount}</div>
                <div className="small text-secondary">Karyawan aktif</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <span className="admin-stat-icon text-bg-info">
                <i className="bi bi-shield-check" aria-hidden="true" />
              </span>
              <div>
                <div className="fs-4 fw-bold lh-1">{adminCount}</div>
                <div className="small text-secondary">Administrator</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <span className="admin-stat-icon text-bg-secondary">
                <i className="bi bi-person-dash" aria-hidden="true" />
              </span>
              <div>
                <div className="fs-4 fw-bold lh-1">{inactiveCount}</div>
                <div className="small text-secondary">Akun nonaktif</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <span className="admin-stat-icon text-bg-success">
                <i className="bi bi-person-plus" aria-hidden="true" />
              </span>
              <div>
                <div className="fs-4 fw-bold lh-1">{newThisMonth}</div>
                <div className="small text-secondary">Baru bulan ini</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-lg-4">
              <label className="form-label small text-secondary" htmlFor="admin-search">
                Cari karyawan
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" aria-hidden="true" />
                </span>
                <input
                  id="admin-search"
                  type="search"
                  className="form-control"
                  placeholder="Cari nama, email, atau jabatan..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            <div className="col-sm-4 col-lg-2">
              <label className="form-label small text-secondary" htmlFor="admin-department">
                Departemen
              </label>
              <select
                id="admin-department"
                className="form-select"
                value={department}
                onChange={(event) =>
                  setDepartment(event.target.value as 'Semua' | Department)
                }
              >
                <option value="Semua">Semua</option>
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-4 col-lg-2">
              <label className="form-label small text-secondary" htmlFor="admin-role">
                Role
              </label>
              <select
                id="admin-role"
                className="form-select"
                value={role}
                onChange={(event) => setRole(event.target.value as 'Semua' | Role)}
              >
                <option value="Semua">Semua</option>
                <option value="admin">Administrator</option>
                <option value="karyawan">Karyawan</option>
              </select>
            </div>
            <div className="col-sm-4 col-lg-2">
              <label className="form-label small text-secondary" htmlFor="admin-status">
                Status
              </label>
              <select
                id="admin-status"
                className="form-select"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as 'semua' | 'aktif' | 'nonaktif')
                }
              >
                <option value="semua">Semua</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>
            <div className="col-sm-4 col-lg-2">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch('')
                  setDepartment('Semua')
                  setRole('Semua')
                  setStatus('semua')
                }}
              >
                <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />
                Reset
              </button>
            </div>
          </div>
          <div className="mt-2 small text-secondary">
            Menampilkan <strong>{filteredUsers.length}</strong> dari {db.users.length} karyawan.
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent">
          <h3 className="card-title mb-0">Daftar Karyawan</h3>
        </div>
        <div className="card-body p-0">
          {filteredUsers.length === 0 ? (
            <EmptyState
              icon="bi-people"
              title="Karyawan tidak ditemukan"
              message="Coba ubah kata kunci atau filter yang digunakan."
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 portal-table">
                <thead>
                  <tr>
                    <th scope="col">Karyawan</th>
                    <th scope="col">Departemen</th>
                    <th scope="col">Jabatan</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Bergabung</th>
                    <th scope="col" className="text-end">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((employee) => (
                    <tr key={employee.id} className={!employee.active ? 'row-inactive' : ''}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <Avatar
                            name={employee.name}
                            size={34}
                            presence={employee.active ? employee.presence : undefined}
                          />
                          <div className="min-w-0">
                            <div className="fw-medium d-flex align-items-center gap-1 flex-wrap">
                              {employee.name}
                              {employee.id === currentUser?.id ? (
                                <Badge tone="primary">Anda</Badge>
                              ) : null}
                            </div>
                            <div className="small text-secondary">{employee.email}</div>
                            <div className="small text-secondary d-md-none">
                              {employee.department} · {employee.position}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone="info">{employee.department}</Badge>
                      </td>
                      <td className="small">{employee.position}</td>
                      <td>
                        <Badge tone={roleTone[employee.role]}>{roleLabel[employee.role]}</Badge>
                      </td>
                      <td>
                        <Badge tone={employee.active ? 'success' : 'secondary'} dot>
                          {employee.active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                        {employee.active ? (
                          <div className="small text-secondary mt-1">
                            {presenceLabel[employee.presence]}
                          </div>
                        ) : null}
                      </td>
                      <td className="small text-secondary text-nowrap">
                        {formatDate(employee.joinedAt)}
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openEdit(employee)}
                            aria-label={`Edit ${employee.name}`}
                            title="Edit karyawan"
                          >
                            <i className="bi bi-pencil" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${employee.active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            onClick={() => handleToggleActive(employee)}
                            aria-label={
                              employee.active
                                ? `Nonaktifkan ${employee.name}`
                                : `Aktifkan ${employee.name}`
                            }
                            title={employee.active ? 'Nonaktifkan akun' : 'Aktifkan akun'}
                          >
                            <i
                              className={`bi ${employee.active ? 'bi-person-slash' : 'bi-person-check'}`}
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="alert alert-light border mt-3 small mb-0">
        <i className="bi bi-shield-lock me-1 text-primary" aria-hidden="true" />
        Administrator memiliki akses penuh ke data karyawan. Pastikan perubahan role dan status
        akun dilakukan sesuai kebijakan perusahaan.
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit data karyawan' : 'Tambah karyawan baru'}
        subtitle={
          editing
            ? 'Perubahan akan langsung diterapkan pada akun karyawan.'
            : 'Akun baru dapat langsung digunakan untuk masuk ke portal.'
        }
        icon={editing ? 'bi-person-gear' : 'bi-person-plus'}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-light" onClick={() => setFormOpen(false)}>
              Batal
            </button>
            <button type="submit" form="employee-form" className="btn btn-primary">
              <i className="bi bi-check2 me-1" aria-hidden="true" />
              {editing ? 'Simpan perubahan' : 'Tambah karyawan'}
            </button>
          </>
        }
      >
        <form id="employee-form" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <div className="alert alert-danger py-2 small" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="row g-3">
            <div className="col-sm-6">
              <label className="form-label" htmlFor="employee-name">
                Nama lengkap <span className="text-danger">*</span>
              </label>
              <input
                id="employee-name"
                className="form-control"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Contoh: Rina Kartika"
                required
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="employee-email">
                Email perusahaan <span className="text-danger">*</span>
              </label>
              <input
                id="employee-email"
                type="email"
                className="form-control"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="nama@nusantara.co.id"
                required
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="employee-password">
                {editing ? 'Kata sandi baru' : 'Kata sandi awal'}
                {!editing ? <span className="text-danger"> *</span> : null}
              </label>
              <input
                id="employee-password"
                type="text"
                className="form-control"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder={editing ? 'Kosongkan bila tidak diubah' : 'Minimal 6 karakter'}
              />
              <div className="form-text">
                {editing
                  ? 'Biarkan kosong jika tidak ingin mengganti kata sandi.'
                  : 'Karyawan dapat mengganti kata sandi melalui halaman profil.'}
              </div>
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="employee-phone">
                Nomor telepon <span className="text-danger">*</span>
              </label>
              <input
                id="employee-phone"
                className="form-control"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="0812-3456-7890"
                required
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="employee-department">
                Departemen
              </label>
              <select
                id="employee-department"
                className="form-select"
                value={form.department}
                onChange={(event) =>
                  setForm({ ...form, department: event.target.value as Department })
                }
              >
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="employee-position">
                Jabatan <span className="text-danger">*</span>
              </label>
              <input
                id="employee-position"
                className="form-control"
                value={form.position}
                onChange={(event) => setForm({ ...form, position: event.target.value })}
                placeholder="Contoh: Backend Engineer"
                required
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label" htmlFor="employee-role">
                Role akses
              </label>
              <select
                id="employee-role"
                className="form-select"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
              >
                <option value="karyawan">Karyawan</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label" htmlFor="employee-location">
                Lokasi kerja
              </label>
              <input
                id="employee-location"
                className="form-control"
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                placeholder="Jakarta / Remote"
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label" htmlFor="employee-joined">
                Tanggal bergabung
              </label>
              <input
                id="employee-joined"
                type="date"
                className="form-control"
                value={form.joinedAt}
                onChange={(event) => setForm({ ...form, joinedAt: event.target.value })}
              />
            </div>
          </div>
          {form.role === 'admin' ? (
            <div className="alert alert-warning py-2 small mt-3 mb-0">
              <i className="bi bi-shield-exclamation me-1" aria-hidden="true" />
              Role Administrator memberikan akses penuh, termasuk mengelola karyawan dan data
              perusahaan. Berikan hanya kepada pengguna yang berwenang.
            </div>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        title="Nonaktifkan akun karyawan?"
        message={`${deactivateTarget?.name ?? 'Karyawan'} tidak akan dapat masuk ke portal hingga akun diaktifkan kembali. Riwayat data tetap tersimpan.`}
        confirmLabel="Nonaktifkan akun"
        onConfirm={() => {
          if (deactivateTarget) {
            updateUser(deactivateTarget.id, { active: false })
            notify(`Akun ${deactivateTarget.name} dinonaktifkan.`, 'warning')
          }
        }}
      />
    </Page>
  )
}
