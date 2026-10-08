# LSV87: computed monthly attention

## Bounded brief

Owner authorized executable backend work on 2026-10-08. Base: master 49639331.
Use the latest LSV87 owner decision (round-2 R4), not the stale research proposal.
Remove fabricated warning months; share real warning evidence between free and paid
period calculations; preserve leap-month identities; remove the held-membership headline.
No frontend, sale activation, SePay, provider calls, or outbound changes.

## Rule and vendor verification

Exact installed iztro 2.6.0 `monthlyList(year)` returns lunar month numbers and
separate leap-month halves. Free annual output retains twelve regular months;
paid output retains every leap half. Both use the same monthly-palace rule:
a monthly or annual Hua Ji star must actually occur among that palace's major
or minor stars. Evidence records scope and canonical star ID. Natal malefics
are available as chart context but do not independently create warning months.
No minimum warning count, fabricated focus, or distribution adjustment exists.
The existing writer tuple stays unchanged for historical reservations. New source
evidence distinguishes annual from monthly matches; existing frozen sources are not rewritten.

## Verification and remaining acceptance

Run focused engine/writer tests and the compiled 200-chart exporter, then required
i18n/lint/typecheck and CI. The exporter checks replay and free/paid agreement,
records the warning-count distribution, and contains synthetic inputs only.
Synthetic distribution does not prove prediction accuracy. Owner manual review
of 2–3 samples, independent review, deployment, and smoke remain release gates.
An additional malefic threshold needs a grounded specification and comparison;
do not tune a threshold solely to force every chart to contain a warning.

## Decision-record collision

Remote master uses FD-118 for backlog closure. New Kaneo tickets use FD-118 for
revamp round 2. Preserve the existing ID; cite dated ticket/comments for this scope.
Reconcile the identifier separately without asking the owner to repeat decisions.

## Local evidence

- Four focused files: 27 tests passed, including different target/as-of years and
  pre-Tet replay. Independent reviewer reran four files: 20 tests passed; GO.
- Compiled 200-chart export passed replay and free/paid agreement. Warning-count
  histogram: 1=66, 2=86, 3=39, 4=8, 5=1; zero=0. The rule has no minimum count.
- Producer builds and required i18n/lint/typecheck passed (four existing lint
  warnings). Receipt: `plan/evidence/lsv87/monthly-attention-200.json`.
- Manual samples, CI, deployment and smoke are not inferred from local evidence.
