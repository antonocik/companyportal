import type {
  Announcement,
  Attendance,
  AttendanceStatus,
  Db,
  DocumentItem,
  LeaveRequest,
  Ticket,
  User,
  WorkMode,
} from '../types'
import { addDays, dateISO, daysFromToday, isWeekend, pad, workingDays } from '../lib/utils'

const timestamp = (dayOffset: number, hour = 9, minute = 0) => {
  const date = addDays(new Date(), dayOffset)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString()

const users: User[] = [
  {
    id: 'u-admin',
    name: 'Andini Prasetyo',
    email: 'admin@nusantara.co.id',
    password: 'admin123',
    role: 'admin',
    department: 'HR',
    position: 'People & Culture Manager',
    phone: '0812-1000-8801',
    location: 'Jakarta',
    joinedAt: '2019-03-11',
    active: true,
    presence: 'online',
    leaveQuota: 12,
  },
  {
    id: 'u-budi',
    name: 'Budi Santoso',
    email: 'budi@nusantara.co.id',
    password: 'karyawan123',
    role: 'karyawan',
    department: 'Engineering',
    position: 'Frontend Engineer',
    phone: '0812-1000-8802',
    location: 'Jakarta',
    joinedAt: '2021-07-05',
    active: true,
    presence: 'online',
    leaveQuota: 12,
  },
  {
    id: 'u-sari',
    name: 'Sari Wulandari',
    email: 'sari@nusantara.co.id',
    password: 'karyawan123',
    role: 'karyawan',
    department: 'Product',
    position: 'Product Manager',
    phone: '0812-1000-8803',
    location: 'Bandung',
    joinedAt: '2020-01-20',
    active: true,
    presence: 'sibuk',
    leaveQuota: 12,
  },
  {
    id: 'u-dimas',
    name: 'Dimas Nugroho',
    email: 'dimas@nusantara.co.id',
    password: 'karyawan123',
    role: 'karyawan',
    department: 'Engineering',
    position: 'Backend Engineer',
    phone: '0812-1000-8804',
    location: 'Yogyakarta',
    joinedAt: '2022-02-14',
    active: true,
    presence: 'online',
    leaveQuota: 12,
  },
  {
    id: 'u-putri',
    name: 'Putri Maharani',
    email: 'putri@nusantara.co.id',
    password: 'karyawan123',
    role: 'karyawan',
    department: 'Design',
    position: 'UI/UX Designer',
    phone: '0812-1000-8805',
    location: 'Jakarta',
    joinedAt: '2022-09-01',
    active: true,
    presence: 'online',
    leaveQuota: 12,
  },
  {
    id: 'u-rizky',
    name: 'Rizky Ramadhan',
    email: 'rizky@nusantara.co.id',
    password: 'karyawan123',
    role: 'karyawan',
    department: 'Engineering',
    position: 'DevOps Engineer',
    phone: '0812-1000-8806',
    location: 'Remote',
    joinedAt: '2021-11-08',
    active: true,
    presence: 'offline',
    leaveQuota: 12,
  },
  {
    id: 'u-maya',
    name: 'Maya Anggraini',
    email: 'maya@nusantara.co.id',
    password: 'karyawan123',
    role: 'karyawan',
    department: 'Finance',
    position: 'Finance Analyst',
    phone: '0812-1000-8807',
    location: 'Jakarta',
    joinedAt: '2020-06-15',
    active: true,
    presence: 'sibuk',
    leaveQuota: 12,
  },
  {
    id: 'u-fajar',
    name: 'Fajar Hidayat',
    email: 'fajar@nusantara.co.id',
    password: 'karyawan123',
    role: 'karyawan',
    department: 'Marketing',
    position: 'Marketing Lead',
    phone: '0812-1000-8808',
    location: 'Bandung',
    joinedAt: '2019-10-02',
    active: true,
    presence: 'online',
    leaveQuota: 12,
  },
  {
    id: 'u-nadia',
    name: 'Nadia Kusuma',
    email: 'nadia@nusantara.co.id',
    password: 'karyawan123',
    role: 'karyawan',
    department: 'HR',
    position: 'People Operations Specialist',
    phone: '0812-1000-8809',
    location: 'Jakarta',
    joinedAt: '2021-04-19',
    active: true,
    presence: 'online',
    leaveQuota: 12,
  },
  {
    id: 'u-agus',
    name: 'Agus Setiawan',
    email: 'agus@nusantara.co.id',
    password: 'karyawan123',
    role: 'karyawan',
    department: 'Operations',
    position: 'IT Support Specialist',
    phone: '0812-1000-8810',
    location: 'Jakarta',
    joinedAt: '2020-08-24',
    active: true,
    presence: 'online',
    leaveQuota: 12,
  },
  {
    id: 'u-lestari',
    name: 'Lestari Dewi',
    email: 'lestari@nusantara.co.id',
    password: 'karyawan123',
    role: 'karyawan',
    department: 'Marketing',
    position: 'Content Strategist',
    phone: '0812-1000-8811',
    location: 'Yogyakarta',
    joinedAt: '2026-10-01',
    active: true,
    presence: 'online',
    leaveQuota: 12,
  },
  {
    id: 'u-eko',
    name: 'Eko Prabowo',
    email: 'eko@nusantara.co.id',
    password: 'karyawan123',
    role: 'karyawan',
    department: 'Marketing',
    position: 'Account Executive',
    phone: '0812-1000-8812',
    location: 'Surabaya',
    joinedAt: '2023-05-22',
    active: true,
    presence: 'offline',
    leaveQuota: 12,
  },
]

const announcements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Kebijakan Kerja Hybrid Mulai November 2026',
    body: 'Mulai 1 November 2026, seluruh karyawan menjalani skema kerja hybrid dengan komposisi minimal 3 hari bekerja dari kantor (WFO) dan maksimal 2 hari bekerja dari rumah (WFH) setiap minggu.\n\nPengajuan WFH dilakukan melalui menu Cuti & Absensi paling lambat H-1, dan akan disetujui otomatis oleh atasan langsung. Pastikan kehadiran di kantor tetap tercatat melalui sistem absensi.\n\nUntuk tim yang memiliki kebutuhan operasional khusus, pengecualian dapat diajukan ke People & Culture dengan persetujuan Head of Department.',
    category: 'HR',
    pinned: true,
    authorId: 'u-admin',
    createdAt: timestamp(-2, 8, 30),
    readBy: ['u-sari', 'u-dimas'],
  },
  {
    id: 'ann-2',
    title: 'Maintenance Sistem ERP Akhir Pekan Ini',
    body: 'Tim IT akan melakukan pemeliharaan rutin sistem ERP pada Sabtu, pukul 22.00 sampai Minggu pukul 04.00 WIB. Selama proses berlangsung, modul pengadaan, finance, dan approval akan tidak dapat diakses.\n\nMohon selesaikan seluruh submission yang mendesak sebelum pukul 21.00. Jika terdapat kendala setelah maintenance, silakan hubungi IT Support melalui helpdesk internal.',
    category: 'IT',
    pinned: false,
    authorId: 'u-agus',
    createdAt: timestamp(-1, 14, 10),
    readBy: [],
  },
  {
    id: 'ann-3',
    title: 'Townhall Q4 & Perayaan Anniversary ke-8',
    body: 'Kami mengundang seluruh karyawan untuk hadir pada Townhall Q4 sekaligus perayaan ulang tahun PT Nusantara Digital yang ke-8.\n\nAcara akan dilaksanakan pada Jumat, 20 November 2026 pukul 14.00 WIB di Auditorium Lantai 8, dilanjutkan dengan sesi ramah tamah dan makan bersama. Dress code: smart casual dengan sentuhan warna brand.\n\nMohon konfirmasi kehadiran melalui People & Culture sebelum 15 November.',
    category: 'Kegiatan',
    pinned: true,
    authorId: 'u-nadia',
    createdAt: timestamp(-4, 10, 0),
    readBy: ['u-budi', 'u-maya', 'u-putri'],
  },
  {
    id: 'ann-4',
    title: 'Pembaruan Benefit Kesehatan Karyawan 2026',
    body: 'Mulai bulan ini, plafon benefit kesehatan tahunan meningkat menjadi Rp15.000.000 per karyawan, mencakup rawat jalan, rawat inap, gigi, mata, dan pemeriksaan kesehatan tahunan.\n\nKaryawan juga dapat menambahkan hingga dua anggota keluarga inti sebagai tanggungan. Detail manfaat dan formulir pendaftaran tersedia di menu Manajemen Dokumen pada kategori Kebijakan.',
    category: 'HR',
    pinned: false,
    authorId: 'u-admin',
    createdAt: timestamp(-6, 9, 15),
    readBy: ['u-budi'],
  },
  {
    id: 'ann-5',
    title: 'Selamat Datang Lestari Dewi di Tim Marketing',
    body: 'Kami dengan senang hati menyambut Lestari Dewi yang bergabung sebagai Content Strategist di tim Marketing. Lestari akan berfokus pada pengembangan konten brand dan kampanye digital.\n\nSilakan sapa dan kenalan melalui kanal #introductions di Slack. Untuk kebutuhan kolaborasi, profil dan kontak Lestari sudah tersedia di Direktori Karyawan.',
    category: 'Umum',
    pinned: false,
    authorId: 'u-nadia',
    createdAt: timestamp(-8, 11, 45),
    readBy: [],
  },
  {
    id: 'ann-6',
    title: 'Periode Penilaian Kinerja Tahunan Dibuka',
    body: 'Periode pengisian penilaian kinerja tahunan 2026 dibuka hingga 30 November. Seluruh karyawan diharapkan mengisi self-assessment melalui form yang tersedia di Manajemen Dokumen, kemudian mendiskusikannya dengan atasan langsung.\n\nSesi kalibrasi akan dilakukan pada awal Desember. Pastikan target dan pencapaian terdokumentasi dengan baik.',
    category: 'HR',
    pinned: false,
    authorId: 'u-admin',
    createdAt: timestamp(-10, 8, 0),
    readBy: ['u-dimas', 'u-sari', 'u-maya'],
  },
]

