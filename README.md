# Talenta HR Automation

Automated clock in/out for [Talenta HR](https://hr.talenta.co) using Playwright with stealth browser techniques.

## Overview

This tool automates daily attendance on Talenta HR by launching a stealth Chromium browser, logging in with your credentials, and clicking the Clock In / Clock Out button. It includes human-like interaction patterns (hover, random delays, fallback click strategies) to avoid bot detection.

The script automatically detects the schedule type (WFH/WFO) from the Live Attendance page. If no schedule is found (holiday, day off, cuti), it skips the clock action and exits gracefully without failing.

## Project Structure

```
├── .github/
│   └── workflows/
│       ├── clock-in.yml       # GitHub Actions workflow for clock in
│       └── clock-out.yml      # GitHub Actions workflow for clock out
├── src/
│   ├── attendance/
│   │   ├── auth.js            # Login handler (auto-detects if already logged in)
│   │   ├── clock-in.js        # Clock in script with schedule detection & retry logic
│   │   ├── clock-out.js       # Clock out script with schedule detection & retry logic
│   │   └── schedule.js        # Schedule detector (WFH/WFO/holiday detection)
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

- **Schedule detection** — reads the Live Attendance page for WFH/WFO keywords; skips clock if no schedule found (holiday/day off/cuti) with `exit(0)` so the job stays green
- **Dual-layer holiday protection** — `CRON_ENABLED` repo variable as manual kill switch + automatic schedule detection from Talenta
- Stealth Chromium browser with anti-detection patches (webdriver flag, fake plugins, chrome runtime spoofing)
- WebRTC leak protection (disables ICE servers and blocks real IP exposure)
- Hardened geolocation override via `addInitScript` injection (overrides `getCurrentPosition` and `watchPosition`)
- Human-like interactions: hover before click, randomized delays, scroll into view
- Multi-fallback click strategy (normal → force → manual event dispatch)
- Geolocation spoofing (Jakarta, Indonesia) with `id-ID` locale and `Asia/Jakarta` timezone
- Tailscale VPN exit node in CI to route traffic through an Indonesian IP
- Auto-login with session detection (skips login if already authenticated)
- Retry logic (up to 3 attempts) with error screenshots on final failure
- Auto-retry on workflow failure (up to 2 retries within time window)
- API response interception to confirm attendance was recorded
- Timestamped console logging via consola
- GitHub Actions workflows with external cron trigger (cron-job.org) for reliable scheduling
- Telegram notifications on success/failure with run details
- Windows Task Scheduler integration as local alternative

## Requirements

- Node.js v20+
- pnpm 9
- Stable internet connection
- Tailscale account with OAuth client (for GitHub Actions VPN routing — see [setup](#3-setup-tailscale-vpn-for-ci))

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

```ini
TALENTA_EMAIL=your-email@example.com
TALENTA_PASSWORD=your-password
HEADLESS=false
```

Optional geolocation override (defaults to Jakarta office):

```ini
GEO_LAT=-6.1993335
GEO_LNG=106.7623687
```

### 3. Test manually

```bash
# Run clock in
pnpm run clock-in

# Run clock out
pnpm run clock-out
```

## How Schedule Detection Works

When the script navigates to the Live Attendance page, it reads all visible text on the page and looks for **WFH** or **WFO** keywords.

| Page content | Result |
| --- | --- |
| Contains "WFH" | Clock in/out proceeds (Work From Home) |
| Contains "WFO" | Clock in/out proceeds (Work From Office) |
| Neither found | Skipped — `exit(0)` — job stays **success** |

This handles:
- **Hari libur nasional** — no schedule displayed → skip
- **Cuti** — if Talenta removes the schedule → skip
- **Normal workday** — WFH or WFO displayed → clock in/out

## Scheduling

### GitHub Actions + cron-job.org (Recommended)

Workflows are split into 2 files: `clock-in.yml` and `clock-out.yml`. Both use `workflow_dispatch` — triggered manually from the GitHub Actions console or automatically via an external cron service.

Each workflow has a `check-enabled` job that reads the `CRON_ENABLED` repo variable. If set to `false`, the main job is skipped entirely (no runner spin-up, no cost).

#### 1. Create a GitHub Fine-Grained Personal Access Token

1. Go to [GitHub Settings > Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click **Generate new token**
3. Set the token name, e.g. `cron-attendance-trigger`
4. Set expiration as needed (e.g. 90 days)
5. Under **Repository access**, select **Only select repositories** → choose this repo
6. Under **Permissions > Repository permissions**, set:
   - `Actions`: Read and write
   - `Contents`: Read-only
7. Click **Generate token** and save it

#### 2. Setup cron-job.org

1. Create an account at [cron-job.org](https://cron-job.org)
2. Create 2 cron jobs:

**Clock In** (08:45 WIB = 01:45 UTC):

- Title: `Talenta Clock In`
- URL: `https://api.github.com/repos/{OWNER}/{REPO}/actions/workflows/clock-in.yml/dispatches`
- Schedule: `45 1 * * 1-5` (Monday-Friday)
- Request method: `POST`
- Request headers:

  ```text
  Authorization: Bearer <GITHUB_PAT>
  Accept: application/vnd.github+json
  X-GitHub-Api-Version: 2022-11-28
  ```

- Request body:

  ```json
  {"ref": "main"}
  ```

**Clock Out** (18:05 WIB = 11:05 UTC):

- Title: `Talenta Clock Out`
- URL: `https://api.github.com/repos/{OWNER}/{REPO}/actions/workflows/clock-out.yml/dispatches`
- Schedule: `5 11 * * 1-5` (Monday-Friday)
- Same request method, headers, and body as above.

> Replace `{OWNER}` and `{REPO}` with your GitHub username and repository name.

#### 3. Setup Tailscale VPN for CI

The GitHub Actions workflows route traffic through a Tailscale exit node so the runner's IP appears to be in Indonesia. This prevents IP-based blocking by Talenta.

1. Create a [Tailscale](https://tailscale.com) account and set up a tailnet
2. Add an exit node in Indonesia (e.g. a VPS or home device running Tailscale with `--advertise-exit-node`)
3. Create an OAuth client in the [Tailscale admin console](https://login.tailscale.com/admin/settings/oauth) with the `tag:ci` tag
4. Add the following secrets to your GitHub repository (**Settings > Secrets and variables > Actions > Secrets**):

   | Secret | Description |
   | --- | --- |
   | `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client ID |
   | `TS_OAUTH_SECRET` | Tailscale OAuth client secret |
   | `TS_EXIT_NODE` | Comma-separated exit node hostnames/IPs in Indonesia (tried in order, first successful one wins) |

5. Add the following secrets for Telegram notifications:

   | Secret | Description |
   | --- | --- |
   | `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |
   | `TELEGRAM_CHAT_ID` | Your Telegram chat ID |

#### 4. Holiday / leave control

There are **two layers** of protection:

1. **`CRON_ENABLED` repo variable (manual)** — set to `false` in **Settings > Secrets and variables > Actions > Variables** to skip all workflow runs. Set back to `true` when you return. The `check-enabled` job runs first and skips the main job if disabled.

2. **Schedule detection (automatic)** — even if `CRON_ENABLED` is `true`, the script reads the Live Attendance page. If no WFH/WFO schedule is found, it exits with code 0 (success) without clocking.

Both layers ensure the job **never fails** on holidays or leave days.

#### 5. Geolocation in CI

The workflow determines geolocation based on the day of the week:

| Day | Location | Coordinates |
| --- | --- | --- |
| Monday, Friday | Home | `-6.209077, 106.634380` |
| Tuesday–Thursday | Office | `-6.199333, 106.762368` |

This is configured in the `Determine geolocation` step of each workflow.

### Windows Task Scheduler (Alternative — Local)

#### Automated setup (PowerShell)

Run as Administrator:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\setup-schedule.ps1
```

This registers two daily Windows scheduled tasks:

- **Talenta Clock In** at 08:55
- **Talenta Clock Out** at 18:05

#### Manual setup (Task Scheduler)

See [setup-task-scheduler.md](setup-task-scheduler.md) for step-by-step instructions.

## Troubleshooting

| Issue | Solution |
| --- | --- |
| Login timeout | Check your `.env` credentials and internet connection |
| Clock In/Out button not found | Talenta UI may have changed; inspect the page and update selectors |
| Schedule not detected | Check if Talenta changed the page layout; the script looks for "WFH"/"WFO" text in `document.body.innerText` |
| Task doesn't run on schedule | Ensure the computer is awake (not in sleep/hibernate) at the scheduled time |
| Bot detection | The stealth utils should handle this, but Talenta may update their detection; check `stealth-utils.js` |
| CI IP location is wrong | Verify Tailscale exit node is running and `TS_EXIT_NODE` secret is correct; check the "Route traffic through exit node" step output |
| Script errors | Check the error screenshot (`error-clock-in.png` / `error-clock-out.png`) uploaded as workflow artifacts (3-day retention) |
| Job skipped unexpectedly | Check `CRON_ENABLED` repo variable — must be `true` (or unset) |

## Notes

- The batch scripts assume the project is located at `D:\ci-co-automation`. Update the path in `scripts/clock-in.bat` and `scripts/clock-out.bat` if your project is in a different directory.
- `HEADLESS=false` (default) launches a visible browser window for local testing. GitHub Actions sets `HEADLESS=true` automatically.
- Credentials are wiped from `process.env` after successful login for security.
- Browser data (cookies, localStorage, sessionStorage) is cleared after logout.
