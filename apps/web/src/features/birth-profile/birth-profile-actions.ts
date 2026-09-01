"use server";

import { saveBirthProfile } from "./save-birth-profile";

export async function submitBirthProfile(input: {
  profile: unknown;
  explicitConsent: boolean;
}) {
  return saveBirthProfile(input);
}
