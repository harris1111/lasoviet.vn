# LSV-19 UI Foundation Artifact Evidence

Date: 2026-09-16

Internal renderer: `apps/web/src/components/ui/ui-core-artifact-renderer.tsx`

| Viewport | Screenshot | Result |
| --- | --- | --- |
| 320px | `ui-core-320.png` | Content rendered; no document horizontal overflow; stable cards and controls. |
| 390px | `ui-core-390.png` | Content rendered; no document horizontal overflow; stable cards and controls. |
| 1440px | `ui-core-1440.png` | Content rendered; two-column artifact layout is intact. |

The focused capture test verifies non-blank output, document overflow, card separation,
minimum control height, and primary action separation. Visual approval remains with the owner.
