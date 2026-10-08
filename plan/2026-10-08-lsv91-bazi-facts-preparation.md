# LSV91 Bazi factual adapter preparation

The owner authorized Bazi and a two-person reading on 2026-10-08, including the
new approved prices. Prepare a pure, versioned Bazi fact adapter using the exact
installed lunar-typescript 1.8.6 API. No caller, route, persistence, writer, commerce
or sale activation is introduced by this milestone. No counterparty-consent or
separate legal approval flag is added, following the latest owner instruction.

Input is an already normalized local solar date and optional exact local time.
Methodology is explicit: vendor solar-term (LiChun) year/month, EightChar sect 2
(midnight day boundary), local civil clock with no true-solar-time correction.
The late-Zi hour (23:00–23:59) retains the vendor's next-day stem for the
hour pillar, while the day pillar changes at civil midnight. This mixed convention
is explicit and tested; it is not a claim of independently verified methodology.
When time is missing, emit no hour pillar; bound possible year/month/day pillars
by both ends of the date, exposing uncertainty at solar-term transitions instead
of inventing noon. Canonical stems/branches/hidden stems and sourced evidence
only; no compatibility percentage, fortune score or predictions.

Reject invalid calendar/time input. Verify exact installed vendor projection,
unknown-time/solar-term ambiguity, late Zi midnight policy and deterministic
replay. Export 3 synthetic owner samples; evidence is vendor parity, not independent
accuracy acceptance. Pure preparation is reviewable separately from full
normalization/storage/evidence/writer/paid two-person integration, which remains
open in LSV91. Customer-facing name comes from a future neutral catalog SKU.
