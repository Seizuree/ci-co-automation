---
title: "schedule detection failure: debug before fixing selectors"
author: Seizuree
date: 2026-10-27
branch: main
cost: { minutes: 13, tokens: 2417640 }
id: l-15de77bd
scope: repo
status: active
src: agent
touches:
  - ".github/workflows/clock-in.yml"
  - ".github/workflows/clock-out.yml"
  - src/attendance/schedule.js
  - package.json
  - pnpm-lock.yaml
  - src/attendance/clock-out.js
---

## Decided
When both `div.schedule-time select.custom-select` and `div.schedule-time p.schedule-time__type` fail to attach, save a full-page screenshot + HTML dump before returning null. Upload as artifact and add a Telegram button so the owner can inspect what the page actually looks like before guessing at new selectors.

## Tried and ruled out
Fixing selectors blindly — ruled out because we had no screenshot of what the page looks like when detection fails, so any selector change would be a guess.

## Watch out
Exit code 2 (schedule skipped) looks like a success in the GitHub Actions UI — the job shows green. Check the Telegram "Schedule Not Detected" notification to know if a real skip happened vs. a selector miss.
