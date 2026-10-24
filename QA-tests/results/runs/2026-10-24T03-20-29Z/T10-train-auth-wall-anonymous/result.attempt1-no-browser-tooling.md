# T10-train-auth-wall-anonymous: Anonymous deep link to the Train tab shows the login wall — Result

| Field | Value |
|---|---|
| Result | BLOCKED |
| Task file | QA-tests/tasks/T10-train-auth-wall-anonymous.md |
| Route | /?tab=train |
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
No test case was executed. This runner spawn had no browser driver: no Playwright / Chrome DevTools MCP tools were attached (a ToolSearch for "playwright browser" returned nothing), and no Bash/shell tool was available, so the fallback of driving Chromium through the Node `playwright` library could not be launched. WebFetch cannot reach localhost. The role `anonymous` resolved fine (authMode `none`); the block is purely tooling. All TCs are BLOCKED and nothing about the app's behaviour was observed. Re-run with the `mcpServers` browser block attached or with a Bash tool available.

## Test Case Results

### TC-01: Happy path — anonymous Train deep link shows the login wall — BLOCKED
- Not executed: no browser driver available in this spawn.

### TC-02: Form validation — login-signin — BLOCKED
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| email + password | both empty | "Please enter your email and password." | not run | BLOCKED |
| email | pattern (`not-an-email`) | native validationMessage non-empty | not run | BLOCKED |
| password | empty | "Please enter your email and password." | not run | BLOCKED |

### TC-03: Modal coverage (login mode switches) — BLOCKED
- Not executed: no browser driver available.

### TC-04: Button coverage — BLOCKED
| Button | Action | Expected | Actual | Result |
|---|---|---|---|---|
| SIGN IN (toggle) | click | stays in sign-in mode | not run | BLOCKED |
| CREATE ACCOUNT (toggle) | click | sign-up fields appear | not run | BLOCKED |
| FORGOT PASSWORD? | click | reset form | not run | BLOCKED |
| BACK TO SIGN IN | click | sign-in mode | not run | BLOCKED |
| SIGN IN (submit) | empty | error message | not run | BLOCKED |
| SIGN IN (submit) | valid data | silent no-op, stays on wall | not run | BLOCKED |

### TC-05: Edge cases — BLOCKED
- Reloads, `/?tab=TRAIN`, `/?tab=bogus`, `/`, and the `/api/coach` probes were not run: no browser driver available.

## Screenshots

No screenshots were captured, because no browser driver was available.

## Console & Network
- console.errors: []
- console.warnings: []
- failedRequests: []
- (Nothing captured. No page was loaded.)

## Defects Found
- DEF-runner-no-browser-tooling: The QA runner spawn had no Playwright/DevTools MCP tools and no Bash tool, so the browser could not be driven. This is an environment/harness defect, not an app defect.
