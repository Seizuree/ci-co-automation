# Setup Task Scheduler untuk Talenta Automation

## Langkah-langkah Setup Manual

### 1. Buka Task Scheduler
- Tekan `Win + R`
- Ketik `taskschd.msc`
- Tekan Enter

### 2. Setup Clock In (08:50)

1. **Create Basic Task**
   - Klik "Create Basic Task..." di panel kanan
   
2. **General**
   - Name: `Talenta Clock In`
   - Description: `Automated clock in for Talenta`
   - Klik Next

3. **Trigger**
   - Pilih "Daily"
   - Klik Next

4. **Daily**
   - Start: Pilih tanggal hari ini
   - Start time: `8:50:00 AM`
   - Recur every: `1 days`
   - Klik Next

5. **Action**
   - Pilih "Start a program"
   - Klik Next

6. **Start a Program**
   - Program/script: `D:\automation\clock-in.bat`
   - Klik Next

7. **Finish**
   - Review settings
   - Klik Finish

### 3. Setup Clock Out (18:05)

1. **Create Basic Task**
   - Klik "Create Basic Task..." di panel kanan
   
2. **General**
   - Name: `Talenta Clock Out`
   - Description: `Automated clock out for Talenta`
   - Klik Next

3. **Trigger**
   - Pilih "Daily"
   - Klik Next

4. **Daily**
   - Start: Pilih tanggal hari ini
   - Start time: `6:05:00 PM`
   - Recur every: `1 days`
   - Klik Next

5. **Action**
   - Pilih "Start a program"
   - Klik Next

6. **Start a Program**
   - Program/script: `D:\automation\clock-out.bat`
   - Klik Next

7. **Finish**
   - Review settings
   - Klik Finish

## Verifikasi

Setelah setup, Anda bisa lihat kedua task di Task Scheduler Library:
- `Talenta Clock In` - akan jalan setiap hari jam 08:50
- `Talenta Clock Out` - akan jalan setiap hari jam 18:05

## Catatan Penting

- Pastikan komputer dalam keadaan hidup di jam tersebut
- Jika komputer sleep/hibernate, task tidak akan jalan
- Untuk testing, bisa klik kanan pada task → "Run" untuk test manual
