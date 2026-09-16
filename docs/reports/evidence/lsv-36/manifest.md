# LSV-36 V4.1 Reader Evidence

Date: 2026-09-16

The V4.1 reader capture uses a schema-valid Tier-2
`ziwei-comprehensive.v3` report through the production `ReportReader` branch.

| Viewport | Screenshot | Result |
| --- | --- | --- |
| 320px | `v4-1-reader-320.png` | Content rendered; no document horizontal overflow; frontispiece loaded from the local fixture; sensitivity narratives are vertically separated. |
| 390px | `v4-1-reader-390.png` | Content rendered; no document horizontal overflow; frontispiece loaded from the local fixture; sensitivity narratives are vertically separated. |
| 1440px | `v4-1-reader-1440.png` | Content rendered; no document horizontal overflow; frontispiece loaded from the local fixture; sensitivity narratives are separate side-by-side panels. |

Run the focused browser capture with `LSV_V4_1_READER_CAPTURE=1`. It serves
the static production reader markup and real frontispiece from a local HTTP
fixture, then verifies non-blank output, document overflow, exactly one
sensitivity section, separation of the stable and time-sensitive narrative
panels, and that every visible image is complete, has a positive natural width,
and resolves from the fixture origin.
