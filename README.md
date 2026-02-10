# Talenta HR Automation

Automated clock in/out for [Talenta HR](https://hr.talenta.co) using Playwright with stealth browser techniques.

## Overview

This tool automates daily attendance on Talenta HR by launching a stealth Chromium browser, logging in with your credentials, and clicking the Clock In / Clock Out button. It includes human-like interaction patterns (hover, random delays, fallback click strategies) to avoid bot detection.

## Project Structure

```
├── src/
│   ├── attendance/
│   │   ├── auth.js            # Login handler (auto-detects if already logged in)
│   │   ├── clock-in.js        # Clock in script with retry logic
│   │   └── clock-out.js       # Clock out script with retry logic
│   ├── browser/
│   │   └── stealth-utils.js   # Stealth browser launcher & human-like click helpers
│   └── core/
│       └── logger.js          # Timestamped logger using consola
├── scripts/
│   ├── clock-in.bat           # Batch wrapper for clock in
│   ├── clock-out.bat          # Batch wrapper for clock out
│   └── setup-schedule.ps1     # PowerShell script to register Windows scheduled tasks
├── .env.example               # Credential template
├── setup-task-scheduler.md    # Manual Task Scheduler setup guide
└── package.json
```

## Features

- Stealth Chromium browser with anti-detection patches (webdriver flag, fake plugins, chrome runtime spoofing)
- Human-like interactions: hover before click, randomized delays, scroll into view
- Multi-fallback click strategy (normal → force → manual event dispatch)
- Geolocation spoofing (Jakarta, Indonesia) with `id-ID` locale and `Asia/Jakarta` timezone
- Auto-login with session detection (skips login if already authenticated)
- Retry logic (up to 3 attempts) with error screenshots on final failure
- API response interception to confirm attendance was recorded
- Timestamped console logging via consola
- Windows Task Scheduler integration for daily automation

## Requirements

- Node.js v16+
- pnpm (or npm)
- Windows OS (for Task Scheduler automation)
- Stable internet connection
- Computer must be awake at scheduled times

## Setup

### 1. Install dependencies

```bash
pnpm install
```

Playwright browsers are installed automatically via the `postinstall` script. To install them manually:

```bash
pnpm run install-browsers
```

### 2. Configure credentials

```bash
copy .env.example .env
```

Edit `.env` with your Talenta account:

```
TALENTA_EMAIL=your-email@example.com
TALENTA_PASSWORD=your-password
```

### 3. Test manually

```bash
# Run clock in
pnpm run clock-in

# Run clock out
pnpm run clock-out
```

## Scheduling

### Automated setup (PowerShell)

Run as Administrator:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\setup-schedule.ps1
```

This registers two daily Windows scheduled tasks:
- **Talenta Clock In** at 08:55
- **Talenta Clock Out** at 18:05

### Manual setup (Task Scheduler)

See [setup-task-scheduler.md](setup-task-scheduler.md) for step-by-step instructions.

## Troubleshooting

| Issue | Solution |
|---|---|
| Login timeout | Check your `.env` credentials and internet connection |
| Clock In/Out button not found | Talenta UI may have changed; inspect the page and update selectors |
| Task doesn't run on schedule | Ensure the computer is awake (not in sleep/hibernate) at the scheduled time |
| Bot detection | The stealth utils should handle this, but Talenta may update their detection; check `stealth-utils.js` |
| Script errors | Check the error screenshot (`error-clock-in.png` / `error-clock-out.png`) saved in the project root |

## Notes

- The batch scripts assume the project is located at `D:\ci-co-automation`. Update the path in `scripts/clock-in.bat` and `scripts/clock-out.bat` if your project is in a different directory.
- The browser launches in headed mode (`headless: false`) so you can observe the automation. Change to `headless: true` in `stealth-utils.js` for silent operation.
