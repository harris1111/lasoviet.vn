import {applyIsolatedAcceptanceCatalog} from "./acceptance-qa-catalog.mjs";
console.log(JSON.stringify({isolatedAcceptanceCatalog: applyIsolatedAcceptanceCatalog()}));
await import("../apps/api/dist/main.js");
