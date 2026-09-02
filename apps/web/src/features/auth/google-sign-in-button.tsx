"use client";

type GoogleSignInButtonProps = {
  callbackURL: string;
  disabled?: boolean;
  label: string;
  onSignIn(callbackURL: string): Promise<{ ok: boolean }>;
};

export function GoogleSignInButton({
  callbackURL,
  disabled = false,
  label,
  onSignIn,
}: GoogleSignInButtonProps) {
  return (
    <button
      className="auth-provider-button"
      disabled={disabled}
      onClick={() => void onSignIn(callbackURL)}
      type="button"
    >
      <span aria-hidden="true">G</span>
      {label}
    </button>
  );
}
