import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  Modal,
  Page,
  useToast,
} from '../components/ui'
import { documentTone, fileTypeIcon } from '../lib/labels'
import { formatDate, formatSize, sum, timeAgo } from '../lib/utils'
import type { DocumentCategory, DocumentItem, FileType } from '../types'

const categories: Array<'Semua' | DocumentCategory> = [
  'Semua',
  'Kebijakan',
  'Formulir',
  'SOP',
  'Template',
  'Lainnya',
]

const fileTypes: FileType[] = ['PDF', 'DOCX', 'XLSX', 'PPTX']

interface DocumentForm {
  name: string
  description: string
  category: DocumentCategory
  fileType: FileType
  sizeKb: number
}

const emptyForm: DocumentForm = {
  name: '',
  description: '',
  category: 'Kebijakan',
  fileType: 'PDF',
  sizeKb: 500,
}

const typeFromFilename = (filename: string): FileType => {
  const extension = filename.split('.').pop()?.toUpperCase() ?? ''
  if (extension === 'DOC' || extension === 'DOCX') return 'DOCX'
  if (extension === 'XLS' || extension === 'XLSX' || extension === 'CSV') return 'XLSX'
  if (extension === 'PPT' || extension === 'PPTX') return 'PPTX'
  return 'PDF'
}

