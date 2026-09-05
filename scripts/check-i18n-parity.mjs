import {readdirSync, readFileSync} from "node:fs";
import {basename, dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

function isRecord(value) {
  return value !== null && typeof value === "object";
}

export function flattenKeys(value, prefix = "") {
  if (!isRecord(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.keys(value)
    .flatMap((key) =>
      flattenKeys(value[key], prefix ? `${prefix}.${key}` : key),
    )
    .sort();
}

function valueAtPath(value, path) {
  return path.split(".").reduce((current, key) => {
    return isRecord(current) ? current[key] : undefined;
  }, value);
}

function tokensInString(value) {
  return [...value.matchAll(/\{([A-Za-z][\w.-]*)\}/g)]
    .map((match) => match[1])
    .sort();
}

export function interpolationTokens(value) {
  return Object.fromEntries(
    flattenKeys(value)
      .map((key) => [key, valueAtPath(value, key)])
      .filter(([, leaf]) => typeof leaf === "string")
      .map(([key, leaf]) => [key, tokensInString(leaf)]),
  );
}

export function assertMessageParity(left, right) {
  const leftKeys = flattenKeys(left);
  const rightKeys = flattenKeys(right);
  if (JSON.stringify(leftKeys) !== JSON.stringify(rightKeys)) {
    throw new Error("I18N_KEY_MISMATCH");
  }

  const leftTokens = interpolationTokens(left);
  const rightTokens = interpolationTokens(right);
  for (const key of leftKeys) {
    if (
      JSON.stringify(leftTokens[key] ?? []) !==
      JSON.stringify(rightTokens[key] ?? [])
    ) {
      throw new Error(`I18N_TOKEN_MISMATCH: ${key}`);
    }
  }

  return {ok: true};
}

function readLocaleMessages(messagesRoot, locale) {
  const localeRoot = join(messagesRoot, locale);
  return Object.fromEntries(
    readdirSync(localeRoot)
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map((file) => [
        basename(file, ".json"),
        JSON.parse(readFileSync(join(localeRoot, file), "utf8")),
      ]),
  );
}

const scriptPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === scriptPath) {
  const messagesRoot = join(dirname(scriptPath), "..", "apps", "web", "messages");
  try {
    assertMessageParity(
      readLocaleMessages(messagesRoot, "vi"),
      readLocaleMessages(messagesRoot, "en"),
    );
    console.log("i18n parity passed");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
