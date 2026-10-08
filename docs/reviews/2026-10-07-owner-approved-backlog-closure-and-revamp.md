# Owner-approved backlog closure and free-result revamp

## Approval and scope

On 2026-10-07, the owner answered: “ok chốt, theo cách bạn đề xuất nha”. This accepts the preceding backlog proposal and remaining revamp choices. Q2 and Q9 retain the owner's newer explicit choices. This documentation changes no application code or production configuration.

Baseline: local master `220c76e3ab86c0d7fe3ddfc6106199dc5d56be5a`. The preceding Kaneo audit found nine In Review and two To Do tickets. On 2026-10-08, GitHub push access, Docker and Kaneo task reads/writes were verified. Remote master remains at that baseline; the plan branch advanced to `fc0687287bcd9608794c1bf9c0ca953263e05808`. The old handoff reflected access failures in the previous session, not current restrictions.

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

The first three closures apply only to owner-approved narrowed deployed scopes. Before changing status, create/link the retained follow-up, attach deployment/smoke evidence and record the scope change in the original task. Reconcile new failures or owner comments found on the fresh task read first. Kaneo follow-ups LSV-84 (`ir8gtja3rv63n41t1rb81d3v`) and LSV-85 (`g6cfpphfhrmhsfci2s9vpvsr`) were created and related before closure on 2026-10-08. Original deployed evidence was read back; LSV-50/77/60 status `done` and LSV-79 `in-progress` were read back successfully. LSV-63 and LSV-79 block LSV-85, never the reverse.

## Follow-ups to retain

1. **Actual SePay and physical banking-app acceptance** (LSV-50/77): verified sandbox/configuration references; auto-approval off in isolated acceptance; authenticated webhook/order/amount/currency checks; actual QR/banking-app navigation; replay and single-credit/single-spend verification. Production activation remains separate. The owner deferred environment setup; do not request it again in this batch.
2. **Controlled live notification/recovery rollout** (LSV-60/79): finish LSV-79 preparation; obtain explicit activation approval for an opted-in verified cohort, daily cap and emergency stop; verify exactly-once delivery, unsubscribe and owned links. Annual reminders depend on LSV-63 quality. Record observed revenue by source excluding QA; synthetic accounting is not real revenue or causal uplift. Keep customer outbound off until that separate approval.

Create follow-up relationships to both source tasks and the LSV-63/79 dependencies. Live acceptance blocks those follow-ups, not the accepted technical closure.

## Approved revamp choices: FD-117

| Choice | Result |
| --- | --- |
| Q1 | Audit the full product lineup and build missing products when their gates pass; unavailable items remain hidden until then. No held package is activated by this batch. |
| Q2 | Remove the separate evidence tab; place factual chart-specific reasons beside assertions. |
| Q3 | Tabs: Overview with chart, This year, Decadal periods, Twelve palaces, Topics. Do not repeat palace details in every tab. |
| Q4 | Locked rows open a deliberate preview for the current chart; price appears inside. Keep locked paid plaintext server-side. |
| Q5 | Plan per-person current/next-year and decadal offers; retain the truthful lifetime fallback until the relevant product passes its quality gate. |
| Q6 | Keep content prices in La. A qualified VND equivalent belongs only at final confirmation immediately before payment; FD-065 otherwise stays binding. |
| Q7 | Replace radar with three structurally strongest palaces and three requiring attention, grounded in the approved deterministic method. |
| Q8 | Approve the ten-year/decadal structural trajectory with a disclosed formula/explanation. No fabricated predictions or undisclosed scores. |
| Q9 | AI writes natural Vietnamese with chart-grounded assertions; retain one call/cache, 3,000 VND/chart and 50,000 VND/day limits. Rules v2 is the truthful error/budget fallback. The rules-only recommendation is superseded. |
| Q10 | Apply proposed double borders and pill/arrow primary controls to chart, product cards and unlock sheet. |

Preserve the detailed FD-117 already recorded on the plan branch, including Q1 product audit, Q5 per-person year logic, Q6 final-confirmation boundary and Q8 reuse of the approved palace structural score. The old handoff paraphrase of Q6 was broader (confirmation/unlock); it is retained in the original portable patch as historical evidence and superseded here by the more precise existing record. FD-065 stays unchanged outside its existing final payment boundary. Amend only the affected FD-063/109/116 clauses; the FD-063 exception is limited to the disclosed deterministic decadal structure in Q8. Privacy, free/paid separation, retention, durable cost controls and financial authority remain binding. AI is the approved LSV-82 implementation direction; production activation follows enforcement and release acceptance. No runtime flag is toggled by this record.

## Execution order and ownership

1. Split/closure records were applied with follow-up and deployment evidence; retain the unverified live requirements in LSV-84/85.
2. LSV-83 phase two corrects deviations from the approved design. Frontend remains with the owner/Claude; avoid duplicate implementation. New layout and purchase phases still require their HTML previews before product code.
3. LSV-82 backend prepares grounded input/output, prompt/quality contracts and deterministic fallback using the updated Q2/Q9 choices. Claude prepares three synthetic old/new text comparisons for owner review before merge. Do not reopen API/model/pricing decisions.
4. Finish LSV-79 off-by-default email preparation and the rollout proposal without customer sends.

The preceding audit read the plan at `1b2adc55b7449543693f3c0e9ae54e8bb0295814`; the refreshed branch is `fc0687287bcd9608794c1bf9c0ca953263e05808`. Research 01–04 and round-2 R1–R13 are proposals awaiting their corresponding decisions. They do not reopen the approved API/model/pricing or Q2/Q9 choices. LSV-82 preparation may proceed without live calls or merging owner text samples before approval.

## Pending execution

- Follow-ups and narrowed closure receipts are recorded above; waiting-product status reconciliation and LSV-79/82 implementation remain tracked separately.
- Publish this documentation through its dedicated branch/PR into master. Remote publication is not complete.
- Review actual HTML/text previews when delivered. No new scope-choice, API, model or pricing answer is required now.
