---
title: WAF 403 block caused by Chrome/122 user-agent mismatch with Playwright 1.64.1 Chromium 156
author: Seizuree
date: 2026-10-28
branch: main
cost: { minutes: 4, tokens: 2547947 }
id: l-b6049b85
scope: repo
status: active
src: agent
touches:
  - src/browser/stealth-utils.js
---

## Decided
Update user-agent from Chrome/122 to Chrome/136 in `src/browser/stealth-utils.js`. Playwright 1.64.1 ships Chromium 156.0.8078.4 (build 1248), so the old Chrome/122 string was a visible mismatch that Alibaba Cloud ESA WAF (rule 1000027718) detected and blocked with a 403.

## Tried and ruled out
Assumed selector layout change on Talenta — ruled out after downloading the debug snapshot artifact and finding the HTML was a 1027-byte 403 page (`Denied by http_custom`, `lang="zh-CN"`) with no Talenta content at all. The selectors themselves were never the problem.

## Watch out
- The 403 block started Oct 26 — correlates with ubuntu-latest migrating to Ubuntu 26.04 on Oct 19, but the actual trigger was the user-agent mismatch, not the OS change.
- Chrome/136 is chosen as a realistic stable release below the actual Chromium 156 build, to avoid looking like a dev/canary browser. Keep this number in sync when upgrading Playwright significantly.
- Before pushing a user-agent fix, verify locally with HEADLESS=false that Live Attendance actually loads (not 403) and the `div.schedule-time select.custom-select` selector is still present.
