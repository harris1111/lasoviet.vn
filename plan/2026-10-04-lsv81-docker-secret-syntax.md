# LSV81 Docker secret frontend correction

Production publish for reviewed PR279 failed before web build with `unexpected key env in env=SENTRY_AUTH_TOKEN`. The web Dockerfile pins frontend1.7 but secret environment mounts require frontend1.10. This mismatch was missed by non-Docker production checks.

Bounded change: pin only apps/web/Dockerfile to docker/dockerfile:1.10. Preserve BuildKit secret-only credentials, disabled monitoring default, source-map stripping, image layout and runtime environment. No provider/configuration/host changes.

Primary reference: https://docs.docker.com/reference/dockerfile/#run---mounttypesecret explicitly documents env support since1.10. Verify actual local BuildKit parser/full image build, required i18n/lint/typecheck, independent exact-head review and CI before merge; installed locked deploy and disabled-runtime smoke before reporting prepared deployment. Real project/map/event acceptance remains pending and LSV81 stays In Review.

## Local evidence

Actual full Docker image build passed with frontend1.10. Runtime scan found73 public static files, zero public source maps, zero Sentry-bearing JS chunks and no upload-token environment variable. A synthetic-secret BuildKit probe proved the environment mount exists in its RUN and is absent in the next RUN. Required repository checks are recorded in PR evidence after completion.
