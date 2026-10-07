# Owner-approved backlog closure and free-result revamp

## Approval and scope

On 2026-10-07, the owner answered: “ok chốt, theo cách bạn đề xuất nha”. This accepts the preceding backlog proposal and remaining revamp choices. Q2 and Q9 retain the owner's newer explicit choices. This documentation changes no application code or production configuration.

Baseline: local master `220c76e3ab86c0d7fe3ddfc6106199dc5d56be5a`. The preceding Kaneo audit found nine In Review and two To Do tickets. A fresh audit, external updates and remote reconciliation are pending: the current session denies Kaneo tool approval and cannot connect to GitHub from the shell. No external task status, remote branch or release change is claimed.

## Approved backlog disposition

| Ticket | Disposition | Evidence and retained work |
| --- | --- | --- |
| LSV-50 | Close deployed technical scope after creating/linking the follow-up. | PR311 release `405cf0571bf43c09e98810dc007b4685f84a14c3`: independent deployed GO, 219 focused checks and published isolated HMAC adapter acceptance. Actual provider/bank acceptance is deferred explicitly. |
| LSV-77 | Close deployed technical scope after creating/linking the follow-up. | PR315/316 release `220c76e3ab86c0d7fe3ddfc6106199dc5d56be5a`: independent deployed GO; six published isolated purchase/recovery cases, including two lost-response recoveries; one order/credit/spend retained. Actual QR/bank and physical banking-app acceptance is deferred explicitly. |
| LSV-60 | Close deployed capture/subscription scope after creating/linking the follow-up. | PR309 release `97c9332dd90c01b72479c2e7af89e69e4e7a4ba2`: independent deployed GO, 86 focused and six component checks; published capture processed once and zero on replay. Live delivery and annual-reminder acceptance are deferred explicitly. |
| LSV-79 | Keep open for bounded delivery preparation. | Prepare templates, unsubscribe, verified-account/offer-consent checks, rate caps and emergency stop; propose the first cohort and cap. Actual activation/delivery and observed revenue stay in the follow-up. Existing capture, in-app, click and financial milestones are accepted. |
| LSV-58, LSV-63 | Keep writer campaigns deferred; no Done claim. | Actual topic/month/year quality acceptance remains outstanding. When resumed, prioritize LSV-63 because annual quality unlocks Combo and monthly quality contributes to membership readiness. |
| LSV-64, LSV-65 | Return to the waiting-work queue; preserve sale holds. | Membership retains the complete promised benefits, pending tool contracts/monthly quality. Combo requires annual quality and final atomic-purchase acceptance. |
| LSV-66 | Return to To Do with an explicit deferred note. | PR231 is a held design, not a deployed compatibility product. ZiWei plus BaZi, grounded evidence and consent/revocation remain required. |

The first three closures apply only to owner-approved narrowed deployed scopes. Before changing status, create/link the retained follow-up, attach deployment/smoke evidence and record the scope change in the original task. Reconcile new failures or owner comments found on the fresh task read first. No status updates have been applied yet.

## Follow-ups to retain

1. **Actual SePay and physical banking-app acceptance** (LSV-50/77): verified sandbox/configuration references; auto-approval off in isolated acceptance; authenticated webhook/order/amount/currency checks; actual QR/banking-app navigation; replay and single-credit/single-spend verification. Production activation remains separate. The owner deferred environment setup; do not request it again in this batch.
2. **Controlled live notification/recovery rollout** (LSV-60/79): finish LSV-79 preparation; obtain explicit activation approval for an opted-in verified cohort, daily cap and emergency stop; verify exactly-once delivery, unsubscribe and owned links. Annual reminders depend on LSV-63 quality. Record observed revenue by source excluding QA; synthetic accounting is not real revenue or causal uplift. Keep customer outbound off until that separate approval.

Create follow-up relationships to both source tasks and the LSV-63/79 dependencies. Live acceptance blocks those follow-ups, not the accepted technical closure.

## Approved revamp choices: FD-117

| Choice | Result |
| --- | --- |
| Q1 | Hide unavailable/coming-soon products, including membership, from report selection. |
| Q2 | Remove the separate evidence tab; place factual chart-specific reasons beside assertions. |
| Q3 | Tabs: Overview with chart, This year, Decadal periods, Twelve palaces, Topics. Do not repeat palace details in every tab. |
| Q4 | Locked rows open a deliberate preview for the current chart; price appears inside. Keep locked paid plaintext server-side. |
| Q5 | Offer the available lifetime report now with truthful year-coverage copy. Reserve the annual product until LSV-63 quality acceptance. |
| Q6 | Show a clearly qualified VND equivalent beside La only inside confirmation/unlock, derived from the approved catalog basis. No new wallet/payment authority. |
| Q7 | Replace radar with three structurally strongest palaces and three requiring attention, grounded in the approved deterministic method. |
| Q8 | Approve the ten-year/decadal structural trajectory with a disclosed formula/explanation. No fabricated predictions or undisclosed scores. |
| Q9 | AI writes natural Vietnamese with chart-grounded assertions; retain one call/cache, 3,000 VND/chart and 50,000 VND/day limits. Rules v2 is the truthful error/budget fallback. The rules-only recommendation is superseded. |
| Q10 | Apply proposed double borders and pill/arrow primary controls to chart, product cards and unlock sheet. |

Amend only the affected FD-063/065/109/116 clauses; the FD-063 exception is limited to the disclosed deterministic decadal structure in Q8. Privacy, free/paid separation, retention, durable cost controls and financial authority remain binding. AI is the approved LSV-82 implementation direction; production activation follows enforcement and release acceptance. No runtime flag is toggled by this record.

## Execution order and ownership

1. Apply the split/closure records when Kaneo access is restored.
2. LSV-83 phase two corrects deviations from the approved design. Frontend remains with the owner/Claude; avoid duplicate implementation. New layout and purchase phases still require their HTML previews before product code.
3. LSV-82 backend prepares grounded input/output, prompt/quality contracts and deterministic fallback using the updated Q2/Q9 choices. Claude prepares three synthetic old/new text comparisons for owner review before merge. Do not reopen API/model/pricing decisions.
4. Finish LSV-79 off-by-default email preparation and the rollout proposal without customer sends.

The preceding audit read `plan/free-result-purchase-revamp` at `1b2adc55b7449543693f3c0e9ae54e8bb0295814`. Reconcile its phase-one/three defaults with this approval before implementation. Recheck remote decision IDs before publishing because the plan is maintained concurrently.

## Pending execution

- Refresh Kaneo/remote master in a session with working access; create/link follow-ups, record acceptance and verify status updates.
- Publish this documentation through its dedicated branch/PR into master. Remote publication is not complete.
- Review actual HTML/text previews when delivered. No new scope-choice, API, model or pricing answer is required now.
