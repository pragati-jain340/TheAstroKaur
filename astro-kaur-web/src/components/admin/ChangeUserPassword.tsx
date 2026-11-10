"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

export default function ChangeUserPassword({ id, email }: { id: string; email: string }) {
  const fieldId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
  }, [open]);

  function close() {
    dialogRef.current?.close();
    setOpen(false);
    setPassword("");
    setConfirmation("");
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/users/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to change the password.");
      close();
      setSuccess(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to change the password.");
    } finally {
      setSaving(false);
      setPassword("");
      setConfirmation("");
    }
  }

  return (
    <>
      <div className="space-y-2">
        <button type="button" onClick={() => { setSuccess(false); setOpen(true); }}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#131F33] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] hover:border-[#E5B842]/50 transition-all cursor-pointer">
          Change password
        </button>
        {success && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">Password changed successfully.</p>}
      </div>
      {open && (
        <dialog ref={dialogRef} aria-labelledby={`${fieldId}-title`}
          onCancel={event => { event.preventDefault(); if (!saving) close(); }}
          className="fixed inset-0 z-50 m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-xs">
          <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-3xl border border-[#E5B842]/30 bg-[#FAF8F5] p-6 text-[#0F172A] shadow-2xl dark:bg-[#0D1829] dark:text-[#FAF8F5] sm:p-8">
            <h2 id={`${fieldId}-title`} className="font-serif text-xl font-semibold">Change password</h2>
            <p className="text-sm break-words">Set a new password for <strong>{email}</strong>. The new password takes effect immediately.</p>
            {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="space-y-1">
              <label htmlFor={`${fieldId}-new`} className="block text-xs font-semibold">New password</label>
              <input id={`${fieldId}-new`} name="new-password" type="password" autoComplete="new-password" autoFocus
                required minLength={8} maxLength={128} value={password} disabled={saving}
                onChange={event => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#0F172A]/15 bg-white px-3.5 py-2 text-sm dark:border-[#FAF8F5]/15 dark:bg-[#131F33]" />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${fieldId}-confirm`} className="block text-xs font-semibold">Confirm new password</label>
              <input id={`${fieldId}-confirm`} name="confirm-password" type="password" autoComplete="new-password"
                required minLength={8} maxLength={128} value={confirmation} disabled={saving}
                onChange={event => setConfirmation(event.target.value)}
                className="w-full rounded-xl border border-[#0F172A]/15 bg-white px-3.5 py-2 text-sm dark:border-[#FAF8F5]/15 dark:bg-[#131F33]" />
            </div>
            <p className="text-xs opacity-70">Use 8–128 characters. The existing password cannot be viewed.</p>
            <div className="flex justify-end gap-3 border-t border-[#E5B842]/20 pt-4">
              <button type="button" onClick={close} disabled={saving} className="rounded-xl px-4 py-2 text-xs disabled:opacity-50 cursor-pointer">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-full bg-[#E5B842] px-6 py-2.5 text-xs font-semibold text-[#0F172A] disabled:opacity-50 cursor-pointer">
                {saving ? "Changing password…" : "Change password"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
