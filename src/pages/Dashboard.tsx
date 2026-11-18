import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { Avatar, Badge, Page, SmallBox, useToast } from '../components/ui'
import {
  attendanceLabel,
  attendanceTone,
  leaveStatusLabel,
  leaveStatusTone,
  ticketPriorityTone,
  ticketStatusLabel,
  ticketStatusTone,
} from '../lib/labels'
import {
  dateISO,
  formatDate,
  greeting,
  lastWorkdays,
  pad,
  periodLabel,
  sum,
  timeAgo,
} from '../lib/utils'
import { useT } from '../lib/i18n'
import type { WorkMode } from '../types'

const workModes: WorkMode[] = ['WFO', 'WFH', 'Dinas']

export default function Dashboard() {
  const { db, currentUser, isAdmin, clockIn, clockOut, reviewLeave, markAnnouncementRead } =
    useApp()
  const notify = useToast()
  const navigate = useNavigate()
  const t = useT()

  const [now, setNow] = useState(() => new Date())
  const [workMode, setWorkMode] = useState<WorkMode>('WFO')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const user = currentUser!
  const today = dateISO()
  const currentYear = String(new Date().getFullYear())
  const monthPrefix = today.slice(0, 7)

  const activeUsers = db.users.filter((item) => item.active)
  const todayRecords = db.attendance.filter((record) => record.date === today)
  const myAttendance = todayRecords.find((record) => record.userId === user.id)
  const presentToday = todayRecords.filter((record) => record.status === 'hadir').length
  const wfhToday = todayRecords.filter(
    (record) => record.status === 'hadir' && record.workMode === 'WFH',
  ).length
  const awayToday = todayRecords.filter(
    (record) => record.status === 'izin' || record.status === 'sakit',
  ).length
  const pendingLeaves = db.leaves.filter((leave) => leave.status === 'menunggu')
  const openTicketsAll = db.tickets.filter((ticket) => ticket.status !== 'selesai')
  const myTickets = db.tickets.filter(
    (ticket) => ticket.requesterId === user.id || ticket.assigneeId === user.id,
  )
  const myOpenTickets = myTickets.filter((ticket) => ticket.status !== 'selesai').length
  const myPendingLeaves = pendingLeaves.filter((leave) => leave.userId === user.id)
  const myApprovedYear = db.leaves.filter(
    (leave) =>
      leave.userId === user.id &&
      leave.status === 'disetujui' &&
      leave.startDate.startsWith(currentYear) &&
      leave.type !== 'Melahirkan',
  )
  const usedDays = sum(myApprovedYear.map((leave) => leave.days))
  const remainingLeave = Math.max(0, user.leaveQuota - usedDays)
  const myPresentMonth = db.attendance.filter(
    (record) =>
      record.userId === user.id &&
      record.date.startsWith(monthPrefix) &&
      record.status === 'hadir',
  ).length
  const unreadAnnouncements = db.announcements.filter(
    (announcement) => !announcement.readBy.includes(user.id),
  )

  const chartDays = useMemo(
    () =>
      lastWorkdays(7).map((date) => {
        const records = db.attendance.filter(
          (record) => record.date === date && record.status === 'hadir',
        )
        return {
          date,
          present: records.length,
          percent: Math.round((records.length / Math.max(1, activeUsers.length)) * 100),
        }
      }),
    [activeUsers.length, db.attendance],
  )
  const averageAttendance = Math.round(
    sum(chartDays.map((day) => day.percent)) / Math.max(1, chartDays.length),
  )

  const featuredAnnouncements = [...db.announcements]
    .sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 3)

  const approvalQueue = [...pendingLeaves]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3)
  const myRecentLeaves = db.leaves
    .filter((leave) => leave.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3)
  const recentTickets = (isAdmin ? db.tickets : myTickets)
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4)

  const userById = (id: string | null) => db.users.find((item) => item.id === id)
  const firstName = user.name.split(' ')[0]
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  const handleClockIn = () => {
    clockIn(workMode)
    notify(`Absen masuk tercatat (${workMode}). Selamat bekerja!`)
  }

  const handleClockOut = () => {
    clockOut()
    notify('Absen pulang tercatat. Terima kasih atas kerja hari ini!', 'info')
  }

  const handleApprove = (id: string, name: string) => {
    reviewLeave(id, 'disetujui', 'Disetujui melalui dashboard.')
    notify(`Pengajuan cuti ${name} disetujui.`)
  }

  return (
    <Page
      title="Dashboard"
      subtitle={`${periodLabel()} · Ringkasan aktivitas dan layanan Anda hari ini`}
      actions={
        <>
          <Link to="/cuti?baru=1" className="btn btn-primary">
            <i className="bi bi-calendar2-plus me-1" aria-hidden="true" />
            Ajukan cuti
          </Link>
          <Link to="/tiket?baru=1" className="btn btn-outline-secondary">
            <i className="bi bi-headset me-1" aria-hidden="true" />
            Buat tiket
          </Link>
        </>
      }
    >
      <div className="card border-0 shadow-sm welcome-card mb-3">
        <div className="card-body d-flex flex-wrap align-items-center gap-3">
          <div className="welcome-avatar">
            <Avatar name={user.name} size={54} presence={user.presence} />
          </div>
          <div className="flex-grow-1 min-w-0">
            <h2 className="h4 mb-1">
              {t(greeting())}, {firstName} <span aria-hidden="true">👋</span>
            </h2>
            <p className="text-secondary mb-1">
              {isAdmin
                ? `Ada ${pendingLeaves.length} pengajuan cuti dan ${openTicketsAll.length} tiket IT yang perlu perhatian.`
                : `Anda memiliki ${remainingLeave} hari cuti tersisa dan ${myOpenTickets} tiket IT aktif.`}
            </p>
            <div className="d-flex flex-wrap gap-3 small text-secondary">
              <span>
                <i className="bi bi-calendar3 me-1" aria-hidden="true" />
                {formatDate(today, 'long')}
              </span>
              <span>
                <i className="bi bi-building me-1" aria-hidden="true" />
                {user.department} · {user.position}
              </span>
              <span>
                <i className="bi bi-geo-alt me-1" aria-hidden="true" />
                {user.location}
              </span>
            </div>
          </div>
          <div className="d-none d-xl-flex flex-column align-items-end gap-2">
            <Badge tone="success" dot>
              Semua sistem normal
            </Badge>
            <span className="small text-secondary">Terakhir sinkron: baru saja</span>
          </div>
        </div>
      </div>

      <div className="row">
        {isAdmin ? (
          <>
            <div className="col-lg-3 col-sm-6">
              <SmallBox
                tone="primary"
                icon="bi-people-fill"
                label="Karyawan aktif"
                value={activeUsers.length}
                to="/admin"
                hint="Kelola karyawan"
              />
            </div>
            <div className="col-lg-3 col-sm-6">
              <SmallBox
                tone="success"
                icon="bi-person-check-fill"
                label="Hadir hari ini"
                value={presentToday}
                to="/cuti"
                hint="Lihat absensi"
              />
            </div>
            <div className="col-lg-3 col-sm-6">
              <SmallBox
                tone="warning"
                icon="bi-hourglass-split"
                label="Cuti menunggu"
                value={pendingLeaves.length}
                to="/cuti"
                hint="Tinjau pengajuan"
              />
            </div>
            <div className="col-lg-3 col-sm-6">
              <SmallBox
                tone="danger"
                icon="bi-headset"
                label="Tiket IT aktif"
                value={openTicketsAll.length}
                to="/tiket"
                hint="Buka helpdesk"
              />
            </div>
          </>
        ) : (
          <>
            <div className="col-lg-3 col-sm-6">
              <SmallBox
                tone="primary"
                icon="bi-calendar2-check-fill"
                label="Sisa cuti tahunan"
                value={remainingLeave}
                to="/cuti"
                hint="Ajukan cuti"
              />
            </div>
            <div className="col-lg-3 col-sm-6">
              <SmallBox
                tone="success"
                icon="bi-person-check-fill"
                label="Hadir bulan ini"
                value={myPresentMonth}
                to="/cuti"
                hint="Riwayat absensi"
              />
            </div>
            <div className="col-lg-3 col-sm-6">
              <SmallBox
                tone="warning"
                icon="bi-hourglass-split"
                label="Cuti menunggu"
                value={myPendingLeaves.length}
                to="/cuti"
                hint="Status pengajuan"
              />
            </div>
            <div className="col-lg-3 col-sm-6">
              <SmallBox
                tone="danger"
                icon="bi-headset"
                label="Tiket IT aktif"
                value={myOpenTickets}
                to="/tiket"
                hint="Lihat tiket saya"
              />
            </div>
          </>
        )}
      </div>

      <div className="row g-3">
        <div className="col-xl-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
              <div>
                <h3 className="card-title mb-0">{t('Kehadiran 7 Hari Kerja')}</h3>
                <div className="small text-secondary">{t('Persentase karyawan hadir per hari')}</div>
              </div>
              <Badge tone={averageAttendance >= 85 ? 'success' : 'warning'}>
                Rata-rata {averageAttendance}%
              </Badge>
            </div>
            <div className="card-body">
              <div className="attendance-chart" role="img" aria-label="Grafik kehadiran 7 hari kerja">
                {chartDays.map((day) => (
                  <div className="chart-col" key={day.date}>
                    <div className="chart-value-label">{day.percent}%</div>
                    <div className="chart-bar-track">
                      <div
                        className={`chart-bar ${day.date === today ? 'chart-bar-today' : ''}`}
                        style={{ height: `${Math.max(day.percent, 5)}%` }}
                        title={`${formatDate(day.date, 'long')}: ${day.present} hadir (${day.percent}%)`}
                      />
                    </div>
                    <div className={`chart-label ${day.date === today ? 'fw-semibold' : ''}`}>
                      {formatDate(day.date, 'short')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="row g-2 mt-2">
                <div className="col-4">
                  <div className="mini-stat">
                    <span className="mini-stat-dot bg-success" />
                    <div>
                      <strong>{presentToday}</strong>
                      <span>Hadir hari ini</span>
                    </div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="mini-stat">
                    <span className="mini-stat-dot bg-info" />
                    <div>
                      <strong>{wfhToday}</strong>
                      <span>Bekerja dari rumah</span>
                    </div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="mini-stat">
                    <span className="mini-stat-dot bg-warning" />
                    <div>
                      <strong>{awayToday}</strong>
                      <span>Izin / sakit</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card border-0 shadow-sm h-100 attendance-card">
            <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
              <h3 className="card-title mb-0">Absensi Hari Ini</h3>
              <Badge tone={myAttendance?.clockIn ? 'success' : 'warning'} dot>
                {myAttendance?.clockIn ? 'Sudah absen' : 'Belum absen'}
              </Badge>
            </div>
            <div className="card-body">
              <div className="text-center mb-3">
                <div className="live-clock">{clock}</div>
                <div className="small text-secondary">
                  {formatDate(today, 'long')} · WIB
                </div>
              </div>

              <div className="row g-2 text-center mb-3">
                <div className="col-4">
                  <div className="attendance-metric">
                    <span>Masuk</span>
                    <strong>{myAttendance?.clockIn ?? '—'}</strong>
                  </div>
                </div>
                <div className="col-4">
                  <div className="attendance-metric">
                    <span>Pulang</span>
                    <strong>{myAttendance?.clockOut ?? '—'}</strong>
                  </div>
                </div>
                <div className="col-4">
                  <div className="attendance-metric">
                    <span>Mode</span>
                    <strong>{myAttendance?.workMode ?? workMode}</strong>
                  </div>
                </div>
              </div>

              {!myAttendance?.clockIn ? (
                <>
                  <label className="form-label small text-secondary" htmlFor="work-mode">
                    Mode kerja hari ini
                  </label>
                  <select
                    id="work-mode"
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
              ) : !myAttendance.clockOut ? (
                <>
                  <div className="alert alert-info py-2 small mb-2">
                    <i className="bi bi-info-circle me-1" aria-hidden="true" />
                    Anda sudah absen masuk pukul {myAttendance.clockIn}. Jangan lupa absen pulang.
                  </div>
                  <button type="button" className="btn btn-success w-100" onClick={handleClockOut}>
                    <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
                    Absen pulang
                  </button>
                </>
              ) : (
                <div className="alert alert-success py-2 small mb-0">
                  <i className="bi bi-check-circle-fill me-1" aria-hidden="true" />
                  Absensi hari ini selesai. Durasi kerja tercatat dengan baik.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-0">
        <div className="col-xl-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
              <div>
                <h3 className="card-title mb-0">Pengumuman Terbaru</h3>
                <div className="small text-secondary">
                  {unreadAnnouncements.length} pengumuman belum dibaca
                </div>
              </div>
              <Link to="/pengumuman" className="btn btn-sm btn-outline-secondary">
                Lihat semua
                <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
              </Link>
            </div>
            <div className="card-body p-0">
              {featuredAnnouncements.map((announcement) => {
                const author = userById(announcement.authorId)
                const unread = !announcement.readBy.includes(user.id)
                return (
                  <button
                    type="button"
                    key={announcement.id}
                    className="announcement-row text-start"
                    onClick={() => {
                      markAnnouncementRead(announcement.id)
                      navigate(`/pengumuman?q=${encodeURIComponent(announcement.title)}`)
                    }}
                  >
                    <div className="announcement-row-top">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <Badge tone={announcement.category === 'HR' ? 'primary' : announcement.category === 'IT' ? 'info' : announcement.category === 'Kegiatan' ? 'success' : 'secondary'}>
                          {announcement.category}
                        </Badge>
                        {announcement.pinned ? (
                          <Badge tone="warning">
                            <i className="bi bi-pin-angle-fill me-1" aria-hidden="true" />
                            Disematkan
                          </Badge>
                        ) : null}
                        {unread ? <Badge tone="danger">Baru</Badge> : null}
                        <span className="small text-secondary ms-auto">
                          {timeAgo(announcement.createdAt)}
                        </span>
                      </div>
                      <h4 className="h6 mt-2 mb-1">{announcement.title}</h4>
                      <p className="text-secondary small mb-2 announcement-preview">
                        {announcement.body}
                      </p>
                      <div className="d-flex align-items-center gap-2">
                        {author ? <Avatar name={author.name} size={22} /> : null}
                        <span className="small text-secondary">
                          {author?.name ?? 'Tim Internal'} · {author?.position ?? 'Perusahaan'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          {isAdmin ? (
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="card-title mb-0">Menunggu Persetujuan</h3>
                  <div className="small text-secondary">Pengajuan cuti terbaru</div>
                </div>
                <Badge tone="warning">{pendingLeaves.length}</Badge>
              </div>
              <div className="card-body p-0">
                {approvalQueue.length === 0 ? (
                  <div className="text-center text-secondary small py-4">
                    <i className="bi bi-check2-circle d-block fs-4 mb-2" aria-hidden="true" />
                    Tidak ada pengajuan yang menunggu.
                  </div>
                ) : (
                  approvalQueue.map((leave) => {
                    const employee = userById(leave.userId)
                    return (
                      <div key={leave.id} className="approval-row">
                        <Avatar name={employee?.name ?? 'Karyawan'} size={34} />
                        <div className="min-w-0 flex-grow-1">
                          <div className="fw-medium small text-truncate">
                            {employee?.name ?? 'Karyawan'}
                          </div>
                          <div className="small text-secondary">
                            {leave.type} · {leave.days} hari
                          </div>
                          <div className="small text-secondary">
                            {formatDate(leave.startDate, 'short')} –{' '}
                            {formatDate(leave.endDate, 'short')}
                          </div>
                        </div>
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            title="Setujui"
                            aria-label={`Setujui cuti ${employee?.name ?? ''}`}
                            onClick={() => handleApprove(leave.id, employee?.name ?? 'karyawan')}
                          >
                            <i className="bi bi-check-lg" aria-hidden="true" />
                          </button>
                          <Link
                            to="/cuti"
                            className="btn btn-sm btn-outline-secondary"
                            title="Tinjau detail"
                            aria-label="Tinjau detail pengajuan"
                          >
                            <i className="bi bi-arrow-right" aria-hidden="true" />
                          </Link>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="card-footer bg-transparent">
                <Link to="/cuti" className="btn btn-sm btn-outline-primary w-100">
                  Buka halaman cuti
                </Link>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                <h3 className="card-title mb-0">Cuti Saya</h3>
                <Link to="/cuti" className="btn btn-sm btn-outline-secondary">
                  Kelola
                </Link>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-end mb-1">
                  <div>
                    <div className="fs-3 fw-bold lh-1">{remainingLeave}</div>
                    <div className="small text-secondary">hari cuti tersisa</div>
                  </div>
                  <div className="text-end small text-secondary">
                    <div>
                      Terpakai <strong>{usedDays}</strong> hari
                    </div>
                    <div>
                      Kuota <strong>{user.leaveQuota}</strong> hari
                    </div>
                  </div>
                </div>
                <div
                  className="progress mb-3"
                  role="progressbar"
                  aria-label="Penggunaan kuota cuti"
                  aria-valuenow={usedDays}
                  aria-valuemin={0}
                  aria-valuemax={user.leaveQuota}
                  style={{ height: 8 }}
                >
                  <div
                    className="progress-bar bg-primary"
                    style={{
                      width: `${Math.min(100, (usedDays / Math.max(1, user.leaveQuota)) * 100)}%`,
                    }}
                  />
                </div>

                <div className="d-flex flex-column gap-2">
                  {myRecentLeaves.length === 0 ? (
                    <div className="text-secondary small">
                      Belum ada pengajuan cuti. Klik “Ajukan cuti” untuk memulai.
                    </div>
                  ) : (
                    myRecentLeaves.map((leave) => (
                      <div
                        key={leave.id}
                        className="d-flex align-items-center justify-content-between gap-2 leave-row"
                      >
                        <div className="min-w-0">
                          <div className="small fw-medium">
                            {leave.type} · {leave.days} hari
                          </div>
                          <div className="small text-secondary text-truncate">
                            {formatDate(leave.startDate, 'short')} –{' '}
                            {formatDate(leave.endDate, 'short')}
                          </div>
                        </div>
                        <Badge tone={leaveStatusTone[leave.status]}>
                          {leaveStatusLabel[leave.status]}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="card-footer bg-transparent">
                <Link to="/cuti?baru=1" className="btn btn-sm btn-primary w-100">
                  <i className="bi bi-plus-lg me-1" aria-hidden="true" />
                  Ajukan cuti baru
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="row g-3 mt-0">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
              <div>
                <h3 className="card-title mb-0">Tiket IT Terbaru</h3>
                <div className="small text-secondary">
                  {isAdmin ? 'Aktivitas helpdesk seluruh karyawan' : 'Tiket yang Anda buat atau tangani'}
                </div>
              </div>
              <Link to="/tiket" className="btn btn-sm btn-outline-secondary">
                Lihat semua
                <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
              </Link>
            </div>
            <div className="card-body p-0">
              {recentTickets.length === 0 ? (
                <div className="text-center text-secondary small py-4">
                  Belum ada tiket IT.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 portal-table">
                    <thead>
                      <tr>
                        <th scope="col">Tiket</th>
                        <th scope="col">Subjek</th>
                        {isAdmin ? <th scope="col">Pelapor</th> : null}
                        <th scope="col">Prioritas</th>
                        <th scope="col">Status</th>
                        <th scope="col">Diperbarui</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTickets.map((ticket) => {
                        const requester = userById(ticket.requesterId)
                        return (
                          <tr
                            key={ticket.id}
                            className="clickable-row"
                            onClick={() => navigate(`/tiket?q=${encodeURIComponent(ticket.id)}`)}
                          >
                            <td className="fw-semibold text-primary small">{ticket.id}</td>
                            <td>
                              <div className="fw-medium">{ticket.subject}</div>
                              <div className="small text-secondary">{ticket.category}</div>
                            </td>
                            {isAdmin ? (
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <Avatar name={requester?.name ?? 'Karyawan'} size={24} />
                                  <span className="small">{requester?.name ?? '—'}</span>
                                </div>
                              </td>
                            ) : null}
                            <td>
                              <Badge tone={ticketPriorityTone[ticket.priority]}>
                                {ticket.priority}
                              </Badge>
                            </td>
                            <td>
                              <Badge tone={ticketStatusTone[ticket.status]}>
                                {ticketStatusLabel[ticket.status]}
                              </Badge>
                            </td>
                            <td className="small text-secondary">{timeAgo(ticket.updatedAt)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-0">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body d-flex flex-wrap align-items-center gap-3">
              <div className="flex-grow-1">
                <h3 className="h6 mb-1">Aksi cepat</h3>
                <p className="small text-secondary mb-0">
                  Akses layanan yang paling sering Anda gunakan.
                </p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/cuti?baru=1" className="btn btn-sm btn-light">
                  <i className="bi bi-calendar2-plus me-1 text-primary" aria-hidden="true" />
                  Ajukan cuti
                </Link>
                <Link to="/tiket?baru=1" className="btn btn-sm btn-light">
                  <i className="bi bi-headset me-1 text-info" aria-hidden="true" />
                  Buat tiket
                </Link>
                <Link to="/direktori" className="btn btn-sm btn-light">
                  <i className="bi bi-people me-1 text-success" aria-hidden="true" />
                  Cari karyawan
                </Link>
                <Link to="/dokumen" className="btn btn-sm btn-light">
                  <i className="bi bi-folder me-1 text-warning" aria-hidden="true" />
                  Buka dokumen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mt-2 text-secondary small">
        <span>
          <i className="bi bi-info-circle me-1" aria-hidden="true" />
          Data demo tersimpan di browser Anda.
        </span>
        <span>
          <i className="bi bi-shield-check me-1" aria-hidden="true" />
          {unreadAnnouncements.length} pengumuman belum dibaca
        </span>
      </div>
    </Page>
  )
}
