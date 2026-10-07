// `sourceKind` is "validated_artifact" only when a ready gift is actually rendered.
export function createFreeResultAnalytics(locale: "vi" | "en", sourceKind: "structural" | "validated_artifact" = "structural") {
  const emitted = new Set<string>();
  const started = new Map<string, number>();
  function claim(section: string, stage: "view" | "engaged" | "door") {
    const key = `${section}:${stage}`;
    if (emitted.has(key)) return null;
    emitted.add(key);
    return { name: "free_result_interaction" as const,
      properties: { section_id: section, stage, locale, source_kind: sourceKind } };
  }
  return {
    visible(section: string, time: number, foreground: boolean) {
      if (!foreground) return null;
      if (!started.has(section)) started.set(section, time);
      return claim(section, "view");
    },
    hidden(section: string) { started.delete(section); },
    tick(section: string, time: number, foreground: boolean) {
      if (!foreground) { started.delete(section); return null; }
      const start = started.get(section);
      return start !== undefined && time - start >= 8000 ? claim(section, "engaged") : null;
    },
    door() { return claim("offer", "door"); },
    depth(foreground: boolean) {
      if (!foreground || emitted.has("depth:100")) return null;
      emitted.add("depth:100");
      return { name: "free_read_depth" as const, properties: { percent: 100, locale, source_kind: sourceKind } };
    },
    preview(section: string) {
      if (emitted.has(`preview:${section}`)) return null;
      emitted.add(`preview:${section}`);
      return { name: "locked_preview_open" as const, properties: { section_id: section, locale, source_kind: "structural" } };
    },
  };
}