export default function Documents() {
  const { db, isAdmin, addDocument, deleteDocument, incrementDownload } = useApp()
  const notify = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryParam = searchParams.get('q') ?? ''

  const [search, setSearch] = useState(queryParam)
  const [category, setCategory] = useState<'Semua' | DocumentCategory>('Semua')
  const [selected, setSelected] = useState<DocumentItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<DocumentForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null)

  useEffect(() => {
    if (queryParam) setSearch(queryParam)
  }, [queryParam])

  const userById = (id: string) => db.users.find((user) => user.id === id)

  const documents = useMemo(() => {
    const term = search.trim().toLowerCase()
    return [...db.documents]
      .filter((document) => {
        const matchesCategory = category === 'Semua' || document.category === category
        const matchesTerm =
          !term ||
          document.name.toLowerCase().includes(term) ||
          document.description.toLowerCase().includes(term) ||
          document.fileType.toLowerCase().includes(term)
        return matchesCategory && matchesTerm
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [category, db.documents, search])

  const latestUpdate = useMemo(
    () =>
      [...db.documents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.updatedAt,
    [db.documents],
  )

  const totalDownloads = sum(db.documents.map((document) => document.downloads))
  const selectedDocument = selected
    ? db.documents.find((document) => document.id === selected.id) ?? null
    : null

  const openCreate = () => {
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  const handleFile = (file: File | null) => {
    if (!file) return
    setForm((previous) => ({
      ...previous,
      name: previous.name || file.name.replace(/\.[^.]+$/, ''),
      fileType: typeFromFilename(file.name),
      sizeKb: Math.max(1, Math.round(file.size / 1024)),
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setFormError('Nama dokumen wajib diisi.')
      return
    }
    if (form.sizeKb <= 0) {
      setFormError('Ukuran dokumen harus lebih besar dari nol.')
      return
    }
    addDocument({
      name: form.name.trim(),
      description: form.description.trim() || 'Tidak ada deskripsi.',
      category: form.category,
      fileType: form.fileType,
      sizeKb: form.sizeKb,
    })
    notify('Dokumen berhasil ditambahkan ke repositori.')
    setFormOpen(false)
  }

  const handleDownload = (document: DocumentItem) => {
    incrementDownload(document.id)
    notify(`Unduhan “${document.name}” dicatat. (Demo: tidak ada file fisik yang diunduh.)`, 'info')
  }

  return (
    <Page
      title="Manajemen Dokumen"
      subtitle="Repositori kebijakan, formulir, SOP, dan template resmi perusahaan"
      actions={
        isAdmin ? (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-cloud-arrow-up me-1" aria-hidden="true" />
            Tambah dokumen
          </button>
        ) : (
          <a href="mailto:it.support@nusantara.co.id" className="btn btn-outline-secondary">
            <i className="bi bi-envelope me-1" aria-hidden="true" />
            Minta dokumen
          </a>
        )
      }
    >
      <div className="row g-2 mb-1">
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3">
              <div className="d-flex align-items-center gap-2 text-secondary small mb-1">
                <i className="bi bi-folder2-open text-primary" aria-hidden="true" />
                Total dokumen
              </div>
              <div className="fs-4 fw-bold">{db.documents.length}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3">
              <div className="d-flex align-items-center gap-2 text-secondary small mb-1">
                <i className="bi bi-download text-success" aria-hidden="true" />
                Total unduhan
              </div>
              <div className="fs-4 fw-bold">{totalDownloads}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3">
              <div className="d-flex align-items-center gap-2 text-secondary small mb-1">
                <i className="bi bi-tags text-warning" aria-hidden="true" />
                Kategori tersedia
              </div>
              <div className="fs-4 fw-bold">{categories.length - 1}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body py-3">
              <div className="d-flex align-items-center gap-2 text-secondary small mb-1">
                <i className="bi bi-clock-history text-info" aria-hidden="true" />
                Pembaruan terakhir
              </div>
              <div className="fs-6 fw-bold">
                {latestUpdate ? timeAgo(latestUpdate) : 'Belum ada'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-lg-7">
              <label className="form-label small text-secondary" htmlFor="document-search">
                Cari dokumen
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" aria-hidden="true" />
                </span>
                <input
                  id="document-search"
                  type="search"
                  className="form-control"
                  placeholder="Cari nama, deskripsi, atau tipe dokumen..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <label className="form-label small text-secondary" htmlFor="document-category">
                Kategori
              </label>
              <select
                id="document-category"
                className="form-select"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as 'Semua' | DocumentCategory)
                }
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item === 'Semua' ? 'Semua kategori' : item}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-lg-2">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch('')
                  setCategory('Semua')
                  setSearchParams({}, { replace: true })
                }}
              >
                <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />
                Reset
              </button>
            </div>
          </div>
          <div className="mt-2 small text-secondary">
            Menampilkan <strong>{documents.length}</strong> dari {db.documents.length} dokumen
            {search ? ` untuk “${search}”` : ''}.
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {documents.length === 0 ? (
            <EmptyState
              icon="bi-folder-x"
              title="Dokumen tidak ditemukan"
              message="Coba ubah kata kunci atau pilih kategori lain."
              action={
                isAdmin ? (
                  <button type="button" className="btn btn-primary" onClick={openCreate}>
                    Tambah dokumen
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 portal-table">
                <thead>
                  <tr>
                    <th scope="col">Dokumen</th>
                    <th scope="col">Kategori</th>
                    <th scope="col">Tipe</th>
                    <th scope="col">Ukuran</th>
                    <th scope="col">Diperbarui</th>
                    <th scope="col" className="text-end">
                      Unduhan
                    </th>
                    <th scope="col" className="text-end">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => {
                    const owner = userById(document.ownerId)
                    return (
                      <tr key={document.id} className="clickable-row" onClick={() => setSelected(document)}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className={`file-icon file-${document.fileType.toLowerCase()}`}>
                              <i
                                className={`bi ${fileTypeIcon(document.fileType)}`}
                                aria-hidden="true"
                              />
                            </span>
                            <div className="min-w-0">
                              <div className="fw-semibold">{document.name}</div>
                              <div className="small text-secondary text-truncate document-description">
                                {document.description}
                              </div>
                              <div className="small text-secondary">
                                Diunggah oleh {owner?.name ?? 'Tim Internal'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge tone={documentTone[document.category]}>{document.category}</Badge>
                        </td>
                        <td>
                          <span className="badge text-bg-light border">{document.fileType}</span>
                        </td>
                        <td className="small text-secondary text-nowrap">
                          {formatSize(document.sizeKb)}
                        </td>
                        <td className="small text-secondary text-nowrap">
                          {formatDate(document.updatedAt.slice(0, 10))}
                        </td>
                        <td className="text-end small">{document.downloads}</td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              title="Unduh dokumen"
                              aria-label={`Unduh ${document.name}`}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleDownload(document)
                              }}
                            >
                              <i className="bi bi-download" aria-hidden="true" />
                            </button>
                            {isAdmin ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                title="Hapus dokumen"
                                aria-label={`Hapus ${document.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setDeleteTarget(document)
                                }}
                              >
                                <i className="bi bi-trash" aria-hidden="true" />
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

      <p className="small text-secondary mt-2 mb-0">
        <i className="bi bi-info-circle me-1" aria-hidden="true" />
        Portal demo: fitur unduh disimulasikan, namun jumlah unduhan tetap tercatat.
      </p>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Tambah dokumen"
        subtitle="Dokumen akan tersedia untuk seluruh karyawan."
        icon="bi-cloud-arrow-up"
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-light" onClick={() => setFormOpen(false)}>
              Batal
            </button>
            <button type="submit" form="document-form" className="btn btn-primary">
              <i className="bi bi-check2 me-1" aria-hidden="true" />
              Simpan dokumen
            </button>
          </>
        }
      >
        <form id="document-form" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <div className="alert alert-danger py-2 small" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="mb-3">
            <label className="form-label" htmlFor="document-file">
              Pilih file (opsional)
            </label>
            <input
              id="document-file"
              type="file"
              className="form-control"
              onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            />
            <div className="form-text">
              Nama, tipe, dan ukuran akan terisi otomatis. File tidak benar-benar diunggah pada
              versi demo.
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="document-name">
              Nama dokumen <span className="text-danger">*</span>
            </label>
            <input
              id="document-name"
              className="form-control"
              placeholder="Contoh: Kebijakan Perjalanan Dinas"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>
          <div className="row g-3 mb-3">
            <div className="col-sm-4">
              <label className="form-label" htmlFor="document-form-category">
                Kategori
              </label>
              <select
                id="document-form-category"
                className="form-select"
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value as DocumentCategory })
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
            <div className="col-sm-4">
              <label className="form-label" htmlFor="document-type">
                Tipe file
              </label>
              <select
                id="document-type"
                className="form-select"
                value={form.fileType}
                onChange={(event) =>
                  setForm({ ...form, fileType: event.target.value as FileType })
                }
              >
                {fileTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label" htmlFor="document-size">
                Ukuran (KB)
              </label>
              <input
                id="document-size"
                type="number"
                min={1}
                className="form-control"
                value={form.sizeKb}
                onChange={(event) =>
                  setForm({ ...form, sizeKb: Number(event.target.value) })
                }
              />
            </div>
          </div>
          <div className="mb-0">
            <label className="form-label" htmlFor="document-description">
              Deskripsi
            </label>
            <textarea
              id="document-description"
              className="form-control"
              rows={3}
              placeholder="Jelaskan isi dan kegunaan dokumen ini..."
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedDocument)}
        onClose={() => setSelected(null)}
        title="Detail dokumen"
        icon="bi-file-earmark-text"
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-light" onClick={() => setSelected(null)}>
              Tutup
            </button>
            {selectedDocument ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleDownload(selectedDocument)}
              >
                <i className="bi bi-download me-1" aria-hidden="true" />
                Unduh dokumen
              </button>
            ) : null}
          </>
        }
      >
        {selectedDocument ? (
          <>
            <div className="d-flex align-items-start gap-3 mb-3">
              <span
                className={`file-icon file-icon-lg file-${selectedDocument.fileType.toLowerCase()}`}
              >
                <i
                  className={`bi ${fileTypeIcon(selectedDocument.fileType)}`}
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0">
                <h3 className="h5 mb-1">{selectedDocument.name}</h3>
                <div className="d-flex flex-wrap gap-2">
                  <Badge tone={documentTone[selectedDocument.category]}>
                    {selectedDocument.category}
                  </Badge>
                  <Badge tone="secondary">{selectedDocument.fileType}</Badge>
                  <Badge tone="info">{formatSize(selectedDocument.sizeKb)}</Badge>
                </div>
              </div>
            </div>
            <p className="text-secondary">{selectedDocument.description}</p>
            <div className="row g-2">
              <div className="col-6">
                <div className="detail-box">
                  <span>Diunggah oleh</span>
                  <strong>{userById(selectedDocument.ownerId)?.name ?? 'Tim Internal'}</strong>
                </div>
              </div>
              <div className="col-6">
                <div className="detail-box">
                  <span>Terakhir diperbarui</span>
                  <strong>{formatDate(selectedDocument.updatedAt.slice(0, 10), 'long')}</strong>
                </div>
              </div>
              <div className="col-6">
                <div className="detail-box">
                  <span>Total unduhan</span>
                  <strong>{selectedDocument.downloads} kali</strong>
                </div>
              </div>
              <div className="col-6">
                <div className="detail-box">
                  <span>Kategori</span>
                  <strong>{selectedDocument.category}</strong>
                </div>
              </div>
            </div>
            <div className="alert alert-light border mt-3 mb-0 small">
              <i className="bi bi-shield-lock me-1 text-primary" aria-hidden="true" />
              Dokumen ini hanya untuk keperluan internal PT Nusantara Digital.
            </div>
          </>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus dokumen?"
        message={`Dokumen “${deleteTarget?.name ?? ''}” akan dihapus dari repositori dan tidak dapat dipulihkan.`}
        confirmLabel="Hapus dokumen"
        onConfirm={() => {
          if (deleteTarget) {
            deleteDocument(deleteTarget.id)
            notify('Dokumen berhasil dihapus.', 'info')
          }
        }}
      />
    </Page>
  )
}
