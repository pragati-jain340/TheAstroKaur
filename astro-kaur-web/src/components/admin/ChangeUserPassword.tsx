"use client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useId, useState, type FormEvent } from "react";

export default function ChangeUserPassword({ id, email }: { id: string; email: string }) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function close() {
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
        <Button type="button" variant="outline" onClick={() => { setSuccess(false); setOpen(true); }}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#131F33] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] hover:border-[#E5B842]/50 transition-all cursor-pointer">
          Change password
        </Button>
        {success && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">Password changed successfully.</p>}
      </div>
      <Dialog open={open} onOpenChange={(next) => { if (!next && !saving) close(); }}>
        <DialogContent showCloseButton={!saving} className="block max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-[#E5B842]/30 bg-[#FAF8F5] p-6 text-[#0F172A] dark:bg-[#0D1829] dark:text-[#FAF8F5] sm:max-w-md sm:p-8">
          <form onSubmit={submit} className="space-y-4">
            <DialogTitle className="pr-8 font-serif text-xl font-semibold">Change password</DialogTitle>
            <DialogDescription className="break-words">Set a new password for <strong>{email}</strong>. The new password takes effect immediately.</DialogDescription>
            {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="space-y-1">
              <label htmlFor={`${fieldId}-new`} className="block text-xs font-semibold">New password</label>
              <Input id={`${fieldId}-new`} name="new-password" type="password" autoComplete="new-password" autoFocus
                required minLength={8} maxLength={128} value={password} disabled={saving}
                onChange={event => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#0F172A]/15 bg-white px-3.5 py-2 text-sm dark:border-[#FAF8F5]/15 dark:bg-[#131F33]" />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${fieldId}-confirm`} className="block text-xs font-semibold">Confirm new password</label>
              <Input id={`${fieldId}-confirm`} name="confirm-password" type="password" autoComplete="new-password"
                required minLength={8} maxLength={128} value={confirmation} disabled={saving}
                onChange={event => setConfirmation(event.target.value)}
                className="w-full rounded-xl border border-[#0F172A]/15 bg-white px-3.5 py-2 text-sm dark:border-[#FAF8F5]/15 dark:bg-[#131F33]" />
            </div>
            <p className="text-xs opacity-70">Use 8–128 characters. The existing password cannot be viewed.</p>
            <div className="flex justify-end gap-3 border-t border-[#E5B842]/20 pt-4">
              <Button type="button" variant="outline" onClick={close} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Changing password…" : "Change password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
