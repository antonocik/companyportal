import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { Badge, Modal, useToast } from '../components/ui'
import { useT } from '../lib/i18n'

export default function Login() {
  const { login, currentUser } = useApp()
  const notify = useToast()
  const t = useT()
  const navigate = useNavigate()

  const [email, setEmail] = useState(() => localStorage.getItem('nusantara-remember-email') ?? '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem('nusantara-remember-email')))
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    document.body.classList.add('login-page', 'bg-body-secondary')
    return () => document.body.classList.remove('login-page', 'bg-body-secondary')
  }, [])

  if (currentUser) return <Navigate to="/" replace />

  const completeLogin = (accountEmail: string, accountPassword: string) => {
    const result = login(accountEmail, accountPassword)
    if (!result.ok) {
      setError(result.error ?? 'Gagal masuk. Silakan coba lagi.')
      return
    }
    if (remember) localStorage.setItem('nusantara-remember-email', accountEmail.trim())
    else localStorage.removeItem('nusantara-remember-email')
    setError(null)
    const firstName = accountEmail.startsWith('admin') ? 'Andini' : 'Budi'
    notify(`Selamat datang, ${firstName}! Senang melihat Anda kembali.`)
    navigate('/', { replace: true })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Silakan isi email dan kata sandi terlebih dahulu.')
      return
    }
    completeLogin(email, password)
  }

  return (
    <div className="auth-page">
      <div className="auth-box card border-0 shadow-lg">
        <div className="row g-0 h-100">
          <div className="col-lg-6 auth-brand d-none d-lg-flex flex-column">
            <div className="auth-brand-glow auth-brand-glow-one" />
            <div className="auth-brand-glow auth-brand-glow-two" />

            <div className="auth-brand-content position-relative">
              <div className="d-flex align-items-center gap-2 mb-5">
                <span className="brand-logo brand-logo-lg">
                  <i className="bi bi-buildings" aria-hidden="true" />
                </span>
                <div>
                  <div className="fw-bold fs-5 lh-1 text-white">Nusantara</div>
                  <div className="auth-brand-subtitle">COMPANY PORTAL</div>
                </div>
              </div>

              <h1 className="display-6 fw-bold text-white mb-3">
                Satu portal untuk
                <br />
                seluruh tim Nusantara.
              </h1>
              <p className="text-white-50 mb-4 auth-brand-copy">
                Informasi perusahaan, layanan karyawan, dan kolaborasi tim dalam satu tempat
                yang aman dan mudah diakses.
              </p>

              <ul className="auth-features list-unstyled">
                <li>
                  <span className="auth-feature-icon">
                    <i className="bi bi-megaphone" aria-hidden="true" />
                  </span>
                  <span>
                    <strong>Informasi terpusat</strong>
                    <small>Pengumuman dan kebijakan perusahaan selalu terbaru.</small>
                  </span>
                </li>
                <li>
                  <span className="auth-feature-icon">
                    <i className="bi bi-calendar2-check" aria-hidden="true" />
                  </span>
                  <span>
                    <strong>Cuti & absensi mandiri</strong>
                    <small>Ajukan cuti dan pantau kehadiran tanpa formulir manual.</small>
                  </span>
                </li>
                <li>
                  <span className="auth-feature-icon">
                    <i className="bi bi-headset" aria-hidden="true" />
                  </span>
                  <span>
                    <strong>Bantuan IT lebih cepat</strong>
                    <small>Laporkan kendala dan pantau status tiket secara real-time.</small>
                  </span>
                </li>
              </ul>

              <div className="auth-brand-stats">
                <div>
                  <strong>120+</strong>
                  <span>Karyawan</span>
                </div>
                <div>
                  <strong>7</strong>
                  <span>Departemen</span>
                </div>
                <div>
                  <strong>24/7</strong>
                  <span>Dukungan IT</span>
                </div>
              </div>
            </div>

            <div className="auth-brand-footer position-relative">
              <span>© {new Date().getFullYear()} PT Nusantara Digital</span>
              <span>Internal use only</span>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="auth-form p-4 p-md-5">
              <div className="d-lg-none d-flex align-items-center gap-2 mb-4">
                <span className="brand-logo">
                  <i className="bi bi-buildings" aria-hidden="true" />
                </span>
                <div>
                  <div className="fw-bold lh-1">Nusantara</div>
                  <div className="brand-subtitle text-secondary">COMPANY PORTAL</div>
                </div>
              </div>

              <div className="mb-4">
                <Badge tone="primary" className="mb-3">
                  <i className="bi bi-shield-lock me-1" aria-hidden="true" />
                  {t('Portal internal karyawan')}
                </Badge>
                <h2 className="fw-bold mb-2">{t('Masuk ke akun Anda')}</h2>
                <p className="text-secondary mb-0">
                  {t('Gunakan email perusahaan untuk mengakses layanan internal.')}
                </p>
              </div>

              {error ? (
                <div className="alert alert-danger d-flex align-items-start gap-2 py-2" role="alert">
                  <i className="bi bi-exclamation-triangle-fill mt-1" aria-hidden="true" />
                  <span className="small">{error}</span>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="login-email" className="form-label">
                    {t('Email perusahaan')}
                  </label>
                  <div className="input-group auth-input-group">
                    <span className="input-group-text">
                      <i className="bi bi-envelope" aria-hidden="true" />
                    </span>
                    <input
                      id="login-email"
                      type="email"
                      className="form-control"
                      placeholder="nama@nusantara.co.id"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <label htmlFor="login-password" className="form-label">
                      {t('Kata sandi')}
                    </label>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 auth-link"
                      onClick={() => setShowHelp(true)}
                    >
                      {t('Lupa kata sandi?')}
                    </button>
                  </div>
                  <div className="input-group auth-input-group">
                    <span className="input-group-text">
                      <i className="bi bi-lock" aria-hidden="true" />
                    </span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder={t('Masukkan kata sandi')}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary auth-password-toggle"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      <i
                        className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="form-check">
                    <input
                      id="login-remember"
                      className="form-check-input"
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="login-remember">
                      {t('Ingat email saya')}
                    </label>
                  </div>
                  <span className="small text-secondary">
                    <i className="bi bi-lock-fill me-1" aria-hidden="true" />
                    {t('Koneksi aman')}
                  </span>
                </div>

                <button type="submit" className="btn btn-primary btn-lg w-100 auth-submit">
                  {t('Masuk ke portal')}
                  <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
                </button>
              </form>

              <div className="auth-form-footer">
                <span>
                  <i className="bi bi-question-circle me-1" aria-hidden="true" />
                  {t('Butuh bantuan akses?')}
                </span>
                <button type="button" className="btn btn-link btn-sm p-0 auth-link" onClick={() => setShowHelp(true)}>
                  {t('Hubungi IT Support')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-copyright d-lg-none">
        © {new Date().getFullYear()} PT Nusantara Digital · Internal use only
      </div>

      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Bantuan akses akun"
        icon="bi-life-preserver"
        size="sm"
        footer={
          <button type="button" className="btn btn-primary" onClick={() => setShowHelp(false)}>
            Mengerti
          </button>
        }
      >
        <p className="text-secondary">
          Jika Anda lupa kata sandi atau akun belum aktif, hubungi tim IT Support melalui:
        </p>
        <div className="d-grid gap-2">
          <a href="mailto:it.support@nusantara.co.id" className="btn btn-light text-start">
            <i className="bi bi-envelope me-2 text-primary" aria-hidden="true" />
            it.support@nusantara.co.id
          </a>
          <a href="tel:+62215550123" className="btn btn-light text-start">
            <i className="bi bi-telephone me-2 text-primary" aria-hidden="true" />
            (021) 555-0123 · ext. 110
          </a>
        </div>
        <p className="small text-secondary mb-0 mt-3">
          Jam operasional dukungan: Senin–Jumat, 08.00–17.00 WIB.
        </p>
      </Modal>
    </div>
  )
}
