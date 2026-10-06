# LSV60 published notification capture acceptance

Date: 2026-10-06 UTC. Independent Sol review: GO for this capture milestone; full LSV60 remains In Review.

Published release: `54702b81554c16d9447e350875e42ba6d6f3cbf7` ([PR305](https://github.com/harris1111/lasoviet.vn/pull/305)). The isolated API, web and worker image references use that exact release. The test invokes the published compiled notification, preference and SMTP services with injected clocks; it does not prove the production worker scheduler or real customer delivery.

The QA environment uses an internal Docker network, a tmpfs database, synthetic recipients/consent/funding and report fixtures, and Mailpit SMTP capture. Verified sign-in and chart calculation run through the actual QA application. No production database fixtures or live outbound mail are used.

| Acceptance | Result |
| --- | --- |
| Report truly absent before publication; five-minute delayed completion boundary | Suppressed before ready; one capture when the owned report is ready |
| Replayed completion, revoked purchase, deleted profile, current presence | No additional capture |
| Nurture before and at 48 hours from verified sign-in | No early queue; eligible queue is idempotent; one capture |
| Unsubscribe or purge before delivery | Zero captures; permanent suppression |
| Annual product remains reserved | Reminder suppressed; no positive annual campaign claim |
| Synthetic sign-up rate limit | Bounded retry follows the server Retry-After; production limits unchanged |
| Fixture cleanup | Four QA containers, internal network and private credentials removed |

The first two failed attempts are preserved privately: an incorrect unready fixture already had a persisted report, then a fast synthetic sign-up hit the existing auth rate limit. Only the corrected final run passed. `sent` means the SMTP adapter handed the message to Mailpit.

Full-ticket limits: the annual positive campaign depends on the held annual product; outbound delivery and an approved cohort remain deferred. The report-ready opt-in extension was subsequently deployed and accepted in PR309; see [subscription acceptance](../lsv60-subscription/published-acceptance.md). Capture data must not be reported as actual recipients, conversion or recovered revenue.

Private evidence directory: `/home/debian/projects/lasoviet-lsv60-capture-evidence-20261006`. Only this aggregate receipt belongs in Git; recipient identities, credentials, database fixtures and raw logs remain private. Kaneo acceptance comment: `mprkd0h26irckdm7dsbz0yde`.
