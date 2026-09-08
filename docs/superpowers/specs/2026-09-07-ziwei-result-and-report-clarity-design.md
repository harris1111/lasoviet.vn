# Zi Wei Result and Report Clarity Design

**Date:** 2026-09-07
**Status:** Founder approved

## Goal

Make the Phase 04 Zi Wei result and paid identity report clear, fully localized,
fact-specific, and useful without changing payment behavior, report
authorization, immutable report history, or production deployment state.

## Root Causes

1. Evidence interpretation bounds are stored in English and rendered verbatim.
2. The chart view contract omits the authorized birth-profile revision, so the
   result page cannot display the submitted birth data.
3. The free preview renders generic evidence limits instead of calculated chart
   facts already available to the page.
4. Report retrieval searches by generic section purpose, flattens section
   metadata, and truncates the 11-section corpus to eight passages.
5. The writer receives canonical IDs without reader-friendly fact labels and
   has weak Vietnamese style requirements.
6. The critic scores eight dimensions but blocks only low correctness or
   safety, allowing unclear and generic reports to persist.

## Architecture

### Result projection and presentation

Extend the owner-authorized chart projection with a minimal birth summary from
the exact immutable profile revision used to calculate the chart. The summary
contains calendar date/type, birth-time precision/value, timezone provenance,
and gender. It excludes consent metadata, account identity, raw coordinates,
and unrelated profile revisions.

Use canonical evidence bound codes for presentation. Existing English storage
strings remain immutable and are never rendered directly when a supported code
exists.

The result page derives human-readable highlights from the normalized chart:

- birth input summary;
- Life Palace branch and principal stars;
- Body Palace placement and branch;
- Four Transformations with localized star and transformation names.

### Knowledge and retrieval

Add approved first-party Vietnamese and English knowledge manifests at
`ziwei.identity.knowledge.v2`. Content remains limited to the facts Phase 04
actually supplies: Life Palace, Body Palace, earthly branches, Four
Transformations, reflective interpretation, and responsible action framing.

The worker provisions both manifests idempotently before processing report
jobs. The worker runtime image includes the repository `content` directory.
Provisioning failure blocks report processing rather than silently using a
missing or mismatched corpus.

Retrieval queries combine the localized section purpose with localized frozen
facts. Writer context preserves passage section metadata and source
attribution, with a bounded total context that can represent all 11 sections.

### Writer and quality gate

Prompt version `ziwei.identity.prompt.v2` requires:

- fixed localized section titles;
- short, natural sentences;
- concrete chart facts before interpretation;
- the sequence evidence, possible manifestation, self-check, action;
- explanations for specialist terms;
- no Barnum filler, academic abstraction, deterministic claims, or repeated
  disclaimers.

The assembler overwrites model section titles with canonical localized titles.
The critic requires scores of at least four for correctness, evidence coverage,
specificity, language clarity, consistency, actionability, safety, and
repetition control.

Low non-safety quality triggers one bounded rewrite using the first draft and
critic notes. The rewritten draft is validated and criticized once. A second
failure terminates safely and persists no report version.

## Compatibility

- Existing chart and evidence rows remain readable.
- Existing immutable paid report content is not rewritten.
- Existing report evidence rails become localized at render time.
- New paid reservations use knowledge V2 and prompt V2.
- No production AI call, deployment, push, merge, or external provider action
  is part of this local implementation.

## Verification

Run only focused contract, Zi Wei query/presentation, free-preview, report
writer, critic, generation, and worker provisioning tests. Then run workspace
typecheck, the web production build, i18n parity, and `git diff --check`.

