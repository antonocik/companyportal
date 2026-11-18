import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import {
  Avatar,
  Badge,
  ConfirmDialog,
  InfoRow,
  Page,
  useToast,
} from '../components/ui'
import { roleLabel, roleTone } from '../lib/labels'
import { formatDate, sum } from '../lib/utils'
import { useT } from '../lib/i18n'

export default function Profile() {
  const {
    db,
    currentUser,
    isAdmin,
    updateProfile,
    changePassword,
    resetDemoData,
    logout,
  } = useApp()
  const notify = useToast()
  const navigate = useNavigate()
  const t = useT()

  const user = currentUser!

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const [profileForm, setProfileForm] = useState({
    name: user.name,
    phone: user.phone,
    location: user.location,
  })
  const [profileError, setProfileError] = useState<string | null>(null)

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)

  useEffect(() => {
    setProfileForm({ name: user.name, phone: user.phone, location: user.location })
  }, [user.name, user.phone, user.location])

  const currentYear = String(new Date().getFullYear())
  const approvedLeaves = db.leaves.filter(
    (leave) =>
      leave.userId === user.id &&
      leave.status === 'disetujui' &&
      leave.startDate.startsWith(currentYear) &&
      leave.type !== 'Melahirkan',
  )
  const usedDays = sum(approvedLeaves.map((leave) => leave.days))
  const remainingDays = Math.max(0, user.leaveQuota - usedDays)
  const myTickets = db.tickets.filter(
    (ticket) => ticket.requesterId === user.id || ticket.assigneeId === user.id,
  )
  const openTickets = myTickets.filter((ticket) => ticket.status !== 'selesai').length

  const handleProfileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (profileForm.name.trim().length < 2) {
      setProfileError('Nama lengkap wajib diisi.')
      return
    }
    if (!profileForm.phone.trim()) {
      setProfileError('Nomor telepon wajib diisi.')
      return
    }
    if (!profileForm.location.trim()) {
      setProfileError('Lokasi kerja wajib diisi.')
      return
    }
    updateProfile({
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim(),
      location: profileForm.location.trim(),
    })
    setProfileError(null)
    notify('Profil berhasil diperbarui.')
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoError(null)
    if (!file.type.startsWith('image/')) {
      setPhotoError('File harus berupa gambar (JPG, PNG, atau WebP).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Ukuran foto maksimal 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result) {
        setPhotoError('Gagal membaca file foto.')
        return
      }
      updateProfile({ avatar: result })
      notify('Foto profil berhasil diperbarui.')
    }
    reader.onerror = () => setPhotoError('Gagal membaca file foto.')
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleRemovePhoto = () => {
    updateProfile({ avatar: undefined })
    notify('Foto profil dihapus.', 'info')
  }

  const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!passwordForm.current) {
      setPasswordError('Masukkan kata sandi saat ini.')
      return
    }
    if (passwordForm.next.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter.')
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.')
      return
    }
    if (passwordForm.next === passwordForm.current) {
      setPasswordError('Kata sandi baru harus berbeda dari kata sandi saat ini.')
      return
    }
    const result = changePassword(passwordForm.current, passwordForm.next)
    if (!result.ok) {
      setPasswordError(result.error ?? 'Kata sandi gagal diubah.')
      return
    }
    setPasswordError(null)
    setPasswordForm({ current: '', next: '', confirm: '' })
    notify('Kata sandi berhasil diubah. Gunakan kata sandi baru saat masuk berikutnya.')
  }

  return (
    <Page
      title={t('Profil Saya')}
      subtitle={t('Kelola informasi pribadi, keamanan akun, dan preferensi portal')}
      actions={
        <button
          type="button"
          className="btn btn-outline-danger"
          onClick={() => {
            logout()
            notify('Anda telah keluar dari portal.', 'info')
            navigate('/login')
          }}
        >
          <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
          Keluar
        </button>
      }
    >
      <div className="row g-3">
        <div className="col-xl-4">
          <div className="card border-0 shadow-sm overflow-hidden mb-3">
            <div className="profile-cover" />
            <div className="card-body text-center pt-0">
              <div className="position-relative d-inline-block">
                <Avatar
                  name={user.name}
                  size={92}
                  presence={user.presence}
                  className="profile-avatar mx-auto"
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary profile-photo-button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Ganti foto profil"
                  title="Ganti foto profil"
                >
                  <i className="bi bi-camera-fill" aria-hidden="true" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="d-none"
                onChange={handlePhotoChange}
              />
              {photoError ? (
                <div className="alert alert-danger py-2 small mt-2 mb-0" role="alert">
                  {photoError}
                </div>
              ) : null}
              {user.avatar ? (
                <div className="mt-2">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-danger"
                    onClick={handleRemovePhoto}
                  >
                    <i className="bi bi-trash me-1" aria-hidden="true" />
                    Hapus foto
                  </button>
                </div>
              ) : (
                <p className="small text-secondary mt-2 mb-0">
                  Belum ada foto. Klik ikon kamera untuk mengunggah (maks. 2 MB).
                </p>
              )}
              <h2 className="h4 mt-3 mb-1">{user.name}</h2>
              <div className="text-secondary">{user.position}</div>
              <div className="d-flex justify-content-center flex-wrap gap-2 mt-2">
                <Badge tone={roleTone[user.role]}>{roleLabel[user.role]}</Badge>
                <Badge tone="info">{user.department}</Badge>
                <Badge tone="success" dot>
                  Akun aktif
                </Badge>
              </div>

              <div className="text-start mt-3 border-top pt-2">
                <InfoRow icon="bi-envelope" label="Email" value={user.email} />
                <InfoRow icon="bi-telephone" label="Telepon" value={user.phone} />
                <InfoRow icon="bi-geo-alt" label="Lokasi kerja" value={user.location} />
                <InfoRow
                  icon="bi-calendar3"
                  label="Bergabung sejak"
                  value={formatDate(user.joinedAt, 'long')}
                />
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-transparent">
              <h3 className="card-title mb-0">Ringkasan Saya</h3>
            </div>
            <div className="card-body">
              <div className="row g-2 text-center">
                <div className="col-4">
                  <div className="recap-box recap-primary">
                    <strong>{remainingDays}</strong>
                    <span>Sisa cuti</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="recap-box recap-info">
                    <strong>{openTickets}</strong>
                    <span>Tiket aktif</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="recap-box recap-success">
                    <strong>{approvedLeaves.length}</strong>
                    <span>Cuti disetujui</span>
                  </div>
                </div>
              </div>
              <div className="progress mt-3" role="progressbar" style={{ height: 8 }}>
                <div
                  className="progress-bar bg-primary"
                  style={{
                    width: `${Math.min(100, (usedDays / Math.max(1, user.leaveQuota)) * 100)}%`,
                  }}
                />
              </div>
              <div className="d-flex justify-content-between small text-secondary mt-1">
                <span>{usedDays} hari terpakai</span>
                <span>{user.leaveQuota} hari kuota</span>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h3 className="card-title mb-0">Hak Akses</h3>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0 access-list">
                {[
                  'Dashboard dan pengumuman perusahaan',
                  'Direktori karyawan dan dokumen internal',
                  'Pengajuan cuti dan absensi mandiri',
                  'Tiket IT / helpdesk',
                  ...(isAdmin
                    ? [
                        'Manajemen akun dan role karyawan',
                        'Publikasi dan pengelolaan pengumuman',
                        'Pengelolaan repositori dokumen',
                      ]
                    : []),
                ].map((item) => (
                  <li key={item}>
                    <i className="bi bi-check-circle-fill text-success" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-transparent">
              <h3 className="card-title mb-0">Informasi Pribadi</h3>
              <div className="small text-secondary">
                Perbarui data kontak yang terlihat di direktori karyawan.
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleProfileSubmit} noValidate>
                {profileError ? (
                  <div className="alert alert-danger py-2 small" role="alert">
                    {profileError}
                  </div>
                ) : null}
                <div className="row g-3">
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="profile-name">
                      Nama lengkap
                    </label>
                    <input
                      id="profile-name"
                      className="form-control"
                      value={profileForm.name}
                      onChange={(event) =>
                        setProfileForm({ ...profileForm, name: event.target.value })
                      }
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="profile-email">
                      Email perusahaan
                    </label>
                    <input
                      id="profile-email"
                      className="form-control"
                      value={user.email}
                      readOnly
                      disabled
                    />
                    <div className="form-text">Email hanya dapat diubah oleh administrator.</div>
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="profile-phone">
                      Nomor telepon
                    </label>
                    <input
                      id="profile-phone"
                      className="form-control"
                      value={profileForm.phone}
                      onChange={(event) =>
                        setProfileForm({ ...profileForm, phone: event.target.value })
                      }
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="profile-location">
                      Lokasi kerja
                    </label>
                    <input
                      id="profile-location"
                      className="form-control"
                      value={profileForm.location}
                      onChange={(event) =>
                        setProfileForm({ ...profileForm, location: event.target.value })
                      }
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="profile-position">
                      Jabatan
                    </label>
                    <input
                      id="profile-position"
                      className="form-control"
                      value={user.position}
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="profile-department">
                      Departemen
                    </label>
                    <input
                      id="profile-department"
                      className="form-control"
                      value={user.department}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
                <div className="d-flex justify-content-end mt-3">
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-check2 me-1" aria-hidden="true" />
                    Simpan perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-transparent">
              <h3 className="card-title mb-0">Keamanan Akun</h3>
              <div className="small text-secondary">
                Gunakan kata sandi yang kuat dan tidak digunakan di layanan lain.
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handlePasswordSubmit} noValidate>
                {passwordError ? (
                  <div className="alert alert-danger py-2 small" role="alert">
                    {passwordError}
                  </div>
                ) : null}
                <div className="row g-3">
                  <div className="col-sm-4">
                    <label className="form-label" htmlFor="password-current">
                      Kata sandi saat ini
                    </label>
                    <input
                      id="password-current"
                      type="password"
                      className="form-control"
                      value={passwordForm.current}
                      onChange={(event) =>
                        setPasswordForm({ ...passwordForm, current: event.target.value })
                      }
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="col-sm-4">
                    <label className="form-label" htmlFor="password-new">
                      Kata sandi baru
                    </label>
                    <input
                      id="password-new"
                      type="password"
                      className="form-control"
                      value={passwordForm.next}
                      onChange={(event) =>
                        setPasswordForm({ ...passwordForm, next: event.target.value })
                      }
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="col-sm-4">
                    <label className="form-label" htmlFor="password-confirm">
                      Konfirmasi kata sandi
                    </label>
                    <input
                      id="password-confirm"
                      type="password"
                      className="form-control"
                      value={passwordForm.confirm}
                      onChange={(event) =>
                        setPasswordForm({ ...passwordForm, confirm: event.target.value })
                      }
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
                  <span className="small text-secondary">
                    <i className="bi bi-info-circle me-1" aria-hidden="true" />
                    Minimal 6 karakter, disarankan kombinasi huruf dan angka.
                  </span>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-shield-lock me-1" aria-hidden="true" />
                    Ubah kata sandi
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h3 className="card-title mb-0">Data & Privasi</h3>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <div className="fw-semibold">Reset data demo</div>
                  <p className="small text-secondary mb-0">
                    Kembalikan seluruh data portal ke kondisi awal. Perubahan yang Anda buat
                    (pengumuman, tiket, cuti, dan absensi) akan hilang.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => setResetOpen(true)}
                >
                  <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />
                  Reset data
                </button>
              </div>
              <hr />
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <div className="fw-semibold">Keluar dari portal</div>
                  <p className="small text-secondary mb-0">
                    Sesi Anda akan diakhiri pada perangkat ini. Data demo tetap tersimpan di
                    browser.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    logout()
                    notify('Anda telah keluar dari portal.', 'info')
                    navigate('/login')
                  }}
                >
                  <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
                  Keluar
                </button>
              </div>
              <div className="alert alert-light border mt-3 mb-0 small">
                <i className="bi bi-info-circle me-1 text-primary" aria-hidden="true" />
                Portal ini adalah aplikasi demo. Seluruh data disimpan secara lokal di browser
                Anda dan tidak dikirim ke server mana pun.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset seluruh data demo?"
        message="Semua perubahan yang Anda buat akan dihapus dan data awal demo akan dipulihkan. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, reset data"
        onConfirm={() => {
          resetDemoData()
          notify('Data demo berhasil direset ke kondisi awal.', 'info')
        }}
      />
    </Page>
  )
}
