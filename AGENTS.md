# AGENTS.md

## Project

Talenta HR attendance automation — auto clock in/out via Playwright stealth browser on Windows.

## Tech Stack

- Node.js (ES Modules), Playwright, dotenv, consola
- Package manager: pnpm
- Windows Task Scheduler for daily scheduling

## Architecture

- `src/attendance/auth.js` — Login handler, auto-skips if session exists
- `src/attendance/clock-in.js` — Clock in with 3x retry, intercepts API response to confirm
- `src/attendance/clock-out.js` — Clock out with 3x retry, handles confirmation dialog
- `src/browser/stealth-utils.js` — Stealth Chromium launcher (anti-detection patches, geolocation spoofing, human-like click with fallbacks)
- `src/core/logger.js` — Timestamped tagged logger wrapping consola
- `scripts/clock-in.bat` / `clock-out.bat` — Batch wrappers, hardcoded to `D:\ci-co-automation`
- `scripts/setup-schedule.ps1` — Registers Windows scheduled tasks (clock in 08:55, clock out 18:05)

## Key Behaviors

- Browser runs headed (`headless: false`) with Jakarta geolocation and `id-ID` locale
- Click strategy: hover → random delay → normal click → force click → manual event dispatch
- Failed final attempts save screenshots to project root (`error-clock-in.png` / `error-clock-out.png`)
- Credentials loaded from `.env` (see `.env.example`)

## Commands

- `pnpm run clock-in` — Run clock in
- `pnpm run clock-out` — Run clock out
- `pnpm run install-browsers` — Install Playwright browsers manually

## Conventions

- All source files use ES Module syntax (`import`/`export`)
- Logging via `createLogger(tag)` from `src/core/logger.js`
- No test suite currently exists
