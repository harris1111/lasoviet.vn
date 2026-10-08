# LSV89 frozen commercial authority

Base: cc1e34817549f274bcb1887118215e3bac443e77. FD121 requires frozen promises
for existing purchases and pending same-order top-ups before the FD119 release.

This additive milestone snapshots the current, unchanged commercial policy on
server-created wallet intents. Null snapshots explicitly retain historical
policy. Bind the snapshot to SKU, locale, period and charged ledger authority;
make the database reject subsequent financial-term edits. Use the frozen catalog base, guarantee and original benefit attribution in
settlement, receipt/report authorization and upgrade attribution. Unbound pending
offers retain live membership/rollover repricing against their historical base; a
changed quote creates a new immutable intent. A bound same-order top-up keeps its
accepted charge/proof while the original benefit remains valid, and blocks unlock
while retaining credited balance when a conditional benefit expires. Preserve period, ownership,
active entitlement, membership-free-month and rollover-expiry checks.

Scope: backend commercial authority and its wallet/report readers; database
schema plus a new migration; focused PostgreSQL financial acceptance. No frontend,
active catalog price, availability, sale flag, guarantee amount, provider dispatch,
customer outbound or operator configuration changes. The subsequent FD119 release
must combine new prices with reviewed half-restoration allocation/revenue guards
and full terminal-failure compensation. This milestone does not complete LSV89.

Validation: legacy-null pending and completed authority, immutable/malformed
snapshots, current catalog drift, membership/rollover/monthly-zero/Combo and
same-order top-up replay; focused integration checks, producer rebuild, i18n,
lint/typecheck, independent exact-head review and fresh CI before deployment.
