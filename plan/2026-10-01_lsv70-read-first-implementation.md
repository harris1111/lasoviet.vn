# LSV-70 read-first implementation

## Scope and gates

Owner approved FD-109 and the simple UI/projection/cache-first sequence on
2026-10-01. FD-109a records the delegated free-AI ceilings.

1. Build the private result page from the approved mobile-first prototype.
2. Replace immediate prices, offers and paid actions with a deterministic map,
   secure preview and one final offer destination.
3. Reuse existing chart, insight, score and evidence building blocks. Do not
   change sample readers, paid readers, checkout, route/auth or retention rules.
4. Pass explicit actor audience and sign-in callback; redact guest-only insight
   and annual month detail before serializing to client components.
5. On mobile all blocks share one ordered DOM; desktop keeps six URL-driven tabs
   and a chart-only rail. URL tab/open state must continue to work.
6. Reveal the mobile paid sticky only after completion visibility or a locked
   preview interaction. Keyboard/dialog close restores focus; sheet locks scroll.
7. If a full cached free palace is unavailable, label the deterministic structure
   as a preview, never as an AI/full reading. Never invent completion counts.

## AI safety boundary

This first implementation must make zero new provider calls. There is currently
no wired standalone free-palace writer or durable free-budget repository.
FD-109a is not itself budget enforcement. Do not introduce a full paid-report
generation to fill the gap. New generation requires a separately reviewed durable
reservation/cache/quota implementation and provider preflight. UI can ship with
truthful structural fallback; #70 is not Done until its target release and smoke
evidence are recorded, and the full reading gap must stay explicit.

## Acceptance

- No price/offer/purchase controls in the free-result body.
- Same offer destination from completion, eligible sticky and locked preview.
- Guest has one insight; verified actor has the authorized second insight.
- No hidden locked narrative or masked month identities in HTML/RSC props.
- Correct counts derived from actual available data; no fabricated cycle count.
- Mobile no horizontal overflow at 360/390/430; desktop six tabs and chart rail.
- Existing private-route 404, delete, retention and sign-in callback stay intact.
- Focused rendering/security tests, i18n, lint and typecheck pass.
- Independent Sol medium review before expensive build/browser/release gates.

## Routing

Reviewer/orchestrator: Sol medium; bounded implementer: Flash medium. The owner's
latest routing decision supersedes the old Terra/Luna references in this branch.
