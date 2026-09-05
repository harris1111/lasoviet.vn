"use client";

import { useState } from "react";

import type { AnonymousDeletionResult } from "./delete-anonymous-data";

type AnonymousDataDeletionControlProps = {
  action(): Promise<AnonymousDeletionResult>;
  labels: {
    title: string;
    description: string;
    begin: string;
    confirmation: string;
    cancel: string;
    confirm: string;
    pending: string;
    error: string;
  };
};

export function AnonymousDataDeletionControl({
  action,
  labels,
}: AnonymousDataDeletionControlProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function deleteData() {
    setPending(true);
    setError(false);
    try {
      const result = await action();
      if (!result.ok) {
        setError(true);
        setPending(false);
      }
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="anonymous-deletion-title" className="anonymous-deletion">
      <p className="eyebrow">{labels.title}</p>
      <h2 id="anonymous-deletion-title">{labels.description}</h2>
      {!confirming ? (
        <button
          className="button button-secondary"
          onClick={() => setConfirming(true)}
          type="button"
        >
          {labels.begin}
        </button>
      ) : (
        <>
          <p>{labels.confirmation}</p>
          <div className="anonymous-deletion-actions">
            <button
              className="button button-secondary"
              disabled={pending}
              onClick={() => setConfirming(false)}
              type="button"
            >
              {labels.cancel}
            </button>
            <button
              className="button button-danger"
              disabled={pending}
              onClick={deleteData}
              type="button"
            >
              {pending ? labels.pending : labels.confirm}
            </button>
          </div>
        </>
      )}
      {error ? <p className="form-error" role="alert">{labels.error}</p> : null}
    </section>
  );
}
