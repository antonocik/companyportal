import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import {
  Avatar,
  Badge,
  EmptyState,
  Modal,
  Page,
  useToast,
} from '../components/ui'
import {
  ticketCategoryIcon,
  ticketPriorityLabel,
  ticketPriorityTone,
  ticketStatusLabel,
  ticketStatusTone,
} from '../lib/labels'
import { formatDateTime, timeAgo } from '../lib/utils'
import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from '../types'

const categories: TicketCategory[] = ['Hardware', 'Software', 'Jaringan', 'Akses', 'Lainnya']
const priorities: TicketPriority[] = ['rendah', 'sedang', 'tinggi']

interface TicketForm {
  subject: string
  description: string
  category: TicketCategory
  priority: TicketPriority
}

const emptyForm: TicketForm = {
  subject: '',
  description: '',
  category: 'Software',
  priority: 'sedang',
}

export default function Tickets() {
  const {
    db,
    currentUser,
    isAdmin,
    createTicket,
    updateTicket,
    addTicketComment,
  } = useApp()
  const notify = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const queryParam = searchParams.get('q') ?? ''
  const [search, setSearch] = useState(queryParam)
  const [statusFilter, setStatusFilter] = useState<'semua' | TicketStatus>('semua')
  const [priorityFilter, setPriorityFilter] = useState<'semua' | TicketPriority>('semua')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<TicketForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)

  const user = currentUser!

  useEffect(() => {
    if (queryParam) {
      setSearch(queryParam)
      const match = db.tickets.find((ticket) => ticket.id === queryParam)
      if (match) setSelectedId(match.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParam])

  useEffect(() => {
    if (searchParams.get('baru') === '1') {
      setCreateOpen(true)
      setForm(emptyForm)
      setFormError(null)
      const next = new URLSearchParams(searchParams)
      next.delete('baru')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const userById = (id: string | null) => db.users.find((item) => item.id === id)

  const baseTickets = isAdmin
    ? db.tickets
    : db.tickets.filter(
        (ticket) => ticket.requesterId === user.id || ticket.assigneeId === user.id,
      )

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase()
    return [...baseTickets]
      .filter((ticket) => {
        const requester = userById(ticket.requesterId)
        const matchesStatus = statusFilter === 'semua' || ticket.status === statusFilter
        const matchesPriority =
          priorityFilter === 'semua' || ticket.priority === priorityFilter
        const matchesTerm =
          !term ||
          ticket.id.toLowerCase().includes(term) ||
          ticket.subject.toLowerCase().includes(term) ||
          ticket.description.toLowerCase().includes(term) ||
          ticket.category.toLowerCase().includes(term) ||
          (requester?.name.toLowerCase().includes(term) ?? false)
        return matchesStatus && matchesPriority && matchesTerm
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseTickets, priorityFilter, search, statusFilter])

  const selectedTicket = selectedId
    ? db.tickets.find((ticket) => ticket.id === selectedId) ?? null
    : null

  const counts = {
    total: baseTickets.length,
    terbuka: baseTickets.filter((ticket) => ticket.status === 'terbuka').length,
    diproses: baseTickets.filter((ticket) => ticket.status === 'diproses').length,
    selesai: baseTickets.filter((ticket) => ticket.status === 'selesai').length,
  }

  const openCreate = () => {
    setForm(emptyForm)
    setFormError(null)
    setCreateOpen(true)
  }

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (form.subject.trim().length < 8) {
      setFormError('Subjek tiket minimal 8 karakter.')
      return
    }
    if (form.description.trim().length < 20) {
      setFormError('Deskripsi kendala minimal 20 karakter agar tim IT dapat membantu.')
      return
    }
    const id = createTicket({
      subject: form.subject.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
    })
    notify(`Tiket ${id} berhasil dibuat. Tim IT akan menindaklanjuti.`)
    setCreateOpen(false)
    if (id) setSelectedId(id)
  }

  const handleComment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!comment.trim()) {
      setCommentError('Tulis komentar terlebih dahulu.')
      return
    }
    if (selectedTicket) {
      addTicketComment(selectedTicket.id, comment)
      setComment('')
      setCommentError(null)
      notify('Komentar berhasil ditambahkan.', 'info')
    }
  }

  const handleStatus = (status: TicketStatus) => {
    if (!selectedTicket) return
    updateTicket(selectedTicket.id, { status })
    notify(
      status === 'selesai'
        ? `Tiket ${selectedTicket.id} ditandai selesai.`
        : `Status tiket ${selectedTicket.id} diperbarui.`,
    )
  }

  const handleAssignee = (assigneeId: string) => {
    if (!selectedTicket) return
    updateTicket(selectedTicket.id, { assigneeId: assigneeId || null })
    notify('Penanggung jawab tiket diperbarui.', 'info')
  }

  return (
    <Page
      title="Tiket IT / Helpdesk"
      subtitle="Laporkan kendala teknis dan pantau penanganannya hingga selesai"
      actions={
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          Buat tiket
        </button>
      }
    >
      <div className="row g-2 mb-1">
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <span className="ticket-stat-icon text-bg-secondary">
                <i className="bi bi-life-preserver" aria-hidden="true" />
              </span>
              <div>
                <div className="fs-4 fw-bold lh-1">{counts.total}</div>
                <div className="small text-secondary">Total tiket</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <span className="ticket-stat-icon text-bg-warning">
                <i className="bi bi-envelope-open" aria-hidden="true" />
              </span>
              <div>
                <div className="fs-4 fw-bold lh-1">{counts.terbuka}</div>
                <div className="small text-secondary">Terbuka</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <span className="ticket-stat-icon text-bg-info">
                <i className="bi bi-arrow-repeat" aria-hidden="true" />
              </span>
              <div>
                <div className="fs-4 fw-bold lh-1">{counts.diproses}</div>
                <div className="small text-secondary">Diproses</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <span className="ticket-stat-icon text-bg-success">
                <i className="bi bi-check2-circle" aria-hidden="true" />
              </span>
              <div>
                <div className="fs-4 fw-bold lh-1">{counts.selesai}</div>
                <div className="small text-secondary">Selesai</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-lg-5">
              <label className="form-label small text-secondary" htmlFor="ticket-search">
                Cari tiket
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" aria-hidden="true" />
                </span>
                <input
                  id="ticket-search"
                  type="search"
                  className="form-control"
                  placeholder="Cari ID, subjek, pelapor, atau kategori..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            <div className="col-sm-4 col-lg-2">
              <label className="form-label small text-secondary" htmlFor="ticket-status">
                Status
              </label>
              <select
                id="ticket-status"
                className="form-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'semua' | TicketStatus)
                }
              >
                <option value="semua">Semua</option>
                <option value="terbuka">Terbuka</option>
                <option value="diproses">Diproses</option>
                <option value="selesai">Selesai</option>
              </select>
            </div>
            <div className="col-sm-4 col-lg-2">
              <label className="form-label small text-secondary" htmlFor="ticket-priority">
                Prioritas
              </label>
              <select
                id="ticket-priority"
                className="form-select"
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value as 'semua' | TicketPriority)
                }
              >
                <option value="semua">Semua</option>
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {ticketPriorityLabel[priority]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-4 col-lg-3">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('semua')
                  setPriorityFilter('semua')
                  setSearchParams({}, { replace: true })
                }}
              >
                <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />
                Reset
              </button>
            </div>
          </div>
          <div className="mt-2 small text-secondary">
            Menampilkan <strong>{filteredTickets.length}</strong> tiket
            {isAdmin ? ' dari seluruh karyawan' : ' milik Anda'}.
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {filteredTickets.length === 0 ? (
            <EmptyState
              icon="bi-headset"
              title="Tidak ada tiket"
              message={
                isAdmin
                  ? 'Belum ada tiket yang sesuai dengan filter saat ini.'
                  : 'Anda belum memiliki tiket IT. Buat tiket bila mengalami kendala teknis.'
              }
              action={
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                  Buat tiket
                </button>
              }
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 portal-table">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Subjek</th>
                    {isAdmin ? <th scope="col">Pelapor</th> : null}
                    {isAdmin ? <th scope="col">Ditangani</th> : null}
                    <th scope="col">Prioritas</th>
                    <th scope="col">Status</th>
                    <th scope="col">Diperbarui</th>
                    <th scope="col" className="text-end">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => {
                    const requester = userById(ticket.requesterId)
                    const assignee = userById(ticket.assigneeId)
                    return (
                      <tr
                        key={ticket.id}
                        className="clickable-row"
                        onClick={() => setSelectedId(ticket.id)}
                      >
                        <td className="fw-semibold text-primary small text-nowrap">
                          {ticket.id}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="ticket-category-icon">
                              <i
                                className={`bi ${ticketCategoryIcon[ticket.category]}`}
                                aria-hidden="true"
                              />
                            </span>
                            <div className="min-w-0">
                              <div className="fw-medium">{ticket.subject}</div>
                              <div className="small text-secondary">
                                {ticket.category} · {ticket.comments.length} komentar
                              </div>
                            </div>
                          </div>
                        </td>
                        {isAdmin ? (
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Avatar name={requester?.name ?? 'Karyawan'} size={26} />
                              <span className="small text-truncate">
                                {requester?.name ?? '—'}
                              </span>
                            </div>
                          </td>
                        ) : null}
                        {isAdmin ? (
                          <td className="small text-secondary">
                            {assignee?.name ?? 'Belum ditugaskan'}
                          </td>
                        ) : null}
                        <td>
                          <Badge tone={ticketPriorityTone[ticket.priority]}>
                            {ticketPriorityLabel[ticket.priority]}
                          </Badge>
                        </td>
                        <td>
                          <Badge tone={ticketStatusTone[ticket.status]} dot>
                            {ticketStatusLabel[ticket.status]}
                          </Badge>
                        </td>
                        <td className="small text-secondary text-nowrap">
                          {timeAgo(ticket.updatedAt)}
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedId(ticket.id)
                            }}
                          >
                            Detail
                          </button>
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

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Buat tiket IT"
        subtitle="Jelaskan kendala Anda sedetail mungkin agar penanganan lebih cepat."
        icon="bi-headset"
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-light" onClick={() => setCreateOpen(false)}>
              Batal
            </button>
            <button type="submit" form="ticket-form" className="btn btn-primary">
              <i className="bi bi-send me-1" aria-hidden="true" />
              Kirim tiket
            </button>
          </>
        }
      >
        <form id="ticket-form" onSubmit={handleCreate} noValidate>
          {formError ? (
            <div className="alert alert-danger py-2 small" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="mb-3">
            <label className="form-label" htmlFor="ticket-subject">
              Subjek <span className="text-danger">*</span>
            </label>
            <input
              id="ticket-subject"
              className="form-control"
              placeholder="Contoh: Laptop tidak bisa terhubung ke Wi-Fi kantor"
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              required
            />
          </div>
          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label className="form-label" htmlFor="ticket-category">
                Kategori
              </label>
              <select
                id="ticket-category"
                className="form-select"
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value as TicketCategory })
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="ticket-priority-select">
                Prioritas
              </label>
              <select
                id="ticket-priority-select"
                className="form-select"
                value={form.priority}
                onChange={(event) =>
                  setForm({ ...form, priority: event.target.value as TicketPriority })
                }
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {ticketPriorityLabel[priority]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="ticket-description">
              Deskripsi kendala <span className="text-danger">*</span>
            </label>
            <textarea
              id="ticket-description"
              className="form-control"
              rows={5}
              placeholder="Jelaskan kronologi, pesan error, perangkat yang digunakan, serta langkah yang sudah dicoba..."
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              required
            />
          </div>
          <div className="alert alert-info py-2 small mb-0">
            <i className="bi bi-clock-history me-1" aria-hidden="true" />
            Estimasi respons awal: 1×24 jam pada hari kerja. Untuk kendala mendesak, hubungi IT
            Support di ext. 110.
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedTicket)}
        onClose={() => {
          setSelectedId(null)
          setComment('')
          setCommentError(null)
        }}
        title={selectedTicket ? `${selectedTicket.id} · Detail tiket` : 'Detail tiket'}
        subtitle={selectedTicket?.subject}
        icon="bi-headset"
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-light"
              onClick={() => {
                setSelectedId(null)
                setComment('')
              }}
            >
              Tutup
            </button>
            {isAdmin && selectedTicket && selectedTicket.status !== 'selesai' ? (
              <button
                type="button"
                className="btn btn-success"
                onClick={() => handleStatus('selesai')}
              >
                <i className="bi bi-check2-circle me-1" aria-hidden="true" />
                Tandai selesai
              </button>
            ) : null}
          </>
        }
      >
        {selectedTicket ? (
          <>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <Badge tone={ticketStatusTone[selectedTicket.status]} dot>
                {ticketStatusLabel[selectedTicket.status]}
              </Badge>
              <Badge tone={ticketPriorityTone[selectedTicket.priority]}>
                Prioritas {ticketPriorityLabel[selectedTicket.priority]}
              </Badge>
              <Badge tone="secondary">
                <i className={`bi ${ticketCategoryIcon[selectedTicket.category]} me-1`} aria-hidden="true" />
                {selectedTicket.category}
              </Badge>
              <span className="small text-secondary ms-auto">
                Diperbarui {timeAgo(selectedTicket.updatedAt)}
              </span>
            </div>

            {isAdmin ? (
              <div className="row g-2 p-3 bg-body-tertiary rounded-3 mb-3">
                <div className="col-sm-6">
                  <label className="form-label small" htmlFor="detail-status">
                    Status tiket
                  </label>
                  <select
                    id="detail-status"
                    className="form-select form-select-sm"
                    value={selectedTicket.status}
                    onChange={(event) => handleStatus(event.target.value as TicketStatus)}
                  >
                    <option value="terbuka">Terbuka</option>
                    <option value="diproses">Diproses</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </div>
                <div className="col-sm-6">
                  <label className="form-label small" htmlFor="detail-assignee">
                    Ditugaskan kepada
                  </label>
                  <select
                    id="detail-assignee"
                    className="form-select form-select-sm"
                    value={selectedTicket.assigneeId ?? ''}
                    onChange={(event) => handleAssignee(event.target.value)}
                  >
                    <option value="">Belum ditugaskan</option>
                    {db.users
                      .filter((employee) => employee.active)
                      .map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} — {employee.position}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : null}

            <div className="row g-2 mb-3">
              <div className="col-sm-6">
                <div className="detail-box">
                  <span>Pelapor</span>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <Avatar
                      name={userById(selectedTicket.requesterId)?.name ?? 'Karyawan'}
                      size={26}
                    />
                    <strong>{userById(selectedTicket.requesterId)?.name ?? 'Karyawan'}</strong>
                  </div>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="detail-box">
                  <span>Penanggung jawab</span>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    {selectedTicket.assigneeId ? (
                      <>
                        <Avatar
                          name={userById(selectedTicket.assigneeId)?.name ?? 'Tim IT'}
                          size={26}
                        />
                        <strong>
                          {userById(selectedTicket.assigneeId)?.name ?? 'Tim IT'}
                        </strong>
                      </>
                    ) : (
                      <span className="text-secondary">Belum ditugaskan</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="detail-box">
                  <span>Dibuat</span>
                  <strong>{formatDateTime(selectedTicket.createdAt)}</strong>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="detail-box">
                  <span>Terakhir diperbarui</span>
                  <strong>{formatDateTime(selectedTicket.updatedAt)}</strong>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="small text-secondary mb-1">Deskripsi kendala</div>
              <div className="ticket-description">{selectedTicket.description}</div>
            </div>

            <div className="d-flex align-items-center justify-content-between mb-2">
              <h4 className="h6 mb-0">
                <i className="bi bi-chat-left-text me-1" aria-hidden="true" />
                Diskusi ({selectedTicket.comments.length})
              </h4>
            </div>
            <div className="comment-list">
              {selectedTicket.comments.length === 0 ? (
                <div className="text-secondary small py-3 text-center border rounded-3">
                  Belum ada komentar. Mulai diskusi dengan tim IT di bawah.
                </div>
              ) : (
                selectedTicket.comments.map((item) => {
                  const author = userById(item.authorId)
                  const own = item.authorId === user.id
                  return (
                    <div
                      key={item.id}
                      className={`comment-item ${own ? 'comment-own' : ''}`}
                    >
                      <Avatar name={author?.name ?? 'Pengguna'} size={32} />
                      <div className="min-w-0 flex-grow-1">
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <span className="fw-semibold small">
                            {author?.name ?? 'Pengguna'}
                            {own ? ' (Anda)' : ''}
                          </span>
                          {author?.role === 'admin' ? (
                            <Badge tone="primary">Admin</Badge>
                          ) : null}
                          <span className="small text-secondary ms-auto">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>
                        <div className="small comment-body">{item.body}</div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <form className="mt-3" onSubmit={handleComment}>
              <label className="form-label small" htmlFor="ticket-comment">
                Tambahkan komentar
              </label>
              <div className="input-group">
                <textarea
                  id="ticket-comment"
                  className="form-control"
                  rows={2}
                  placeholder="Tulis pembaruan, pertanyaan, atau konfirmasi..."
                  value={comment}
                  onChange={(event) => {
                    setComment(event.target.value)
                    setCommentError(null)
                  }}
                />
                <button type="submit" className="btn btn-primary" aria-label="Kirim komentar">
                  <i className="bi bi-send" aria-hidden="true" />
                </button>
              </div>
              {commentError ? (
                <div className="text-danger small mt-1">{commentError}</div>
              ) : (
                <div className="form-text">
                  Komentar akan terlihat oleh pelapor dan tim IT.
                </div>
              )}
            </form>
          </>
        ) : null}
      </Modal>
    </Page>
  )
}
