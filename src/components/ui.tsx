import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { avatarGradient, classNames, initials } from '../lib/utils'
import type { Tone } from '../lib/labels'
import type { Presence } from '../types'

export function Avatar({
  name,
  size = 40,
  presence,
  className,
  src,
}: {
  name: string
  size?: number
  presence?: Presence
  className?: string
  src?: string
}) {
  const { db } = useApp()
  const image = src ?? db.users.find((item) => item.name === name)?.avatar
  const dotSize = Math.max(8, Math.round(size * 0.24))
  return (
    <span
      className={classNames('portal-avatar flex-shrink-0', className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        background: image ? 'transparent' : avatarGradient(name),
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {image ? (
        <img
          src={image}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        initials(name)
      )}
      {presence ? (
        <span
          className={`presence-dot presence-${presence}`}
          style={{ width: dotSize, height: dotSize }}
          title={presence}
        />
      ) : null}
    </span>
  )
}

export function Badge({
  children,
  tone = 'secondary',
  className,
  dot = false,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  dot?: boolean
}) {
  return (
    <span className={classNames('badge', `badge-soft-${tone}`, className)}>
      {dot ? <span className={`badge-dot bg-${tone}`} /> : null}
      {children}
    </span>
  )
}

export function Page({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <div className="app-content-header">
        <div className="container-fluid">
          <div className="row g-3 align-items-center">
            <div className="col">
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-1 small">
                  <li className="breadcrumb-item">
                    <Link to="/">Portal</Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    {title}
                  </li>
                </ol>
              </nav>
              <h1 className="mb-0 fs-3">{title}</h1>
              {subtitle ? <p className="text-secondary small mb-0 mt-1">{subtitle}</p> : null}
            </div>
            {actions ? (
              <div className="col-auto d-flex flex-wrap gap-2 page-actions">{actions}</div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="app-content">
        <div className="container-fluid">{children}</div>
      </div>
    </>
  )
}

export function SmallBox({
  label,
  value,
  icon,
  tone,
  to,
  hint = 'Lihat detail',
  footer = true,
}: {
  label: string
  value: ReactNode
  icon: string
  tone: Tone
  to: string
  hint?: string
  footer?: boolean
}) {
  return (
    <div className={`small-box text-bg-${tone}`}>
      <div className="inner">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
      <i className={classNames('small-box-icon bi', icon)} aria-hidden="true" />
      {footer ? (
        <Link to={to} className="small-box-footer text-white">
          {hint} <i className="bi bi-arrow-right-circle ms-1" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  )
}

export function Modal({
  open,
  title,
  subtitle,
  icon,
  size = 'md',
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  subtitle?: string
  icon?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <div className={`modal-dialog modal-${size} modal-dialog-centered modal-dialog-scrollable`}>
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header">
              <div>
                <h5 className="modal-title d-flex align-items-center gap-2" id={titleId}>
                  {icon ? <i className={`bi ${icon} text-primary`} aria-hidden="true" /> : null}
                  {title}
                </h5>
                {subtitle ? <div className="small text-secondary mt-1">{subtitle}</div> : null}
              </div>
              <button type="button" className="btn-close" aria-label="Tutup" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer ? <div className="modal-footer">{footer}</div> : null}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  tone = 'danger',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary' | 'success' | 'warning'
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      title={title}
      icon="bi-exclamation-triangle"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-light" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn-${tone}`}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="mb-0 text-secondary">{message}</p>
    </Modal>
  )
}

export function EmptyState({
  icon = 'bi-inbox',
  title,
  message,
  action,
}: {
  icon?: string
  title: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className="text-center py-5 px-3">
      <div className="empty-icon mx-auto mb-3">
        <i className={`bi ${icon}`} aria-hidden="true" />
      </div>
      <h6 className="mb-1">{title}</h6>
      {message ? <p className="text-secondary small mb-3">{message}</p> : null}
      {action}
    </div>
  )
}

export function Dropdown({
  trigger,
  children,
  align = 'end',
  menuClassName,
  label,
  buttonClassName,
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  menuClassName?: string
  label?: string
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="dropdown" ref={containerRef}>
      <button
        type="button"
        className={classNames('nav-link btn btn-link', buttonClassName)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((previous) => !previous)}
      >
        {trigger}
      </button>
      <div
        className={classNames(
          'dropdown-menu',
          `dropdown-menu-${align}`,
          menuClassName,
          open && 'show',
        )}
        onClick={(event) => {
          const target = event.target as HTMLElement
          if (target.closest('a, button')) close()
        }}
      >
        {children}
      </div>
    </div>
  )
}

type ToastTone = 'success' | 'danger' | 'warning' | 'info'

interface ToastItem {
  id: string
  message: string
  tone: ToastTone
}

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null)

const toastIcon: Record<ToastTone, string> = {
  success: 'bi-check-circle-fill',
  danger: 'bi-x-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setToasts((previous) => [...previous, { id, message, tone }])
      window.setTimeout(() => remove(id), 4200)
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="toast-container position-fixed bottom-0 end-0 p-3"
        style={{ zIndex: 1090 }}
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast show align-items-center text-bg-${toast.tone} border-0 mb-2`}
            role="alert"
          >
            <div className="d-flex">
              <div className="toast-body d-flex align-items-center gap-2">
                <i className={`bi ${toastIcon[toast.tone]}`} aria-hidden="true" />
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                aria-label="Tutup notifikasi"
                onClick={() => remove(toast.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return context
}

export function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: ReactNode
}) {
  return (
    <div className="d-flex align-items-start gap-3 py-2">
      <div className="info-row-icon">
        <i className={`bi ${icon}`} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="text-secondary small">{label}</div>
        <div className="fw-medium text-break">{value}</div>
      </div>
    </div>
  )
}
