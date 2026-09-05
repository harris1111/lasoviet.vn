# AI Provider Due Diligence

## Provider Record

- Provider ID: `9router-an`
- Operator: founder-operated
- Intended purpose: evidence-bounded Vietnamese interpretation for
  `ZIWEI-IDENTITY-P0`; the provider must not calculate charts or receive
  unnecessary personal data.
- Production decision: **Pending**

## Operational Capability Evidence

Manual verification completed on 2026-09-02:

- `GET /models` returned HTTP 200 and included the configured model.
- `/chat/completions` returned HTTP 200.
- Strict `response_format.type = json_schema` was supported.
- Forced tool calling was supported.

This verifies an operational capability only. It is not privacy approval and
does not permit production report generation.

## Production-Blocking Unknowns

The following are unknown and block production use until documented and
approved:

- request and log retention;
- training use;
- storage and processing regions;
- upstream model subprocessors;
- access controls;
- deletion behavior;
- incident-notification process.

No credentials, secret values, or provider endpoint details are recorded here.
