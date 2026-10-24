# T40-profile-auth-wall-anonymous: Anonymous visit to the Profile deep link shows the login wall — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T40-profile-auth-wall-anonymous.md |
| Route | /?tab=profile |
| Date (UTC) | 2026-10-24T03:20:29Z |
| Run id | 2026-10-24T03-20-29Z |
| Duration (s) | 0 |
| Role | anonymous |
| Browser engine | none (unavailable) |
| Browser channel | chromium |
| Headless | true |
| Screenshots | 0 |
| Console errors | 0 |
| Network failures | 0 |

## Summary
Not executed. The runner spawn had no browser-driving capability. No Playwright MCP tools (`browser_*`) were exposed, and no shell/Bash tool was available to launch the pre-installed Node `playwright` library as the fallback. WebFetch refuses localhost URLs. The anonymous role resolved fine (`authMode: none`), so credentials are not the blocker. Every TC is marked BLOCKED. No app behaviour was observed, so nothing in this result is evidence of PASS or FAIL.

## Test Case Results

### TC-01: Happy path — deep link is held behind the login wall — BLOCKED
- Reason: no browser tool or shell available in the runner spawn.

### TC-02: Form validation — login wall signin form — BLOCKED
- Reason: no browser tool or shell available in the runner spawn.
- The task expects a stale-inline-error defect here. It could not be re-confirmed in this run.

### TC-03: Button coverage — BLOCKED
- Reason: no browser tool or shell available in the runner spawn.

### TC-04: Edge cases — BLOCKED
- Reason: no browser tool or shell available in the runner spawn.

## Screenshots

No screenshots were captured, because the browser was unavailable.

## Console & Network
- console.errors: [] (not captured)
- console.warnings: [] (not captured)
- failedRequests: [] (not captured)

## Defects Found
- DEF-runner-no-browser-tooling: The QA runner spawn had no Playwright MCP tools and no Bash tool. Re-run with the `mcpServers` browser block attached, or with shell access for the Node playwright fallback.
