// Reports each opened tab to the server at most once, fire-and-forget. A failure (offline, signed out,
// server error) is swallowed: engagement is a best-effort signal and must never affect the reading.
export function createEngagementReporter(record: ((tab: string) => Promise<void>) | undefined) {
  const sent = new Set<string>();
  return {
    report(tab: string): void {
      if (!record || sent.has(tab)) return;
      sent.add(tab);
      try {
        void Promise.resolve(record(tab)).catch(() => undefined);
      } catch {
        // a synchronous throw is treated the same way
      }
    },
  };
}
