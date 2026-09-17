# AI Provider Due Diligence

## Provider Record

- Provider ID: `9router-an`
- Operator / Controller: founder-operated / self-hosted
- Intended purpose: evidence-bounded Vietnamese interpretation for
  `ZIWEI-IDENTITY-P0`; the provider must not calculate charts or receive
  unnecessary personal data.
- Decision source and date: Founder decision, 2026-09-06 (`FD-035`)
- Completeness reviewer: Terra high (reviewed on 2026-09-06: SPEC PASS / QUALITY APPROVED for record completeness; founder retains sole authority for the operational risk decision)
- Production decision: **Approved by founder on 2026-09-06** (closes Phase 04
  provider privacy due-diligence decision gate only; does not authorize
  production AI activation)

## Operational Capability Evidence

Manual verification completed on 2026-09-02:

- `GET /models` returned HTTP 200 and included the configured model.
- `/chat/completions` returned HTTP 200.
- Strict `response_format.type = json_schema` was supported.
- Forced tool calling was supported.

This verified an operational capability only. It was not privacy approval and
did not permit production report generation.

## Founder Privacy Risk Acceptance

On 2026-09-06, the founder confirmed that `9router-an` is self-hosted and
founder-operated.

The founder does not require separate provider privacy term investigation and
explicitly accepts operational and privacy responsibility for this provider.
Separate enumeration of request and log retention, training use, storage and
processing regions, upstream model subprocessors, access controls, deletion
behavior, and incident-notification processes is waived by the founder because
the deployment is founder-operated/self-hosted, and the founder accepts
responsibility for operation as configured.

This approves and closes the Phase 04 provider privacy due-diligence decision
gate.

## Scope Boundary and Production Activation Gate

This approval closes the Phase 04 provider privacy gate only.

It does NOT itself authorize production AI activation, production payment
activation, deployment, merge, push, release activation, or credentials
changes. Those remain separate founder-controlled operations.

## Required Mitigations

- Data minimization and evidence-bounded inputs: inputs contain only approved,
  frozen chart evidence, identity facts, and approved repository knowledge
  chunks; no unnecessary personal data is transmitted.
- Calculation restriction: the provider must not calculate or recalculate
  charts; chart calculation remains strictly owned by the normalized calculation
  engine.
- Secret protection: credentials, secret values, and provider endpoint details
  remain outside Git, documentation, and application logs.
- Fail-closed validation: all generation attempts remain subject to strict
  deterministic schema, evidence, and safety validation before persistence or
  event emission.
- Material change trigger: any material operator change, endpoint transfer, or
  infrastructure topology change requires renewed due-diligence review.

No credentials, secret values, or provider endpoint details are recorded here.

## Model Selection Record (2026-09-17)

- This execution is explicitly forbidden from using Gemini.
- The selected requested model ID is `ag/claude-sonnet-4-6`; its expected exact
  resolved model ID is `claude-sonnet-4-6`.
- A synthetic strict JSON-schema capability probe on 2026-09-17 returned HTTP
  200, `finish_reason` `stop`, the exact sentinel result, and no report or
  customer data.
- The reviewed pricing record uses the pinned `9router` pricing source at
  commit `17c4cc76877bd1755030a8414f8d0083f48dcccf`: USD per million tokens is
  3.00 input, 15.00 output, and 0.30 cached input. It uses the existing
  production FX provenance: Vietcombank USD sell, 26,110 VND/USD at
  2026-09-14T07:40:00Z.
- Runtime activation must require an exact resolved-model allowlist. Production
  activation remains gated by a reviewed release and environment change,
  production smoke evidence, and the required 20 consecutive sectioned runs.
