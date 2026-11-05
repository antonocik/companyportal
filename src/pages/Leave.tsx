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
import {
  attendanceLabel,
  attendanceTone,
  leaveStatusLabel,
  leaveStatusTone,
  leaveTypeTone,
  workModeTone,
} from '../lib/labels'
import {
  clamp,
  dateISO,
  formatDate,
  formatDateTime,
  lastWorkdays,
  pad,
  sum,
  timeAgo,
  workingDays,
} from '../lib/utils'
import type { LeaveRequest, LeaveStatus, LeaveType, WorkMode } from '../types'

const leaveTypes: LeaveType[] = ['Tahunan', 'Sakit', 'Izin', 'Duka', 'Melahirkan']
const workModes: WorkMode[] = ['WFO', 'WFH', 'Dinas']

interface LeaveForm {
  type: LeaveType
  startDate: string
  endDate: string
  reason: string
}

const emptyLeaveForm: LeaveForm = {
  type: 'Tahunan',
  startDate: '',
  endDate: '',
  reason: '',
}

export default function Leave() {
  const {
    db,
    currentUser,
    isAdmin,
    createLeave,
    reviewLeave,
    cancelLeave,
    clockIn,
    clockOut,
  } = useApp()
  const notify = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [tab, setTab] = useState<'cuti' | 'absensi'>('cuti')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'semua' | LeaveStatus>('semua')
  const [requestOpen, setRequestOpen] = useState(false)
  const [form, setForm] = useState<LeaveForm>(emptyLeaveForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<LeaveRequest | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null)
  const [workMode, setWorkMode] = useState<WorkMode>('WFO')
  const [now, setNow] = useState(() => new Date())

  const user = currentUser!
  const today = dateISO()
  const currentYear = String(new Date().getFullYear())
  const todayRecord = db.attendance.find(
    (record) => record.userId === user.id && record.date === today,
  )

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (todayRecord?.workMode) setWorkMode(todayRecord.workMode)
  }, [todayRecord?.workMode])

  const openRequest = () => {
    setForm({
      ...emptyLeaveForm,
      startDate: today,
      endDate: today,
    })
    setFormError(null)
    setRequestOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('baru') === '1') {
      openRequest()
      setTab('cuti')
      const next = new URLSearchParams(searchParams)
      next.delete('baru')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const userById = (id: string | null) => db.users.find((item) => item.id === id)

  const myLeaves = db.leaves.filter((leave) => leave.userId === user.id)
  const scopedLeaves = isAdmin ? db.leaves : myLeaves

  const approvedThisYear = myLeaves.filter(
    (leave) =>
      leave.status === 'disetujui' &&
      leave.startDate.startsWith(currentYear) &&
      leave.type !== 'Melahirkan',
  )
  const usedDays = sum(approvedThisYear.map((leave) => leave.days))
  const remainingDays = Math.max(0, user.leaveQuota - usedDays)
  const myPending = myLeaves.filter((leave) => leave.status === 'menunggu')

  const filteredLeaves = useMemo(() => {
    const term = search.trim().toLowerCase()
    return [...scopedLeaves]
      .filter((leave) => {
        const employee = userById(leave.userId)
        const matchesStatus = statusFilter === 'semua' || leave.status === statusFilter
        const matchesTerm =
          !term ||
          leave.type.toLowerCase().includes(term) ||
          leave.reason.toLowerCase().includes(term) ||
          (employee?.name.toLowerCase().includes(term) ?? false)
        return matchesStatus && matchesTerm
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.users, isAdmin, scopedLeaves, search, statusFilter])

  const formDays = workingDays(form.startDate, form.endDate)
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  const activeUsers = db.users.filter((item) => item.active)
  const todayRecords = db.attendance.filter((record) => record.date === today)
  const presentCount = todayRecords.filter((record) => record.status === 'hadir').length
  const wfhCount = todayRecords.filter(
    (record) => record.status === 'hadir' && record.workMode === 'WFH',
  ).length
  const awayCount = todayRecords.filter(
    (record) => record.status === 'izin' || record.status === 'sakit',
  ).length
  const notYetCount = activeUsers.filter(
    (item) => !todayRecords.some((record) => record.userId === item.id),
  ).length

  const weeklyDays = lastWorkdays(7)
  const weeklyRecords = weeklyDays.map((date) => ({
    date,
    record: db.attendance.find(
      (item) => item.userId === user.id && item.date === date,
    ),
  }))
  const myWeeklyPresent = weeklyRecords.filter((day) => day.record?.status === 'hadir').length
  const myWeeklyAway = weeklyRecords.filter(
    (day) => day.record?.status === 'izin' || day.record?.status === 'sakit',
  ).length

  const handleRequestSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.startDate || !form.endDate) {
      setFormError('Tanggal mulai dan selesai wajib diisi.')
      return
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setFormError('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      return
    }
    if (form.startDate < today) {
      setFormError('Tanggal mulai tidak boleh berada di masa lalu.')
      return
    }
    if (formDays === 0) {
      setFormError('Rentang tanggal tidak memiliki hari kerja. Pilih tanggal lain.')
      return
    }
    if (form.reason.trim().length < 10) {
      setFormError('Alasan pengajuan minimal 10 karakter.')
      return
    }
    const result = createLeave(form)
    if (!result.ok) {
      setFormError(result.error ?? 'Pengajuan gagal disimpan.')
      return
    }
    notify('Pengajuan cuti berhasil dikirim dan menunggu persetujuan.')
    setRequestOpen(false)
  }

  const openReview = (leave: LeaveRequest) => {
    setReviewing(leave)
    setReviewNote(leave.reviewNote ?? '')
    setReviewError(null)
  }

  const handleReview = (decision: Exclude<LeaveStatus, 'menunggu'>) => {
    if (!reviewing) return
    if (decision === 'ditolak' && reviewNote.trim().length < 5) {
      setReviewError('Alasan penolakan wajib diisi minimal 5 karakter.')
      return
    }
    reviewLeave(reviewing.id, decision, reviewNote)
    notify(
      decision === 'disetujui'
        ? 'Pengajuan cuti disetujui.'
        : 'Pengajuan cuti ditolak dan karyawan akan melihat catatannya.',
      decision === 'disetujui' ? 'success' : 'warning',
    )
    setReviewing(null)
  }

  const handleClockIn = () => {
    clockIn(workMode)
    notify(`Absen masuk tercatat (${workMode}).`)
  }

  const handleClockOut = () => {
    clockOut()
    notify('Absen pulang tercatat.', 'info')
  }

  return (
    <Page
      title="Cuti & Absensi"
      subtitle="Kelola pengajuan cuti, pantau kuota, dan catat kehadiran harian"
      actions={
        <>
          <button type="button" className="btn btn-primary" onClick={openRequest}>
            <i className="bi bi-calendar2-plus me-1" aria-hidden="true" />
            Ajukan cuti
          </button>
          <button
            type="button"
            className={`btn ${tab === 'absensi' ? 'btn-secondary' : 'btn-outline-secondary'}`}
            onClick={() => setTab('absensi')}
          >
            <i className="bi bi-clock me-1" aria-hidden="true" />
            Absensi
          </button>
        </>
      }
    >
      <div className="row g-2 mb-3">
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3">
              <div className="d-flex align-items-center gap-2 text-secondary small mb-1">
                <i className="bi bi-calendar3 text-primary" aria-hidden="true" />
                Kuota tahunan
              </div>
              <div className="fs-4 fw-bold">
                {user.leaveQuota} <span className="fs-6 fw-normal text-secondary">hari</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3">
              <div className="d-flex align-items-center gap-2 text-secondary small mb-1">
                <i className="bi bi-calendar2-check text-warning" aria-hidden="true" />
                Terpakai
              </div>
              <div className="fs-4 fw-bold">
                {usedDays} <span className="fs-6 fw-normal text-secondary">hari</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3">
              <div className="d-flex align-items-center gap-2 text-secondary small mb-1">
                <i className="bi bi-calendar2-heart text-success" aria-hidden="true" />
                Sisa cuti
              </div>
              <div className="fs-4 fw-bold">
                {remainingDays} <span className="fs-6 fw-normal text-secondary">hari</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3">
              <div className="d-flex align-items-center gap-2 text-secondary small mb-1">
                <i className="bi bi-hourglass-split text-danger" aria-hidden="true" />
                Menunggu
              </div>
              <div className="fs-4 fw-bold">
                {myPending.length} <span className="fs-6 fw-normal text-secondary">pengajuan</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ul className="nav nav-tabs mb-3" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'cuti'}
            className={`nav-link ${tab === 'cuti' ? 'active' : ''}`}
            onClick={() => setTab('cuti')}
          >
            <i className="bi bi-calendar2-check me-1" aria-hidden="true" />
            Pengajuan Cuti
            <span className="badge text-bg-light border ms-1">{scopedLeaves.length}</span>
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'absensi'}
            className={`nav-link ${tab === 'absensi' ? 'active' : ''}`}
            onClick={() => setTab('absensi')}
          >
            <i className="bi bi-clock-history me-1" aria-hidden="true" />
            Absensi
          </button>
        </li>
      </ul>

      {tab === 'cuti' ? (
        <>
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <div className="row g-2 align-items-end">
                <div className="col-lg-6">
                  <label className="form-label small text-secondary" htmlFor="leave-search">
                    {isAdmin ? 'Cari karyawan atau pengajuan' : 'Cari pengajuan saya'}
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-search" aria-hidden="true" />
                    </span>
                    <input
                      id="leave-search"
                      type="search"
                      className="form-control"
                      placeholder="Cari nama, jenis cuti, atau alasan..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>
                <div className="col-sm-6 col-lg-3">
                  <label className="form-label small text-secondary" htmlFor="leave-status">
                    Status
                  </label>
                  <select
                    id="leave-status"
                    className="form-select"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as 'semua' | LeaveStatus)
                    }
                  >
                    <option value="semua">Semua status</option>
                    <option value="menunggu">Menunggu</option>
                    <option value="disetujui">Disetujui</option>
                    <option value="ditolak">Ditolak</option>
                  </select>
                </div>
                <div className="col-sm-6 col-lg-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100"
                    onClick={() => {
                      setSearch('')
                      setStatusFilter('semua')
                    }}
                  >
                    <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />
                    Reset filter
                  </button>
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2 mt-2 small text-secondary">
                <span>
                  Menampilkan <strong>{filteredLeaves.length}</strong> pengajuan
                </span>
                {isAdmin ? (
                  <span>
                    · <strong>{db.leaves.filter((leave) => leave.status === 'menunggu').length}</strong>{' '}
                    menunggu persetujuan
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h3 className="card-title mb-0">
                {isAdmin ? 'Daftar Pengajuan Cuti Karyawan' : 'Riwayat Pengajuan Cuti Saya'}
              </h3>
            </div>
            <div className="card-body p-0">
              {filteredLeaves.length === 0 ? (
                <EmptyState
                  icon="bi-calendar2-x"
                  title="Belum ada pengajuan"
                  message={
                    isAdmin
                      ? 'Tidak ada pengajuan yang sesuai dengan filter saat ini.'
                      : 'Anda belum memiliki pengajuan cuti. Mulai dengan tombol Ajukan cuti.'
                  }
                  action={
                    !isAdmin ? (
                      <button type="button" className="btn btn-primary" onClick={openRequest}>
                        Ajukan cuti
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 portal-table">
                    <thead>
                      <tr>
                        {isAdmin ? <th scope="col">Karyawan</th> : null}
                        <th scope="col">Jenis</th>
                        <th scope="col">Tanggal</th>
                        <th scope="col">Durasi</th>
                        <th scope="col">Diajukan</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="text-end">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaves.map((leave) => {
                        const employee = userById(leave.userId)
                        const canReview = isAdmin && leave.status === 'menunggu'
                        const canCancel = !isAdmin && leave.status === 'menunggu'
                        return (
                          <tr key={leave.id}>
                            {isAdmin ? (
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <Avatar name={employee?.name ?? 'Karyawan'} size={30} />
                                  <div className="min-w-0">
                                    <div className="fw-medium text-truncate">
                                      {employee?.name ?? 'Karyawan'}
                                    </div>
                                    <div className="small text-secondary">
                                      {employee?.department ?? '—'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            ) : null}
                            <td>
                              <Badge tone={leaveTypeTone[leave.type]}>{leave.type}</Badge>
                              <div className="small text-secondary reason-preview mt-1">
                                {leave.reason}
                              </div>
                            </td>
                            <td className="small text-nowrap">
                              {formatDate(leave.startDate, 'short')} –{' '}
                              {formatDate(leave.endDate, 'short')}
                              <div className="small text-secondary">
                                {formatDate(leave.startDate, 'long')}
                              </div>
                            </td>
                            <td>
                              <span className="fw-semibold">{leave.days}</span>{' '}
                              <span className="small text-secondary">hari kerja</span>
                            </td>
                            <td className="small text-secondary text-nowrap">
                              {timeAgo(leave.createdAt)}
                            </td>
                            <td>
                              <Badge tone={leaveStatusTone[leave.status]}>
                                {leaveStatusLabel[leave.status]}
                              </Badge>
                              {leave.reviewNote ? (
                                <div
                                  className="small text-secondary review-note-preview mt-1"
                                  title={leave.reviewNote}
                                >
                                  “{leave.reviewNote}”
                                </div>
                              ) : null}
                            </td>
                            <td className="text-end">
                              <div className="d-flex justify-content-end gap-1">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => openReview(leave)}
                                >
                                  Detail
                                </button>
                                {canReview ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={() => openReview(leave)}
                                  >
                                    Tinjau
                                  </button>
                                ) : null}
                                {canCancel ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => setCancelTarget(leave)}
                                  >
                                    Batalkan
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="row g-3">
          <div className="col-xl-5">
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                <h3 className="card-title mb-0">Absensi Hari Ini</h3>
                <Badge tone={todayRecord?.clockIn ? 'success' : 'warning'} dot>
                  {todayRecord?.clockIn ? 'Sudah absen' : 'Belum absen'}
                </Badge>
              </div>
              <div className="card-body">
                <div className="text-center mb-3">
                  <div className="live-clock live-clock-sm">{clock}</div>
                  <div className="small text-secondary">{formatDate(today, 'long')} · WIB</div>
                </div>
                <div className="row g-2 text-center mb-3">
                  <div className="col-4">
                    <div className="attendance-metric">
                      <span>Masuk</span>
                      <strong>{todayRecord?.clockIn ?? '—'}</strong>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="attendance-metric">
                      <span>Pulang</span>
                      <strong>{todayRecord?.clockOut ?? '—'}</strong>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="attendance-metric">
                      <span>Status</span>
                      <strong>
                        {todayRecord ? attendanceLabel[todayRecord.status] : 'Belum'}
                      </strong>
                    </div>
                  </div>
                </div>

                {!todayRecord?.clockIn ? (
                  <>
                    <label className="form-label small text-secondary" htmlFor="leave-work-mode">
                      Mode kerja
                    </label>
                    <select
                      id="leave-work-mode"
                      className="form-select form-select-sm mb-2"
                      value={workMode}
                      onChange={(event) => setWorkMode(event.target.value as WorkMode)}
                    >
                      {workModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode === 'WFO'
                            ? 'WFO — Bekerja dari kantor'
                            : mode === 'WFH'
                              ? 'WFH — Bekerja dari rumah'
                              : 'Dinas — Perjalanan dinas'}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-primary w-100" onClick={handleClockIn}>
                      <i className="bi bi-box-arrow-in-right me-1" aria-hidden="true" />
                      Absen masuk sekarang
                    </button>
                  </>
                ) : !todayRecord.clockOut ? (
                  <>
                    <div className="alert alert-info py-2 small mb-2">
                      <i className="bi bi-info-circle me-1" aria-hidden="true" />
                      Absen masuk pukul {todayRecord.clockIn} · {todayRecord.workMode}
                    </div>
                    <button type="button" className="btn btn-success w-100" onClick={handleClockOut}>
                      <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
                      Absen pulang
                    </button>
                  </>
                ) : (
                  <div className="alert alert-success py-2 small mb-0">
                    <i className="bi bi-check-circle-fill me-1" aria-hidden="true" />
                    Absensi hari ini selesai. Terima kasih!
                  </div>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-header bg-transparent">
                <h3 className="card-title mb-0">Rekap 7 Hari Kerja</h3>
              </div>
              <div className="card-body">
                <div className="row g-2 text-center">
                  <div className="col-4">
                    <div className="recap-box recap-success">
                      <strong>{myWeeklyPresent}</strong>
                      <span>Hadir</span>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="recap-box recap-warning">
                      <strong>{myWeeklyAway}</strong>
                      <span>Izin / sakit</span>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="recap-box recap-secondary">
                      <strong>{Math.max(0, weeklyDays.length - myWeeklyPresent - myWeeklyAway)}</strong>
                      <span>Tanpa data</span>
                    </div>
                  </div>
                </div>
                <div className="small text-secondary mt-3">
                  Periode {formatDate(weeklyDays[0], 'short')} –{' '}
                  {formatDate(weeklyDays[weeklyDays.length - 1], 'short')}. Data kehadiran
                  diperbarui otomatis saat Anda melakukan absensi.
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-7">
            {isAdmin ? (
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <h3 className="card-title mb-0">Kehadiran Tim Hari Ini</h3>
                    <div className="small text-secondary">
                      {presentCount} hadir · {wfhCount} WFH · {awayCount} izin/sakit ·{' '}
                      {notYetCount} belum absen
                    </div>
                  </div>
                  <Badge tone="primary">{activeUsers.length} karyawan</Badge>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 portal-table">
                      <thead>
                        <tr>
                          <th scope="col">Karyawan</th>
                          <th scope="col">Status</th>
                          <th scope="col">Masuk</th>
                          <th scope="col">Pulang</th>
                          <th scope="col">Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeUsers.map((employee) => {
                          const record = todayRecords.find(
                            (item) => item.userId === employee.id,
                          )
                          return (
                            <tr key={employee.id}>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <Avatar name={employee.name} size={30} />
                                  <div className="min-w-0">
                                    <div className="fw-medium text-truncate">{employee.name}</div>
                                    <div className="small text-secondary">
                                      {employee.department}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {record ? (
                                  <Badge tone={attendanceTone[record.status]} dot>
                                    {attendanceLabel[record.status]}
                                  </Badge>
                                ) : (
                                  <Badge tone="secondary">Belum absen</Badge>
                                )}
                              </td>
                              <td className="small">{record?.clockIn ?? '—'}</td>
                              <td className="small">{record?.clockOut ?? '—'}</td>
                              <td>
                                {record ? (
                                  <Badge tone={workModeTone[record.workMode]}>
                                    {record.workMode}
                                  </Badge>
                                ) : (
                                  '—'
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent">
                  <h3 className="card-title mb-0">Riwayat Absensi Saya</h3>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 portal-table">
                      <thead>
                        <tr>
                          <th scope="col">Tanggal</th>
                          <th scope="col">Status</th>
                          <th scope="col">Masuk</th>
                          <th scope="col">Pulang</th>
                          <th scope="col">Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyRecords
                          .slice()
                          .reverse()
                          .map(({ date, record }) => (
                            <tr key={date}>
                              <td className="small text-nowrap">
                                {formatDate(date, 'short')}
                                <div className="text-secondary">
                                  {formatDate(date, 'long').split(',')[0]}
                                </div>
                              </td>
                              <td>
                                {record ? (
                                  <Badge tone={attendanceTone[record.status]} dot>
                                    {attendanceLabel[record.status]}
                                  </Badge>
                                ) : (
                                  <Badge tone="secondary">Tidak ada data</Badge>
                                )}
                              </td>
                              <td className="small">{record?.clockIn ?? '—'}</td>
                              <td className="small">{record?.clockOut ?? '—'}</td>
                              <td>
                                {record ? (
                                  <Badge tone={workModeTone[record.workMode]}>
                                    {record.workMode}
                                  </Badge>
                                ) : (
                                  '—'
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Ajukan cuti"
        subtitle="Pengajuan akan dikirim ke atasan langsung untuk disetujui."
        icon="bi-calendar2-plus"
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-light" onClick={() => setRequestOpen(false)}>
              Batal
            </button>
            <button type="submit" form="leave-form" className="btn btn-primary">
              <i className="bi bi-send me-1" aria-hidden="true" />
              Kirim pengajuan
            </button>
          </>
        }
      >
        <form id="leave-form" onSubmit={handleRequestSubmit} noValidate>
          {formError ? (
            <div className="alert alert-danger py-2 small" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="alert alert-info py-2 small">
            <i className="bi bi-info-circle me-1" aria-hidden="true" />
            Sisa cuti tahunan Anda saat ini: <strong>{remainingDays} hari</strong>. Sabtu dan
            Minggu tidak dihitung sebagai hari kerja.
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="leave-type">
              Jenis cuti
            </label>
            <select
              id="leave-type"
              className="form-select"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as LeaveType })}
            >
              {leaveTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label className="form-label" htmlFor="leave-start">
                Tanggal mulai <span className="text-danger">*</span>
              </label>
              <input
                id="leave-start"
                type="date"
                className="form-control"
                min={today}
                value={form.startDate}
                onChange={(event) => {
                  const startDate = event.target.value
                  setForm((previous) => ({
                    ...previous,
                    startDate,
                    endDate:
                      !previous.endDate || previous.endDate < startDate
                        ? startDate
                        : previous.endDate,
                  }))
                }}
                required
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="leave-end">
                Tanggal selesai <span className="text-danger">*</span>
              </label>
              <input
                id="leave-end"
                type="date"
                className="form-control"
                min={form.startDate || today}
                value={form.endDate}
                onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                required
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="leave-reason">
              Alasan pengajuan <span className="text-danger">*</span>
            </label>
            <textarea
              id="leave-reason"
              className="form-control"
              rows={3}
              placeholder="Jelaskan alasan dan rencana pekerjaan yang didelegasikan..."
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
              required
            />
          </div>
          <div className="leave-summary">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-calendar-week text-primary" aria-hidden="true" />
              <span className="small">
                {form.startDate && form.endDate && formDays > 0 ? (
                  <>
                    Anda mengajukan <strong>{formDays} hari kerja</strong> (
                    {formatDate(form.startDate, 'short')} – {formatDate(form.endDate, 'short')}).
                    Sisa setelah disetujui:{' '}
                    <strong>{Math.max(0, remainingDays - formDays)} hari</strong>.
                  </>
                ) : (
                  'Pilih rentang tanggal untuk melihat perhitungan hari kerja.'
                )}
              </span>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(reviewing)}
        onClose={() => setReviewing(null)}
        title={isAdmin ? 'Tinjau pengajuan cuti' : 'Detail pengajuan cuti'}
        subtitle={reviewing ? `Diajukan ${formatDateTime(reviewing.createdAt)}` : undefined}
        icon="bi-calendar2-check"
        size="md"
        footer={
          isAdmin && reviewing?.status === 'menunggu' ? (
            <>
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => handleReview('ditolak')}
              >
                <i className="bi bi-x-lg me-1" aria-hidden="true" />
                Tolak
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => handleReview('disetujui')}
              >
                <i className="bi bi-check2 me-1" aria-hidden="true" />
                Setujui
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-light" onClick={() => setReviewing(null)}>
              Tutup
            </button>
          )
        }
      >
        {reviewing ? (
          <>
            <div className="d-flex align-items-center gap-2 mb-3">
              <Avatar name={userById(reviewing.userId)?.name ?? 'Karyawan'} size={42} />
              <div>
                <div className="fw-semibold">{userById(reviewing.userId)?.name ?? 'Karyawan'}</div>
                <div className="small text-secondary">
                  {userById(reviewing.userId)?.position} ·{' '}
                  {userById(reviewing.userId)?.department}
                </div>
              </div>
              <Badge
                tone={leaveStatusTone[reviewing.status]}
                className="ms-auto"
              >
                {leaveStatusLabel[reviewing.status]}
              </Badge>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <div className="detail-box">
                  <span>Jenis cuti</span>
                  <strong>{reviewing.type}</strong>
                </div>
              </div>
              <div className="col-6">
                <div className="detail-box">
                  <span>Durasi</span>
                  <strong>{reviewing.days} hari kerja</strong>
                </div>
              </div>
              <div className="col-6">
                <div className="detail-box">
                  <span>Mulai</span>
                  <strong>{formatDate(reviewing.startDate, 'long')}</strong>
                </div>
              </div>
              <div className="col-6">
                <div className="detail-box">
                  <span>Selesai</span>
                  <strong>{formatDate(reviewing.endDate, 'long')}</strong>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="small text-secondary mb-1">Alasan pengajuan</div>
              <div className="p-3 bg-body-tertiary rounded">{reviewing.reason}</div>
            </div>

            {reviewing.reviewNote ? (
              <div className="alert alert-light border small">
                <strong>Catatan persetujuan:</strong> {reviewing.reviewNote}
                {reviewing.reviewedBy ? (
                  <div className="text-secondary mt-1">
                    Ditinjau oleh {userById(reviewing.reviewedBy)?.name ?? 'Administrator'}
                  </div>
                ) : null}
              </div>
            ) : null}

            {isAdmin && reviewing.status === 'menunggu' ? (
              <div>
                <label className="form-label" htmlFor="review-note">
                  Catatan untuk karyawan {reviewNote ? '' : '(wajib bila menolak)'}
                </label>
                <textarea
                  id="review-note"
                  className="form-control"
                  rows={2}
                  placeholder="Tambahkan catatan persetujuan atau alasan penolakan..."
                  value={reviewNote}
                  onChange={(event) => {
                    setReviewNote(event.target.value)
                    setReviewError(null)
                  }}
                />
                {reviewError ? (
                  <div className="text-danger small mt-1">{reviewError}</div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Batalkan pengajuan cuti?"
        message={`Pengajuan ${cancelTarget?.type.toLowerCase() ?? ''} untuk ${cancelTarget ? formatDate(cancelTarget.startDate, 'short') : ''} akan ditarik dan tidak dapat dikembalikan.`}
        confirmLabel="Ya, batalkan"
        onConfirm={() => {
          if (cancelTarget) {
            cancelLeave(cancelTarget.id)
            notify('Pengajuan cuti berhasil dibatalkan.', 'info')
          }
        }}
      />
    </Page>
  )
}