const documents: DocumentItem[] = [
  {
    id: 'doc-1',
    name: 'Buku Panduan Karyawan 2026',
    description: 'Panduan lengkap budaya kerja, kebijakan, dan fasilitas perusahaan.',
    category: 'Kebijakan',
    fileType: 'PDF',
    sizeKb: 2480,
    ownerId: 'u-admin',
    updatedAt: timestamp(-12, 9, 0),
    downloads: 184,
  },
  {
    id: 'doc-2',
    name: 'Kebijakan Kerja Hybrid',
    description: 'Ketentuan WFO, WFH, jam kerja fleksibel, dan pencatatan kehadiran.',
    category: 'Kebijakan',
    fileType: 'PDF',
    sizeKb: 860,
    ownerId: 'u-admin',
    updatedAt: timestamp(-2, 8, 45),
    downloads: 96,
  },
  {
    id: 'doc-3',
    name: 'Formulir Pengajuan Cuti',
    description: 'Formulir manual untuk pengajuan cuti di luar sistem portal.',
    category: 'Formulir',
    fileType: 'DOCX',
    sizeKb: 148,
    ownerId: 'u-nadia',
    updatedAt: timestamp(-25, 10, 30),
    downloads: 61,
  },
  {
    id: 'doc-4',
    name: 'Template Laporan Bulanan',
    description: 'Template standar penyusunan laporan kinerja bulanan per departemen.',
    category: 'Template',
    fileType: 'XLSX',
    sizeKb: 324,
    ownerId: 'u-maya',
    updatedAt: timestamp(-18, 13, 0),
    downloads: 132,
  },
  {
    id: 'doc-5',
    name: 'SOP Penggunaan Perangkat Kantor',
    description: 'Prosedur penggunaan, pemeliharaan, dan pengembalian aset perusahaan.',
    category: 'SOP',
    fileType: 'PDF',
    sizeKb: 1120,
    ownerId: 'u-agus',
    updatedAt: timestamp(-33, 9, 20),
    downloads: 78,
  },
  {
    id: 'doc-6',
    name: 'Kebijakan Keamanan Informasi',
    description: 'Standar keamanan data, kata sandi, perangkat, dan penanganan insiden.',
    category: 'Kebijakan',
    fileType: 'PDF',
    sizeKb: 1640,
    ownerId: 'u-agus',
    updatedAt: timestamp(-41, 15, 10),
    downloads: 54,
  },
  {
    id: 'doc-7',
    name: 'Formulir Reimbursement',
    description: 'Formulir klaim biaya perjalanan dinas, transportasi, dan kebutuhan kerja.',
    category: 'Formulir',
    fileType: 'XLSX',
    sizeKb: 96,
    ownerId: 'u-maya',
    updatedAt: timestamp(-9, 11, 0),
    downloads: 149,
  },
  {
    id: 'doc-8',
    name: 'Template Presentasi Perusahaan',
    description: 'Master deck resmi dengan logo, tipografi, dan panduan visual brand.',
    category: 'Template',
    fileType: 'PPTX',
    sizeKb: 5820,
    ownerId: 'u-putri',
    updatedAt: timestamp(-56, 16, 30),
    downloads: 203,
  },
  {
    id: 'doc-9',
    name: 'SOP Penanganan Insiden IT',
    description: 'Alur pelaporan, eskalasi, dan penyelesaian insiden teknologi informasi.',
    category: 'SOP',
    fileType: 'PDF',
    sizeKb: 940,
    ownerId: 'u-agus',
    updatedAt: timestamp(-21, 10, 0),
    downloads: 37,
  },
  {
    id: 'doc-10',
    name: 'Struktur Organisasi 2026',
    description: 'Bagan organisasi terbaru beserta pembagian tanggung jawab tiap divisi.',
    category: 'Lainnya',
    fileType: 'PDF',
    sizeKb: 720,
    ownerId: 'u-admin',
    updatedAt: timestamp(-7, 9, 45),
    downloads: 88,
  },
]

