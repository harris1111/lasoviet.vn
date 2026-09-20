import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(packageRoot, "src/pdf/assets/fonts");
const destination = resolve(packageRoot, "dist/pdf/assets/fonts");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
