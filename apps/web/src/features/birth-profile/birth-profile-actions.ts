"use server";

import type { ReadingContextV1 } from "@lasoviet/contracts";

export async function submitBirthProfile(input: {
  profile: unknown;
  explicitConsent: boolean;
  readingContext?: ReadingContextV1;
}) {
  const { saveBirthProfile } = await import("./save-birth-profile");
  return saveBirthProfile(input);
}
