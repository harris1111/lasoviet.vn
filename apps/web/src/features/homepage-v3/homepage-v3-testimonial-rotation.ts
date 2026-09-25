/** Order in which grid slots change, so the motion moves around the 3×2 grid instead of sweeping left to right. */
export const SLOT_ORDER: readonly number[] = [4, 1, 5, 0, 3, 2];

export type RotationState = {
  queue: readonly string[];
  slots: string[];
  /** Next queue index to bring in. */
  cursor: number;
  /** Position in SLOT_ORDER for the next change. */
  tick: number;
  changedSlot: number | null;
};

export function createRotation(queue: readonly string[], slotCount: number): RotationState {
  const count = Math.min(slotCount, queue.length);
  return { queue, slots: queue.slice(0, count), cursor: queue.length ? count % queue.length : 0, tick: 0, changedSlot: null };
}

/** Swap exactly one slot for the next quote that is not already on screen. */
export function advanceRotation(state: RotationState): RotationState {
  const { queue, slots } = state;
  if (queue.length <= slots.length) return { ...state, changedSlot: null };
  const order = SLOT_ORDER.filter((slot) => slot < slots.length);
  const slot = order[state.tick % order.length] ?? 0;
  let cursor = state.cursor;
  while (slots.includes(queue[cursor] ?? "")) cursor = (cursor + 1) % queue.length;
  const next = [...slots];
  next[slot] = queue[cursor] ?? next[slot] ?? "";
  return { queue, slots: next, cursor: (cursor + 1) % queue.length, tick: state.tick + 1, changedSlot: slot };
}
