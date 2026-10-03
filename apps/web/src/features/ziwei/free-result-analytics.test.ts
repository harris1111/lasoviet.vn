import { describe, expect, it } from "vitest";
import { createFreeResultAnalytics } from "./free-result-analytics";
describe("free result engagement", () => {
  it("does not label an intersection as reading and deduplicates each stage", () => {
    const tracker = createFreeResultAnalytics("vi");
    expect(tracker.visible("gift", 0, true)?.properties.stage).toBe("view");
    expect(tracker.tick("gift", 7999, true)).toBeNull();
    expect(tracker.tick("gift", 8000, true)?.properties.stage).toBe("engaged");
    expect(tracker.tick("gift", 20000, true)).toBeNull();
    tracker.hidden("gift");
    expect(tracker.visible("gift", 30000, true)).toBeNull();
  });
  it("resets dwell when hidden or backgrounded and exports no identity or prose", () => {
    const tracker = createFreeResultAnalytics("en");
    tracker.visible("gift", 0, true);
    expect(tracker.tick("gift", 10000, false)).toBeNull();
    tracker.visible("gift", 11000, true);
    expect(tracker.tick("gift", 18000, true)).toBeNull();
    const event = tracker.tick("gift", 19000, true)!;
    expect(Object.keys(event.properties).sort()).toEqual(["locale", "section_id", "source_kind", "stage"]);
    expect(tracker.door()?.properties.stage).toBe("door");
    expect(tracker.door()).toBeNull();
  });
  it("labels the source honestly: structural by default, validated_artifact only for a rendered gift", () => {
    expect(createFreeResultAnalytics("vi").visible("gift", 0, true)?.properties.source_kind).toBe("structural");
    expect(createFreeResultAnalytics("vi", "validated_artifact").visible("gift", 0, true)?.properties.source_kind).toBe("validated_artifact");
  });
});
