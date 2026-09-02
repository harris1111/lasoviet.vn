"use server";

export async function submitBirthProfile(input: {
  profile: unknown;
  explicitConsent: boolean;
}) {
  const { saveBirthProfile } = await import("./save-birth-profile");
  return saveBirthProfile(input);
}
