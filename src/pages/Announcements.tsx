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
import { announcementTone, type Tone } from '../lib/labels'
import { classNames, formatDateTime, timeAgo } from '../lib/utils'
import type { Announcement, AnnouncementCategory } from '../types'

const categories: Array<'Semua' | AnnouncementCategory> = ['Semua', 'Umum', 'HR', 'IT', 'Kegiatan']

interface AnnouncementForm {
  title: string
  body: string
  category: AnnouncementCategory
  pinned: boolean
}

const emptyForm: AnnouncementForm = {
  title: '',
  body: '',
  category: 'Umum',
  pinned: false,
}

export default function Announcements() {
  const {
    db,
    currentUser,
    isAdmin,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePinAnnouncement,
    markAnnouncementRead,
    markAllAnnouncementsRead,
  } = useApp()
  const notify = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const queryParam = searchParams.get('q') ?? ''
  const [search, setSearch] = useState(queryParam)
  const [category, setCategory] = useState<'Semua' | AnnouncementCategory>('Semua')
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState<AnnouncementForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Announcement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

  useEffect(() => {
    if (queryParam) setSearch(queryParam)
  }, [queryParam])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('baru') === '1' && isAdmin) {
      openCreate()
      const next = new URLSearchParams(searchParams)
      next.delete('baru')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAdmin])

  const userById = (id: string) => db.users.find((user) => user.id === id)

  const unreadCount = db.announcements.filter(
    (announcement) => !announcement.readBy.includes(currentUser!.id),
  ).length

  const visibleAnnouncements = useMemo(() => {
    const term = search.trim().toLowerCase()
    return [...db.announcements]
      .filter((announcement) => {
        const matchesCategory = category === 'Semua' || announcement.category === category
        const matchesUnread =
          !onlyUnread || !announcement.readBy.includes(currentUser!.id)
        const matchesTerm =
          !term ||
          announcement.title.toLowerCase().includes(term) ||
          announcement.body.toLowerCase().includes(term)
        return matchesCategory && matchesUnread && matchesTerm
      })
      .sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt),
      )
  }, [category, currentUser, db.announcements, onlyUnread, search])

  const selectedAnnouncement = selected
    ? db.announcements.find((announcement) => announcement.id === selected.id) ?? null
    : null

  const openDetail = (announcement: Announcement) => {
    markAnnouncementRead(announcement.id)
    setSelected(announcement)
  }

  const openEdit = (announcement: Announcement) => {
    setEditing(announcement)
    setForm({
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      pinned: announcement.pinned,
    })
    setFormError(null)
    setFormOpen(true)
    setSelected(null)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setFormError('Judul pengumuman wajib diisi.')
      return
    }
    if (form.body.trim().length < 20) {
      setFormError('Isi pengumuman minimal 20 karakter.')
      return
    }
    if (editing) {
      updateAnnouncement(editing.id, {
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        pinned: form.pinned,
      })
      notify('Pengumuman berhasil diperbarui.')
    } else {
      addAnnouncement({
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        pinned: form.pinned,
      })
      notify('Pengumuman baru berhasil dipublikasikan.')
    }
    setFormOpen(false)
  }

  return (
    <Page
      title="Pengumuman"
      subtitle="Informasi resmi, kebijakan, dan kabar terbaru dari perusahaan"
      actions={
        <>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => {
              markAllAnnouncementsRead()
              notify('Semua pengumuman ditandai sudah dibaca.')
            }}
            disabled={unreadCount === 0}
          >
            <i className="bi bi-check2-all me-1" aria-hidden="true" />
            Tandai semua dibaca
          </button>
          {isAdmin ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Buat pengumuman
            </button>
          ) : null}
        </>
      }
    >
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-lg-5">
              <label className="form-label small text-secondary" htmlFor="announcement-search">
                Cari pengumuman
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" aria-hidden="true" />
                </span>
                <input
                  id="announcement-search"
                  type="search"
                  className="form-control"
                  placeholder="Cari judul atau isi pengumuman..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <label className="form-label small text-secondary" htmlFor="announcement-category">
                Kategori
              </label>
              <select
                id="announcement-category"
                className="form-select"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as 'Semua' | AnnouncementCategory)
                }
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item === 'Semua' ? 'Semua kategori' : item}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-lg-4">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="form-check mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="only-unread"
                    checked={onlyUnread}
                    onChange={(event) => setOnlyUnread(event.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="only-unread">
                    Hanya belum dibaca
                  </label>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Badge tone="secondary">{visibleAnnouncements.length} pengumuman</Badge>
                  <Badge tone="danger">{unreadCount} baru</Badge>
                </div>
              </div>
            </div>
          </div>
          {searchParams.get('q') && search ? (
            <div className="mt-2 small text-secondary">
              Menampilkan hasil untuk “{search}”.{' '}
              <button
                type="button"
                className="btn btn-link btn-sm p-0"
                onClick={() => {
                  setSearch('')
                  setSearchParams({}, { replace: true })
                }}
              >
                Bersihkan pencarian
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {visibleAnnouncements.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <EmptyState
              icon="bi-megaphone"
              title="Tidak ada pengumuman"
              message="Coba ubah kata kunci atau filter kategori yang dipilih."
              action={
                isAdmin ? (
                  <button type="button" className="btn btn-primary" onClick={openCreate}>
                    Buat pengumuman pertama
                  </button>
                ) : undefined
              }
            />
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {visibleAnnouncements.map((announcement) => {
            const author = userById(announcement.authorId)
            const unread = !announcement.readBy.includes(currentUser!.id)
            const categoryTone: Tone = announcementTone[announcement.category]
            return (
              <article
                key={announcement.id}
                className={classNames(
                  'card border-0 shadow-sm announcement-card',
                  announcement.pinned && 'is-pinned',
                )}
              >
                <div className="card-body">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <Badge tone={categoryTone}>{announcement.category}</Badge>
                    {announcement.pinned ? (
                      <Badge tone="warning">
                        <i className="bi bi-pin-angle-fill me-1" aria-hidden="true" />
                        Disematkan
                      </Badge>
                    ) : null}
                    {unread ? <Badge tone="danger">Belum dibaca</Badge> : null}
                    <span className="small text-secondary ms-auto">
                      <i className="bi bi-clock me-1" aria-hidden="true" />
                      {timeAgo(announcement.createdAt)}
                    </span>
                  </div>

                  <h2 className="h4 mt-3 mb-2">
                    <button
                      type="button"
                      className="btn btn-link p-0 text-start announcement-title"
                      onClick={() => openDetail(announcement)}
                    >
                      {announcement.title}
                    </button>
                  </h2>
                  <p className="text-secondary announcement-preview mb-3">{announcement.body}</p>

                  <div className="d-flex flex-wrap align-items-center gap-2 border-top pt-3">
                    <Avatar name={author?.name ?? 'Tim Internal'} size={32} />
                    <div className="min-w-0">
                      <div className="small fw-semibold">{author?.name ?? 'Tim Internal'}</div>
                      <div className="small text-secondary">
                        {author?.position ?? 'Perusahaan'} ·{' '}
                        {formatDateTime(announcement.createdAt)}
                      </div>
                    </div>
                    <div className="ms-auto d-flex flex-wrap align-items-center gap-1">
                      {unread ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-light"
                          onClick={() => {
                            markAnnouncementRead(announcement.id)
                            notify('Pengumuman ditandai sudah dibaca.', 'info')
                          }}
                        >
                          <i className="bi bi-check2 me-1" aria-hidden="true" />
                          Tandai dibaca
                        </button>
                      ) : (
                        <span className="small text-success me-1">
                          <i className="bi bi-check2-circle me-1" aria-hidden="true" />
                          Sudah dibaca
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => openDetail(announcement)}
                      >
                        Baca
                      </button>
                      {isAdmin ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            title={announcement.pinned ? 'Lepas sematan' : 'Sematkan'}
                            aria-label={announcement.pinned ? 'Lepas sematan' : 'Sematkan'}
                            onClick={() => {
                              togglePinAnnouncement(announcement.id)
                              notify(
                                announcement.pinned
                                  ? 'Sematan pengumuman dilepas.'
                                  : 'Pengumuman disematkan.',
                                'info',
                              )
                            }}
                          >
                            <i
                              className={`bi ${announcement.pinned ? 'bi-pin-fill' : 'bi-pin-angle'}`}
                              aria-hidden="true"
                            />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            title="Edit pengumuman"
                            aria-label="Edit pengumuman"
                            onClick={() => openEdit(announcement)}
                          >
                            <i className="bi bi-pencil" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            title="Hapus pengumuman"
                            aria-label="Hapus pengumuman"
                            onClick={() => setDeleteTarget(announcement)}
                          >
                            <i className="bi bi-trash" aria-hidden="true" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit pengumuman' : 'Buat pengumuman baru'}
        subtitle="Pengumuman akan langsung tampil untuk seluruh karyawan."
        icon="bi-megaphone"
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-light" onClick={() => setFormOpen(false)}>
              Batal
            </button>
            <button type="submit" form="announcement-form" className="btn btn-primary">
              <i className="bi bi-send me-1" aria-hidden="true" />
              {editing ? 'Simpan perubahan' : 'Publikasikan'}
            </button>
          </>
        }
      >
        <form id="announcement-form" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <div className="alert alert-danger py-2 small" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="mb-3">
            <label className="form-label" htmlFor="announcement-title">
              Judul <span className="text-danger">*</span>
            </label>
            <input
              id="announcement-title"
              className="form-control"
              placeholder="Contoh: Kebijakan kerja hybrid mulai November"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </div>
          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label className="form-label" htmlFor="announcement-form-category">
                Kategori
              </label>
              <select
                id="announcement-form-category"
                className="form-select"
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value as AnnouncementCategory })
                }
              >
                {categories
                  .filter((item) => item !== 'Semua')
                  .map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
              </select>
            </div>
            <div className="col-sm-6 d-flex align-items-end">
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="announcement-pinned"
                  checked={form.pinned}
                  onChange={(event) => setForm({ ...form, pinned: event.target.checked })}
                />
                <label className="form-check-label" htmlFor="announcement-pinned">
                  Sematkan di bagian atas
                </label>
              </div>
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="announcement-body">
              Isi pengumuman <span className="text-danger">*</span>
            </label>
            <textarea
              id="announcement-body"
              className="form-control"
              rows={8}
              placeholder="Tuliskan detail informasi, tanggal penting, dan tindakan yang perlu dilakukan karyawan..."
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              required
            />
            <div className="form-text">{form.body.trim().length} karakter</div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedAnnouncement)}
        onClose={() => setSelected(null)}
        title={selectedAnnouncement?.title ?? 'Detail pengumuman'}
        subtitle={
          selectedAnnouncement
            ? `${selectedAnnouncement.category} · ${formatDateTime(selectedAnnouncement.createdAt)}`
            : undefined
        }
        icon="bi-megaphone"
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-light" onClick={() => setSelected(null)}>
              Tutup
            </button>
            {isAdmin && selectedAnnouncement ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openEdit(selectedAnnouncement)}
              >
                <i className="bi bi-pencil me-1" aria-hidden="true" />
                Edit pengumuman
              </button>
            ) : null}
          </>
        }
      >
        {selectedAnnouncement ? (
          <>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <Badge tone={announcementTone[selectedAnnouncement.category]}>
                {selectedAnnouncement.category}
              </Badge>
              {selectedAnnouncement.pinned ? (
                <Badge tone="warning">
                  <i className="bi bi-pin-angle-fill me-1" aria-hidden="true" />
                  Disematkan
                </Badge>
              ) : null}
              <span className="small text-secondary ms-auto">
                {timeAgo(selectedAnnouncement.createdAt)}
              </span>
            </div>
            <div className="announcement-detail">{selectedAnnouncement.body}</div>
            <div className="d-flex align-items-center gap-2 border-top mt-4 pt-3">
              <Avatar
                name={userById(selectedAnnouncement.authorId)?.name ?? 'Tim Internal'}
                size={36}
              />
              <div>
                <div className="small fw-semibold">
                  {userById(selectedAnnouncement.authorId)?.name ?? 'Tim Internal'}
                </div>
                <div className="small text-secondary">
                  {userById(selectedAnnouncement.authorId)?.position ?? 'Perusahaan'}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus pengumuman?"
        message={`Pengumuman “${deleteTarget?.title ?? ''}” akan dihapus permanen dan tidak dapat dikembalikan.`}
        confirmLabel="Hapus pengumuman"
        onConfirm={() => {
          if (deleteTarget) {
            deleteAnnouncement(deleteTarget.id)
            notify('Pengumuman berhasil dihapus.', 'info')
          }
        }}
      />
    </Page>
  )
}
