export type LockRef = {
  current: boolean;
};

export type AuthLockResult<T> =
  | { status: "blocked" }
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; error: unknown };

export async function withAuthRequestLock<T>(
  lock: LockRef,
  request: () => Promise<T>,
): Promise<AuthLockResult<T>> {
  if (lock.current) {
    return { status: "blocked" };
  }
  lock.current = true;
  try {
    const value = await request();
    return { status: "fulfilled", value };
  } catch (error) {
    return { status: "rejected", error };
  } finally {
    lock.current = false;
  }
}
