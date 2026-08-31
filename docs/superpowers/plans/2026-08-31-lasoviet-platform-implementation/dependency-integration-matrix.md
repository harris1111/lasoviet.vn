# Dependency Integration Matrix

## Audit Snapshot

Audit date: 2026-08-31. Latest commit date is recorded as maintenance evidence,
not as a promise of future support.

| Repository/package | Source | Audited commit | Version | Latest commit | License | Class |
|---|---|---|---:|---:|---|---|
| `harris1111/lasoviet.vn` | `https://github.com/harris1111/lasoviet.vn` | `d89bfc1fe57a23caacb9e5a98b03d70494286a45` | Product repository | 2026-08-31 | Product source | Product |
| `SylarLong/iztro` | `https://github.com/SylarLong/iztro` | `1ba89cca577c6d5d46754d6f49b6b51467c577d1` | 2.6.0 | 2026-08-27 | MIT | B |
| `Brhiza/mingyu` `packages/core` | `https://github.com/Brhiza/mingyu` | `f11b31e69c7e626fe741f8c5f1a3c99b22f74c8f` | 0.2.0 | 2026-08-31 | Package-level MIT | B |
| `Anonyfox/celestine` | `https://github.com/Anonyfox/celestine` | `954d63315ec00d29ba4becaef3f6a101497946b7` | 0.2.1 | 2026-01-01 | MIT | B |

## Production Engines

| Dependency | Used capability | Intentionally ignored | Owned boundary | First-use gate | Replacement |
|---|---|---|---|---|---|
| `iztro` 2.6.0 | Zi Wei natal, palaces, stars, transformations, brightness, approved horoscope metadata | Public school selector, claimed true-solar correction, direct vendor payload use | `IztroAdapter` -> `NormalizedZiweiChartV1` | License/SBOM, `default` fixtures, contract snapshot | Replace adapter implementation |
| `mingyu-core` 0.2.0 | Approved BaZi, Liu Yao, Tarot, date-selection, zodiac, and Feng Shui paths | Automatic public exposure, Mingyu Zi Wei as independent validation, unapproved disciplines | One discipline-specific adapter per capability | Import-path audit, license/SBOM, fixtures or replay tests | Replace one discipline adapter at a time |
| `celestine` 0.2.1 | Tropical natal planets, angles, houses, aspects, retrogrades, and nodes | Solar Return, Vedic substitution, direct vendor payload use | `CelestineAdapter` -> `NormalizedWesternChartV1` | License/SBOM, natal fixtures, contract snapshot | Replace Western adapter implementation |

Production manifests use exact reviewed resolutions. Upgrades occur in focused
changes with changelog review, resolved-tree license/SBOM diff, fixture tests,
and normalized-contract snapshots.

## Validation and Reference

| Repository | Source / audited commit / latest commit | Class | Allowed use | Prohibited use |
|---|---|---|---|---|
| Tianji | `https://github.com/Zijian-Ni/tianji` / `a48cf098bbb4f45ca7848a304ca8d90f50697473` / 2026-08-21 | C | Independent fixtures and method comparison | Automatic production fallback |
| liuyao-divination | `https://github.com/Johnson-Jia/liuyao-divination` / `1a5a78b513c0e7b46dfb29f74043bcf978c32a3e` / 2026-07-17 | C | Liu Yao worked cases and methodology | Unreviewed interpretation import |
| ziwei-chat | `https://github.com/ziweiknows/ziwei-chat` / `ceef938a4ab8d50f864f690fa7d768b4294fcf77` / 2026-08-11 | D | Evidence, critic, retrieval, and eval patterns | Product fork |
| ziwei-chart | `https://github.com/ziweiknows/ziwei-chart` / `b172413d85addbe32facd9e20b9179db619f3afb` / 2026-08-11 | D | UX and information hierarchy | GPL source/component copy |
| Kerykeion | `https://github.com/g-battaglia/kerykeion` / `b18848eb8e1e0a2b09a096dbb9688c8404dfb06b` / 2026-06-30 | D | Western methodology and feature comparison | AGPL import/link/copy |
| Horosa | `https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows` / `b1a957f2d83a82dcc39052b0d0799ae0cd00fded` / 2026-08-24 | D | Mature feature inventory | AGPL import/link/copy |
| VedAstro | `https://github.com/VedAstro/VedAstro` / `fcb4dede360372545eb244c53e9a80ec3510e194` / 2026-08-13 | D | Future Vedic reference | P0 Western substitution |
| Crazycreate/liuyao | `https://github.com/Crazycreate/liuyao` / `a43983b2bf77b48be7e9d668012127e15ec6a0d1` / 2026-06-15 | D | Methodology reading | Code copy without a clear grant |
| meihua-app | `https://github.com/lihongjie0209/meihua-app` / `b282c5cf202b40d1cca3b091c73644de17c44d7e` / 2026-01-16 | D | Future UX/method reference | Code copy without a clear grant |
| palmistry | `https://github.com/yeonsumia/palmistry` / `17610c3f031ee312d3352116eefff9b833e9cafb` / 2026-04-30 | D | Future CV reference | P0 biometric implementation |
| aura | `https://github.com/darktaoist/aura` / `5b5640cb078c7f68ec00e5e7c72d7f399fed1131` / 2026-07-06 | D | Privacy/on-device UX reference | Code copy without a clear grant |

## Practical License Rule

Do not spend P0 effort exhaustively auditing repositories that remain
reference-only. Do verify the exact resolved production package tree before
first import, keep required notices, and stop if a production dependency
introduces an incompatible or unknown runtime license.
