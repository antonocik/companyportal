import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Announcement,
  AnnouncementCategory,
  Attendance,
  Db,
  Department,
  DocumentCategory,
  DocumentItem,
  FileType,
  LeaveStatus,
  LeaveType,
  Role,
  Ticket,
  TicketComment,
  TicketPriority,
  TicketStatus,
  User,
  WorkMode,
} from '../types'
import { createSeedDb } from '../data/seed'
import { dateISO, timeNow, uid, workingDays } from '../lib/utils'

const DB_KEY = 'nusantara-portal-db-v1'
const SESSION_KEY = 'nusantara-portal-session-v1'

function loadDb(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (parsed.users?.length && parsed.tickets && parsed.attendance) return parsed
    }
  } catch {
    // Abaikan data rusak dan mulai ulang dengan data demo.
  }
  return createSeedDb()
}

interface LoginResult {
  ok: boolean
  error?: string
}

interface MutationResult {
  ok: boolean
  error?: string
}

interface NewTicketInput {
  subject: string
  description: string
  category: Ticket['category']
  priority: TicketPriority
}

interface NewUserInput {
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

interface AppContextValue {
  db: Db
  currentUser: User | null
  isAdmin: boolean
  login: (email: string, password: string) => LoginResult
  logout: () => void
  resetDemoData: () => void
  updateProfile: (patch: Partial<Pick<User, 'name' | 'phone' | 'location' | 'avatar'>>) => void
  changePassword: (currentPassword: string, nextPassword: string) => MutationResult
  addUser: (input: NewUserInput) => MutationResult
  updateUser: (id: string, patch: Partial<User>) => MutationResult
  addAnnouncement: (input: {
    title: string
    body: string
    category: AnnouncementCategory
    pinned: boolean
  }) => void
  updateAnnouncement: (
    id: string,
    patch: Pick<Announcement, 'title' | 'body' | 'category' | 'pinned'>,
  ) => void
  deleteAnnouncement: (id: string) => void
  togglePinAnnouncement: (id: string) => void
  markAnnouncementRead: (id: string) => void
  markAllAnnouncementsRead: () => void
  addDocument: (input: {
    name: string
    description: string
    category: DocumentCategory
    fileType: FileType
    sizeKb: number
  }) => void
  deleteDocument: (id: string) => void
  incrementDownload: (id: string) => void
  createLeave: (input: {
    type: LeaveType
    startDate: string
    endDate: string
    reason: string
  }) => MutationResult
  reviewLeave: (id: string, status: Exclude<LeaveStatus, 'menunggu'>, note: string) => void
  cancelLeave: (id: string) => void
  clockIn: (workMode: WorkMode) => void
  clockOut: () => void
  createTicket: (input: NewTicketInput) => string
  updateTicket: (
    id: string,
    patch: Partial<Pick<Ticket, 'status' | 'assigneeId' | 'priority'>>,
  ) => void
  addTicketComment: (id: string, body: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db>(loadDb)
  const [sessionUserId, setSessionUserId] = useState<string | null>(() =>
    localStorage.getItem(SESSION_KEY),
  )

  useEffect(() => {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  }, [db])

  useEffect(() => {
    if (sessionUserId) localStorage.setItem(SESSION_KEY, sessionUserId)
    else localStorage.removeItem(SESSION_KEY)
  }, [sessionUserId])

  const currentUser = useMemo(
    () => db.users.find((user) => user.id === sessionUserId) ?? null,
    [db.users, sessionUserId],
  )

  const login = useCallback(
    (email: string, password: string): LoginResult => {
      const normalized = email.trim().toLowerCase()
      const user = db.users.find((item) => item.email.toLowerCase() === normalized)
      if (!user) return { ok: false, error: 'Email tidak terdaftar di portal perusahaan.' }
      if (!user.active) {
        return { ok: false, error: 'Akun ini sedang tidak aktif. Hubungi tim People & Culture.' }
      }
      if (user.password !== password) {
        return { ok: false, error: 'Kata sandi yang Anda masukkan salah.' }
      }
      setSessionUserId(user.id)
      return { ok: true }
    },
    [db.users],
  )

  const logout = useCallback(() => setSessionUserId(null), [])

  const resetDemoData = useCallback(() => {
    const fresh = createSeedDb()
    setDb(fresh)
    setSessionUserId((previous) =>
      previous && fresh.users.some((user) => user.id === previous) ? previous : null,
    )
  }, [])

  const updateProfile = useCallback(
    (patch: Partial<Pick<User, 'name' | 'phone' | 'location' | 'avatar'>>) => {
      if (!sessionUserId) return
      setDb((previous) => ({
        ...previous,
        users: previous.users.map((user) =>
          user.id === sessionUserId ? { ...user, ...patch } : user,
        ),
      }))
    },
    [sessionUserId],
  )

  const changePassword = useCallback(
    (currentPassword: string, nextPassword: string): MutationResult => {
      if (!sessionUserId) return { ok: false, error: 'Sesi Anda telah berakhir.' }
      const user = db.users.find((item) => item.id === sessionUserId)
      if (!user) return { ok: false, error: 'Pengguna tidak ditemukan.' }
      if (user.password !== currentPassword) {
        return { ok: false, error: 'Kata sandi saat ini tidak sesuai.' }
      }
      setDb((previous) => ({
        ...previous,
        users: previous.users.map((item) =>
          item.id === sessionUserId ? { ...item, password: nextPassword } : item,
        ),
      }))
      return { ok: true }
    },
    [db.users, sessionUserId],
  )

  const addUser = useCallback(
    (input: NewUserInput): MutationResult => {
      const normalizedEmail = input.email.trim().toLowerCase()
      const duplicate = db.users.some(
        (user) => user.email.toLowerCase() === normalizedEmail,
      )
      if (duplicate) {
        return { ok: false, error: 'Email tersebut sudah digunakan karyawan lain.' }
      }
      const newUser: User = {
        ...input,
        email: input.email.trim(),
        id: uid('u'),
        active: true,
        presence: 'offline',
        leaveQuota: 12,
      }
      setDb((previous) => ({ ...previous, users: [...previous.users, newUser] }))
      return { ok: true }
    },
    [db.users],
  )

  const updateUser = useCallback(
    (id: string, patch: Partial<User>): MutationResult => {
      const target = db.users.find((user) => user.id === id)
      if (!target) return { ok: false, error: 'Karyawan tidak ditemukan.' }
      if (patch.email) {
        const normalized = patch.email.trim().toLowerCase()
        const duplicate = db.users.some(
          (user) => user.id !== id && user.email.toLowerCase() === normalized,
        )
        if (duplicate) {
          return { ok: false, error: 'Email tersebut sudah digunakan karyawan lain.' }
        }
      }
      setDb((previous) => ({
        ...previous,
        users: previous.users.map((user) => (user.id === id ? { ...user, ...patch } : user)),
      }))
      return { ok: true }
    },
    [db.users],
  )

  const addAnnouncement = useCallback<AppContextValue['addAnnouncement']>(
    (input) => {
      if (!sessionUserId) return
      const announcement: Announcement = {
        ...input,
        id: uid('ann'),
        authorId: sessionUserId,
        createdAt: new Date().toISOString(),
        readBy: [sessionUserId],
      }
      setDb((previous) => ({
        ...previous,
        announcements: [announcement, ...previous.announcements],
      }))
    },
    [sessionUserId],
  )

  const updateAnnouncement = useCallback<AppContextValue['updateAnnouncement']>((id, patch) => {
    setDb((previous) => ({
      ...previous,
      announcements: previous.announcements.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }))
  }, [])

  const deleteAnnouncement = useCallback((id: string) => {
    setDb((previous) => ({
      ...previous,
      announcements: previous.announcements.filter((item) => item.id !== id),
    }))
  }, [])

  const togglePinAnnouncement = useCallback((id: string) => {
    setDb((previous) => ({
      ...previous,
      announcements: previous.announcements.map((item) =>
        item.id === id ? { ...item, pinned: !item.pinned } : item,
      ),
    }))
  }, [])

  const markAnnouncementRead = useCallback(
    (id: string) => {
      if (!sessionUserId) return
      setDb((previous) => ({
        ...previous,
        announcements: previous.announcements.map((item) =>
          item.id === id && !item.readBy.includes(sessionUserId)
            ? { ...item, readBy: [...item.readBy, sessionUserId] }
            : item,
        ),
      }))
    },
    [sessionUserId],
  )

  const markAllAnnouncementsRead = useCallback(() => {
    if (!sessionUserId) return
    setDb((previous) => ({
      ...previous,
      announcements: previous.announcements.map((item) =>
        item.readBy.includes(sessionUserId)
          ? item
          : { ...item, readBy: [...item.readBy, sessionUserId] },
      ),
    }))
  }, [sessionUserId])

  const addDocument = useCallback<AppContextValue['addDocument']>(
    (input) => {
      if (!sessionUserId) return
      const document: DocumentItem = {
        ...input,
        id: uid('doc'),
        ownerId: sessionUserId,
        updatedAt: new Date().toISOString(),
        downloads: 0,
      }
      setDb((previous) => ({
        ...previous,
        documents: [document, ...previous.documents],
      }))
    },
    [sessionUserId],
  )

  const deleteDocument = useCallback((id: string) => {
    setDb((previous) => ({
      ...previous,
      documents: previous.documents.filter((item) => item.id !== id),
    }))
  }, [])

  const incrementDownload = useCallback((id: string) => {
    setDb((previous) => ({
      ...previous,
      documents: previous.documents.map((item) =>
        item.id === id ? { ...item, downloads: item.downloads + 1 } : item,
      ),
    }))
  }, [])

  const createLeave = useCallback<AppContextValue['createLeave']>(
    (input) => {
      if (!sessionUserId) return { ok: false, error: 'Sesi Anda telah berakhir.' }
      const days = workingDays(input.startDate, input.endDate)
      if (!input.startDate || !input.endDate) {
        return { ok: false, error: 'Tanggal mulai dan selesai wajib diisi.' }
      }
      if (new Date(input.endDate) < new Date(input.startDate)) {
        return { ok: false, error: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' }
      }
      if (days === 0) {
        return { ok: false, error: 'Rentang tanggal yang dipilih tidak memiliki hari kerja.' }
      }
      const request = {
        id: uid('lv'),
        userId: sessionUserId,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        days,
        reason: input.reason.trim(),
        status: 'menunggu' as const,
        createdAt: new Date().toISOString(),
      }
      setDb((previous) => ({ ...previous, leaves: [request, ...previous.leaves] }))
      return { ok: true }
    },
    [sessionUserId],
  )

  const reviewLeave = useCallback<AppContextValue['reviewLeave']>(
    (id, status, note) => {
      if (!sessionUserId) return
      setDb((previous) => ({
        ...previous,
        leaves: previous.leaves.map((leave) =>
          leave.id === id
            ? {
                ...leave,
                status,
                reviewedBy: sessionUserId,
                reviewNote: note.trim() || undefined,
              }
            : leave,
        ),
      }))
    },
    [sessionUserId],
  )

  const cancelLeave = useCallback((id: string) => {
    setDb((previous) => ({
      ...previous,
      leaves: previous.leaves.filter((leave) => leave.id !== id),
    }))
  }, [])

  const clockIn = useCallback(
    (workMode: WorkMode) => {
      if (!sessionUserId) return
      const today = dateISO()
      setDb((previous) => {
        const existing = previous.attendance.find(
          (record) => record.userId === sessionUserId && record.date === today,
        )
        if (existing) {
          return {
            ...previous,
            attendance: previous.attendance.map((record) =>
              record.id === existing.id
                ? { ...record, clockIn: timeNow(), workMode, status: 'hadir' }
                : record,
            ),
          }
        }
        const record: Attendance = {
          id: uid('att'),
          userId: sessionUserId,
          date: today,
          clockIn: timeNow(),
          clockOut: null,
          status: 'hadir',
          workMode,
        }
        return { ...previous, attendance: [...previous.attendance, record] }
      })
    },
    [sessionUserId],
  )

  const clockOut = useCallback(() => {
    if (!sessionUserId) return
    const today = dateISO()
    setDb((previous) => ({
      ...previous,
      attendance: previous.attendance.map((record) =>
        record.userId === sessionUserId && record.date === today
          ? { ...record, clockOut: timeNow() }
          : record,
      ),
    }))
  }, [sessionUserId])

  const createTicket = useCallback<AppContextValue['createTicket']>(
    (input) => {
      if (!sessionUserId) return ''
      const highestId = db.tickets.reduce((max, ticket) => {
        const numeric = Number(ticket.id.replace('TKT-', ''))
        return Number.isFinite(numeric) ? Math.max(max, numeric) : max
      }, 1042)
      const id = `TKT-${highestId + 1}`
      const ticket: Ticket = {
        ...input,
        id,
        status: 'terbuka',
        requesterId: sessionUserId,
        assigneeId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
      }
      setDb((previous) => ({ ...previous, tickets: [ticket, ...previous.tickets] }))
      return id
    },
    [db.tickets, sessionUserId],
  )

  const updateTicket = useCallback<AppContextValue['updateTicket']>((id, patch) => {
    setDb((previous) => ({
      ...previous,
      tickets: previous.tickets.map((ticket) =>
        ticket.id === id
          ? { ...ticket, ...patch, updatedAt: new Date().toISOString() }
          : ticket,
      ),
    }))
  }, [])

  const addTicketComment = useCallback(
    (id: string, body: string) => {
      if (!sessionUserId || !body.trim()) return
      const comment: TicketComment = {
        id: uid('tc'),
        authorId: sessionUserId,
        body: body.trim(),
        createdAt: new Date().toISOString(),
      }
      setDb((previous) => ({
        ...previous,
        tickets: previous.tickets.map((ticket) =>
          ticket.id === id
            ? {
                ...ticket,
                comments: [...ticket.comments, comment],
                updatedAt: new Date().toISOString(),
              }
            : ticket,
        ),
      }))
    },
    [sessionUserId],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      db,
      currentUser,
      isAdmin: currentUser?.role === 'admin',
      login,
      logout,
      resetDemoData,
      updateProfile,
      changePassword,
      addUser,
      updateUser,
      addAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      togglePinAnnouncement,
      markAnnouncementRead,
      markAllAnnouncementsRead,
      addDocument,
      deleteDocument,
      incrementDownload,
      createLeave,
      reviewLeave,
      cancelLeave,
      clockIn,
      clockOut,
      createTicket,
      updateTicket,
      addTicketComment,
    }),
    [
      db,
      currentUser,
      login,
      logout,
      resetDemoData,
      updateProfile,
      changePassword,
      addUser,
      updateUser,
      addAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      togglePinAnnouncement,
      markAnnouncementRead,
      markAllAnnouncementsRead,
      addDocument,
      deleteDocument,
      incrementDownload,
      createLeave,
      reviewLeave,
      cancelLeave,
      clockIn,
      clockOut,
      createTicket,
      updateTicket,
      addTicketComment,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp harus dipakai di dalam AppProvider')
  return context
}
