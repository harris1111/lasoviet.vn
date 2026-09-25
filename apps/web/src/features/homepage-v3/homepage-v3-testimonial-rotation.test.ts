import { describe, expect, it } from "vitest";

import { advanceRotation, createRotation, SLOT_ORDER } from "./homepage-v3-testimonial-rotation";

const QUEUE = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
const FIRST_SIX = ["a", "b", "c", "d", "e", "f"];

describe("testimonial rotation", () => {
  it("starts with the first six ids in order", () => {
    expect(createRotation(QUEUE, 6).slots).toEqual(FIRST_SIX);
  });

  it("replaces one slot per tick, following SLOT_ORDER", () => {
    const next = advanceRotation(createRotation(QUEUE, 6));
    expect(next.changedSlot).toBe(SLOT_ORDER[0]);
    expect(next.slots[SLOT_ORDER[0] ?? 0]).toBe("g");
    expect(next.slots.filter((id, i) => id !== FIRST_SIX[i])).toHaveLength(1);
  });

  it("never shows the same id twice at once", () => {
    let state = createRotation(QUEUE, 6);
    for (let i = 0; i < 40; i++) {
      state = advanceRotation(state);
      expect(new Set(state.slots).size).toBe(6);
    }
  });

  it("shows every id within one full cycle", () => {
    let state = createRotation(QUEUE, 6);
    const seen = new Set(state.slots);
    for (let i = 0; i < QUEUE.length; i++) {
      state = advanceRotation(state);
      state.slots.forEach((id) => seen.add(id));
    }
    expect(seen.size).toBe(QUEUE.length);
  });

  it("uses fewer slots when asked (tablet: 4)", () => {
    const state = advanceRotation(createRotation(QUEUE, 4));
    expect(state.slots).toHaveLength(4);
    expect(state.changedSlot).toBeLessThan(4);
  });

  it("does nothing when every id already fits", () => {
    const state = advanceRotation(createRotation(["a", "b"], 6));
    expect(state.slots).toEqual(["a", "b"]);
    expect(state.changedSlot).toBeNull();
  });
});
