export type Role = 'admin' | 'karyawan'

export type Department =
  | 'Engineering'
  | 'Product'
  | 'Design'
  | 'HR'
  | 'Finance'
  | 'Marketing'
  | 'Operations'

export type Presence = 'online' | 'sibuk' | 'offline'

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: Role
  department: Department
  position: string
  phone: string
  location: string
  joinedAt: string
  active: boolean
  presence: Presence
  leaveQuota: number
}

export type AnnouncementCategory = 'Umum' | 'HR' | 'IT' | 'Kegiatan'

export interface Announcement {
  id: string
  title: string
  body: string
  category: AnnouncementCategory
  pinned: boolean
  authorId: string
  createdAt: string
  readBy: string[]
}

export type DocumentCategory = 'Kebijakan' | 'Formulir' | 'SOP' | 'Template' | 'Lainnya'
export type FileType = 'PDF' | 'DOCX' | 'XLSX' | 'PPTX'

export interface DocumentItem {
  id: string
  name: string
  description: string
  category: DocumentCategory
  fileType: FileType
  sizeKb: number
  ownerId: string
  updatedAt: string
  downloads: number
}

export type LeaveType = 'Tahunan' | 'Sakit' | 'Izin' | 'Duka' | 'Melahirkan'
export type LeaveStatus = 'menunggu' | 'disetujui' | 'ditolak'

export interface LeaveRequest {
  id: string
  userId: string
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
  status: LeaveStatus
  createdAt: string
  reviewedBy?: string
  reviewNote?: string
}

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'cuti' | 'alfa'
export type WorkMode = 'WFO' | 'WFH' | 'Dinas'

export interface Attendance {
  id: string
  userId: string
  date: string
  clockIn: string | null
  clockOut: string | null
  status: AttendanceStatus
  workMode: WorkMode
}

export type TicketCategory = 'Hardware' | 'Software' | 'Jaringan' | 'Akses' | 'Lainnya'
export type TicketPriority = 'rendah' | 'sedang' | 'tinggi'
export type TicketStatus = 'terbuka' | 'diproses' | 'selesai'

export interface TicketComment {
  id: string
  authorId: string
  body: string
  createdAt: string
}

export interface Ticket {
  id: string
  subject: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  requesterId: string
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  comments: TicketComment[]
}

export interface Db {
  users: User[]
  announcements: Announcement[]
  documents: DocumentItem[]
  leaves: LeaveRequest[]
  attendance: Attendance[]
  tickets: Ticket[]
}