const leaveSeed: Array<Omit<LeaveRequest, 'days'> & { days?: number }> = [
  {
    id: 'lv-1',
    userId: 'u-budi',
    type: 'Tahunan',
    startDate: daysFromToday(-24),
    endDate: daysFromToday(-22),
    reason: 'Liburan keluarga ke Bali.',
    status: 'disetujui',
    createdAt: timestamp(-35, 10, 0),
    reviewedBy: 'u-admin',
    reviewNote: 'Disetujui, selamat berlibur.',
  },
  {
    id: 'lv-2',
    userId: 'u-budi',
    type: 'Tahunan',
    startDate: daysFromToday(19),
    endDate: daysFromToday(21),
    reason: 'Menghadiri acara keluarga di Surabaya.',
    status: 'menunggu',
    createdAt: timestamp(-3, 9, 30),
  },
  {
    id: 'lv-3',
    userId: 'u-sari',
    type: 'Sakit',
    startDate: daysFromToday(-8),
    endDate: daysFromToday(-7),
    reason: 'Demam dan perlu istirahat sesuai surat dokter.',
    status: 'disetujui',
    createdAt: timestamp(-9, 7, 45),
    reviewedBy: 'u-admin',
    reviewNote: 'Semoga lekas sembuh.',
  },
  {
    id: 'lv-4',
    userId: 'u-dimas',
    type: 'Tahunan',
    startDate: daysFromToday(47),
    endDate: daysFromToday(56),
    reason: 'Cuti akhir tahun bersama keluarga.',
    status: 'menunggu',
    createdAt: timestamp(-1, 13, 20),
  },
  {
    id: 'lv-5',
    userId: 'u-putri',
    type: 'Izin',
    startDate: daysFromToday(1),
    endDate: daysFromToday(1),
    reason: 'Mengurus dokumen kependudukan di kantor kelurahan.',
    status: 'menunggu',
    createdAt: hoursAgo(5),
  },
  {
    id: 'lv-6',
    userId: 'u-rizky',
    type: 'Tahunan',
    startDate: daysFromToday(5),
    endDate: daysFromToday(7),
    reason: 'Reuni keluarga di luar kota.',
    status: 'ditolak',
    createdAt: timestamp(-6, 11, 10),
    reviewedBy: 'u-admin',
    reviewNote: 'Berbenturan dengan jadwal rilis versi 4.2. Silakan ajukan tanggal lain.',
  },
  {
    id: 'lv-7',
    userId: 'u-nadia',
    type: 'Melahirkan',
    startDate: daysFromToday(26),
    endDate: daysFromToday(115),
    reason: 'Cuti melahirkan sesuai ketentuan perusahaan.',
    status: 'disetujui',
    createdAt: timestamp(-14, 9, 0),
    reviewedBy: 'u-admin',
    reviewNote: 'Disetujui. Selamat menanti buah hati!',
  },
  {
    id: 'lv-8',
    userId: 'u-fajar',
    type: 'Tahunan',
    startDate: daysFromToday(-31),
    endDate: daysFromToday(-29),
    reason: 'Menghadiri pernikahan saudara.',
    status: 'disetujui',
    createdAt: timestamp(-42, 14, 0),
    reviewedBy: 'u-admin',
  },
  {
    id: 'lv-9',
    userId: 'u-maya',
    type: 'Tahunan',
    startDate: daysFromToday(-51),
    endDate: daysFromToday(-47),
    reason: 'Liburan tahunan.',
    status: 'disetujui',
    createdAt: timestamp(-60, 9, 30),
    reviewedBy: 'u-admin',
  },
  {
    id: 'lv-10',
    userId: 'u-agus',
    type: 'Izin',
    startDate: daysFromToday(12),
    endDate: daysFromToday(12),
    reason: 'Menjadi saksi di acara keluarga.',
    status: 'menunggu',
    createdAt: hoursAgo(26),
  },
]

