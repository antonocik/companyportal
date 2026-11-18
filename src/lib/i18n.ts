import { useApp } from '../store/AppStore'
import type { Language } from '../types'

export type TranslationDict = Record<string, string>

/**
 * Kamus terjemahan. Kunci = teks Indonesia (sumber), nilai = terjemahan Inggris.
 * Jika sebuah teks tidak ada di kamus, teks asli (Indonesia) akan ditampilkan.
 */
export const translations: Record<Language, TranslationDict> = {
  id: {},
  en: {
    // Umum
    'Portal internal karyawan': 'Employee internal portal',
    'Masuk ke akun Anda': 'Sign in to your account',
    'Gunakan email perusahaan untuk mengakses layanan internal.':
      'Use your company email to access internal services.',
    'Email perusahaan': 'Company email',
    'Kata sandi': 'Password',
    'Masukkan kata sandi': 'Enter your password',
    'Ingat email saya': 'Remember my email',
    'Koneksi aman': 'Secure connection',
    'Masuk ke portal': 'Sign in to portal',
    'Lupa kata sandi?': 'Forgot password?',
    'Butuh bantuan akses?': 'Need access help?',
    'Hubungi IT Support': 'Contact IT Support',
    'Kembali': 'Back',

    // Navigasi
    'Dashboard': 'Dashboard',
    'Pengumuman': 'Announcements',
    'Direktori': 'Directory',
    'Dokumen': 'Documents',
    'Cuti & Absensi': 'Leave & Attendance',
    'Tiket IT': 'IT Tickets',
    'Manajemen Karyawan': 'Employee Management',
    'Profil Saya': 'My Profile',
    'Utama': 'Main',
    'Karyawan': 'Employees',
    'Layanan': 'Services',
    'Administrasi': 'Administration',
    'Akun': 'Account',

    // Header
    'Buka menu navigasi': 'Open navigation menu',
    'Cari': 'Search',
    'Aksi cepat': 'Quick actions',
    'Baru': 'New',
    'Notifikasi': 'Notifications',
    'belum dibaca': 'unread',
    'Menu pengguna': 'User menu',
    'Mode gelap': 'Dark mode',
    'Mode terang': 'Light mode',
    'Aktifkan mode gelap': 'Enable dark mode',
    'Aktifkan mode terang': 'Enable light mode',
    'Keluar': 'Sign out',

    // Dashboard
    'Hadir hari ini': 'Present today',
    'Cuti menunggu': 'Pending leave',
    'Tiket IT aktif': 'Active IT tickets',
    'Karyawan aktif': 'Active employees',
    'Sisa cuti tahunan': 'Annual leave remaining',
    'Hadir bulan ini': 'Present this month',
    'Kehadiran 7 Hari Kerja': '7-Day Work Attendance',
    'Persentase karyawan hadir per hari': 'Percentage of employees present per day',
    'Rata-rata': 'Average',
    'Bekerja dari rumah': 'Working from home',
    'Izin / sakit': 'Leave / sick',
    'Selamat pagi': 'Good morning',
    'Selamat siang': 'Good afternoon',
    'Selamat malam': 'Good evening',

    // Profil
    'Informasi Pribadi': 'Personal Information',
    'Keamanan Akun': 'Account Security',
    'Data & Privasi': 'Data & Privacy',
    'Simpan perubahan': 'Save changes',
    'Ubah kata sandi': 'Change password',
    'Reset data': 'Reset data',
    'Hapus foto': 'Remove photo',

    // Bahasa
    'Bahasa': 'Language',
    'Indonesia': 'Indonesian',
    'Inggris': 'English',
  },
}

export function translate(text: string, language: Language): string {
  if (language === 'id') return text
  return translations.en[text] ?? text
}

export function useT() {
  const { language } = useApp()
  return (text: string) => translate(text, language)
}