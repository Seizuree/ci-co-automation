# Talenta HR Automation

Automation script untuk clock in/out otomatis di Talenta HR menggunakan Playwright.

## Files

- `talenta-clock-in.js` - Script untuk clock in
- `talenta-clock-out.js` - Script untuk clock out
- `clock-in.bat` - Batch file untuk menjalankan clock in
- `clock-out.bat` - Batch file untuk menjalankan clock out
- `setup-schedule.ps1` - PowerShell script untuk setup otomatis
- `setup-task-scheduler.md` - Panduan manual setup Task Scheduler
- `.env.example` - Template file untuk credentials

## Features

- ✅ ES Module support (modern JavaScript)
- ✅ Environment variables untuk credentials yang aman
- ✅ Retry logic untuk handle page loading yang lambat
- ✅ Console logging untuk tracking progress
- ✅ Error handling yang robust
- ✅ Automated scheduling dengan Task Scheduler

## Setup

### 1. Install Dependencies
```bash
npm install
npx playwright install
```

### 2. Setup Credentials
```bash
# Copy template file
copy .env.example .env
```
Edit file `.env` dengan credentials Anda:
```
TALENTA_EMAIL=email-anda@example.com
TALENTA_PASSWORD=password-anda
```

### 3. Test Manual
```bash
# Test clock in
npm run clock-in

# Test clock out
npm run clock-out
```

## Automation Schedule

### Otomatis (PowerShell)
Jalankan sebagai Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup-schedule.ps1
```

### Manual (Task Scheduler)
Ikuti panduan di `setup-task-scheduler.md`

## Schedule
- **Clock In**: Setiap hari jam 08:50
- **Clock Out**: Setiap hari jam 18:05

## Troubleshooting

### Page Loading Issues
Script sudah dilengkapi dengan retry logic:
- Tunggu maksimal 10 detik untuk page load
- Jika belum load, retry setiap 3 detik
- Console log akan menampilkan progress

### Common Issues
- Pastikan file `.env` sudah dibuat dan diisi dengan benar
- Pastikan koneksi internet stabil
- Jika error timeout, coba jalankan ulang script

## Requirements
- Node.js (v16 atau lebih baru)
- Windows (untuk Task Scheduler)
- Koneksi internet
- Komputer harus hidup saat jadwal berjalan