const leaves: LeaveRequest[] = leaveSeed.map((leave) => ({
  ...leave,
  days: leave.days ?? workingDays(leave.startDate, leave.endDate),
}))

const attendance: Attendance[] = []
const workdays: string[] = []
const cursor = new Date()
while (workdays.length < 8) {
  if (!isWeekend(cursor)) workdays.unshift(dateISO(cursor))
  cursor.setDate(cursor.getDate() - 1)
}

const today = dateISO()
const interactiveDemoUsers = new Set(['u-admin', 'u-budi'])

workdays.forEach((date, dayIndex) => {
  users.forEach((user, userIndex) => {
    if (date === today && interactiveDemoUsers.has(user.id)) return

    const seed = (userIndex + 1) * 31 + dayIndex * 17
    let status: AttendanceStatus = 'hadir'

    // Buat pola ketidakhadiran yang bervariasi agar grafik kehadiran tidak datar.
    const absentees = new Set<number>([(dayIndex * 5 + 2) % users.length])
    if (dayIndex % 3 === 0) absentees.add((dayIndex * 7 + 5) % users.length)
    if (absentees.has(userIndex)) status = dayIndex % 2 === 0 ? 'izin' : 'sakit'

    const hasClockedIn = status === 'hadir'
    const clockInMinutes = 30 + (seed % 45)
    const clockOutMinutes = 35 + (seed % 55)
    const isWorkingNow = date === today && userIndex % 4 === 0

    const workMode: WorkMode =
      seed % 17 === 0 ? 'Dinas' : seed % 9 === 0 ? 'WFH' : 'WFO'

    attendance.push({
      id: `att-${date}-${user.id}`,
      userId: user.id,
      date,
      clockIn: hasClockedIn
        ? `${pad(7 + Math.floor(clockInMinutes / 60))}:${pad(clockInMinutes % 60)}`
        : null,
      clockOut:
        hasClockedIn && !isWorkingNow
          ? `${pad(17 + Math.floor(clockOutMinutes / 60))}:${pad(clockOutMinutes % 60)}`
          : null,
      status,
      workMode,
    })
  })
})

