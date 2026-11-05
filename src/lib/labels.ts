import type {
  AnnouncementCategory,
  AttendanceStatus,
  DocumentCategory,
  LeaveStatus,
  LeaveType,
  Role,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  WorkMode,
} from '../types'

export type Tone = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark'

export const leaveStatusTone: Record<LeaveStatus, Tone> = {
  menunggu: 'warning',
  disetujui: 'success',
  ditolak: 'danger',
}

export const leaveStatusLabel: Record<LeaveStatus, string> = {
  menunggu: 'Menunggu',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
}

export const leaveTypeTone: Record<LeaveType, Tone> = {
  Tahunan: 'primary',
  Sakit: 'warning',
  Izin: 'info',
  Duka: 'secondary',
  Melahirkan: 'success',
}

export const attendanceTone: Record<AttendanceStatus, Tone> = {
  hadir: 'success',
  izin: 'info',
  sakit: 'warning',
  cuti: 'primary',
  alfa: 'danger',
}

export const attendanceLabel: Record<AttendanceStatus, string> = {
  hadir: 'Hadir',
  izin: 'Izin',
  sakit: 'Sakit',
  cuti: 'Cuti',
  alfa: 'Alfa',
}

export const workModeTone: Record<WorkMode, Tone> = {
  WFO: 'primary',
  WFH: 'info',
  Dinas: 'warning',
}

export const ticketStatusTone: Record<TicketStatus, Tone> = {
  terbuka: 'warning',
  diproses: 'info',
  selesai: 'success',
}

export const ticketStatusLabel: Record<TicketStatus, string> = {
  terbuka: 'Terbuka',
  diproses: 'Diproses',
  selesai: 'Selesai',
}

export const ticketPriorityTone: Record<TicketPriority, Tone> = {
  rendah: 'secondary',
  sedang: 'warning',
  tinggi: 'danger',
}

export const ticketPriorityLabel: Record<TicketPriority, string> = {
  rendah: 'Rendah',
  sedang: 'Sedang',
  tinggi: 'Tinggi',
}

export const ticketCategoryIcon: Record<TicketCategory, string> = {
  Hardware: 'bi-pc-display',
  Software: 'bi-window-stack',
  Jaringan: 'bi-wifi',
  Akses: 'bi-shield-lock',
  Lainnya: 'bi-three-dots',
}

export const announcementTone: Record<AnnouncementCategory, Tone> = {
  Umum: 'secondary',
  HR: 'primary',
  IT: 'info',
  Kegiatan: 'success',
}

export const documentTone: Record<DocumentCategory, Tone> = {
  Kebijakan: 'primary',
  Formulir: 'warning',
  SOP: 'info',
  Template: 'success',
  Lainnya: 'secondary',
}

export const roleTone: Record<Role, Tone> = {
  admin: 'primary',
  karyawan: 'secondary',
}

export const roleLabel: Record<Role, string> = {
  admin: 'Administrator',
  karyawan: 'Karyawan',
}

export const fileTypeIcon = (type: string) => {
  switch (type) {
    case 'PDF':
      return 'bi-file-earmark-pdf'
    case 'DOCX':
      return 'bi-file-earmark-word'
    case 'XLSX':
      return 'bi-file-earmark-excel'
    case 'PPTX':
      return 'bi-file-earmark-slides'
    default:
      return 'bi-file-earmark'
  }
}
