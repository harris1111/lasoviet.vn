import { lstat, readdir, unlink } from "node:fs/promises";
import { resolve, relative, join } from "node:path";

// Runs inside the image build only; never follows symlinks or leaves the web build directory.
const root = resolve("apps/web/.next");
for (const argument of process.argv.slice(2)) {
  const directory = resolve(argument);
  if (!relative(root, directory) || relative(root, directory).startsWith("..")) throw new Error("Invalid web build artifact directory");
  async function visit(path) {
    const info = await lstat(path);
    if (info.isSymbolicLink()) return;
    if (info.isDirectory()) {
      for (const entry of await readdir(path)) await visit(join(path, entry));
    } else if (info.isFile() && path.endsWith(".map")) await unlink(path);
  }
  await visit(directory);
}