const tickets: Ticket[] = [
  {
    id: 'TKT-1042',
    subject: 'Laptop tidak bisa terhubung ke VPN kantor',
    description:
      'Sejak kemarin laptop saya gagal terhubung ke VPN kantor. Muncul pesan "authentication failed" setelah memasukkan kredensial. Saya sudah mencoba restart dan mengganti jaringan, tetapi hasilnya sama. Mohon dibantu karena saya perlu mengakses server staging dari rumah.',
    category: 'Jaringan',
    priority: 'tinggi',
    status: 'diproses',
    requesterId: 'u-budi',
    assigneeId: 'u-agus',
    createdAt: hoursAgo(19),
    updatedAt: hoursAgo(3),
    comments: [
      {
        id: 'tc-1',
        authorId: 'u-agus',
        body: 'Halo Budi, saya sudah cek log VPN. Akunmu terkena kebijakan rotasi sertifikat. Saya kirim ulang profil VPN baru, mohon coba impor ulang ya.',
        createdAt: hoursAgo(16),
      },
      {
        id: 'tc-2',
        authorId: 'u-budi',
        body: 'Sudah saya impor profil barunya, sekarang berhasil terhubung. Terima kasih bantuannya!',
        createdAt: hoursAgo(3),
      },
    ],
  },
  {
    id: 'TKT-1041',
    subject: 'Permintaan akses repository GitHub tim Frontend',
    description:
      'Saya baru bergabung di squad Frontend dan membutuhkan akses read/write ke repository nusantara-web dan nusantara-design-system. Mohon dibantu untuk proses onboarding aksesnya.',
    category: 'Akses',
    priority: 'sedang',
    status: 'selesai',
    requesterId: 'u-dimas',
    assigneeId: 'u-agus',
    createdAt: hoursAgo(74),
    updatedAt: hoursAgo(48),
    comments: [
      {
        id: 'tc-3',
        authorId: 'u-agus',
        body: 'Akses sudah diberikan untuk kedua repository. Silakan cek undangan di email, lalu konfirmasi bila sudah bisa mengakses.',
        createdAt: hoursAgo(50),
      },
      {
        id: 'tc-4',
        authorId: 'u-dimas',
        body: 'Sudah bisa akses semua. Terima kasih!',
        createdAt: hoursAgo(48),
      },
    ],
  },
  {
    id: 'TKT-1040',
    subject: 'Printer lantai 3 error paper jam',
    description:
      'Printer bersama di area lantai 3 menampilkan error paper jam, tetapi tidak ada kertas yang tersangkut di tray. Sudah dicoba matikan dan nyalakan ulang, error tetap muncul.',
    category: 'Hardware',
    priority: 'rendah',
    status: 'terbuka',
    requesterId: 'u-maya',
    assigneeId: null,
    createdAt: hoursAgo(9),
    updatedAt: hoursAgo(9),
    comments: [],
  },
  {
    id: 'TKT-1039',
    subject: 'Akun Slack ter-logout otomatis setiap pagi',
    description:
      'Setiap pagi akun Slack saya ter-logout sendiri dan harus login ulang. Ini terjadi sejak update sistem terakhir. Mohon dicek apakah ada perubahan kebijakan sesi.',
    category: 'Software',
    priority: 'sedang',
    status: 'diproses',
    requesterId: 'u-sari',
    assigneeId: 'u-agus',
    createdAt: hoursAgo(31),
    updatedAt: hoursAgo(20),
    comments: [
      {
        id: 'tc-5',
        authorId: 'u-agus',
        body: 'Kami sedang mengecek konfigurasi SSO. Untuk sementara, centang "Keep me signed in" saat login dan beri tahu saya bila masih ter-logout.',
        createdAt: hoursAgo(20),
      },
    ],
  },
  {
    id: 'TKT-1038',
    subject: 'Instalasi Figma di laptop baru',
    description:
      'Laptop pengganti sudah diterima, tetapi aplikasi Figma belum terpasang. Mohon dibantu instalasi beserta akses ke workspace tim Design.',
    category: 'Software',
    priority: 'rendah',
    status: 'selesai',
    requesterId: 'u-putri',
    assigneeId: 'u-agus',
    createdAt: hoursAgo(120),
    updatedAt: hoursAgo(96),
    comments: [
      {
        id: 'tc-6',
        authorId: 'u-agus',
        body: 'Figma sudah terpasang dan akses workspace Design sudah aktif. Silakan dicek.',
        createdAt: hoursAgo(97),
      },
      {
        id: 'tc-7',
        authorId: 'u-putri',
        body: 'Sudah bisa, terima kasih!',
        createdAt: hoursAgo(96),
      },
    ],
  },
  {
    id: 'TKT-1037',
    subject: 'Email tidak menerima pesan dari domain eksternal',
    description:
      'Sejak dua hari terakhir saya tidak menerima email dari klien eksternal. Email dari internal masih masuk normal. Beberapa klien mengaku mendapat pesan bounce. Mohon segera dibantu karena ada komunikasi kontrak yang tertunda.',
    category: 'Akses',
    priority: 'tinggi',
    status: 'terbuka',
    requesterId: 'u-fajar',
    assigneeId: null,
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(4),
    comments: [],
  },
  {
    id: 'TKT-1036',
    subject: 'Monitor berkedip saat terhubung docking station',
    description:
      'Monitor eksternal berkedip setiap beberapa detik ketika laptop terhubung ke docking station. Sudah mencoba mengganti kabel HDMI tetapi masalah tetap terjadi.',
    category: 'Hardware',
    priority: 'sedang',
    status: 'diproses',
    requesterId: 'u-rizky',
    assigneeId: 'u-agus',
    createdAt: hoursAgo(52),
    updatedAt: hoursAgo(28),
    comments: [
      {
        id: 'tc-8',
        authorId: 'u-agus',
        body: 'Kemungkinan masalah pada firmware docking. Saya jadwalkan pengecekan di meja kamu besok pagi ya.',
        createdAt: hoursAgo(28),
      },
    ],
  },
]

export function createSeedDb(): Db {
  return {
    users: structuredClone(users),
    announcements: structuredClone(announcements),
    documents: structuredClone(documents),
    leaves: structuredClone(leaves),
    attendance: structuredClone(attendance),
    tickets: structuredClone(tickets),
  }
}


