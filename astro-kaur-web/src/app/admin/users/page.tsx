"use client";
import { NativeSelect } from "@/components/ui/native-select";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import AvatarDisplay from "@/components/avatar/AvatarDisplay";
import { useAuth } from "@/context/AuthContext";
import { Plus, RotateCw, Search, UserRound } from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface UserItem {
  id: string;
  auth_user_id: string;
  display_name: string | null;
  email: string;
  role: "admin" | "customer";
  account_status: "active" | "suspended" | "deactivated";
  readings_count: number;
  total_spent: number;
  created_at: string;
  avatar_url?: string | null;
  avatar_seed?: string | null;
}

type RoleFilter = "all" | "customer" | "admin";
type StatusFilter = "all" | "active" | "suspended" | "deactivated";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<UserItem | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Create User Drawer State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<"customer" | "admin">("customer");
  const [createPassword, setCreatePassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load users.");
      if (json.users) {
        setUsers(json.users);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchUsers);
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: createName,
          email: createEmail,
          role: createRole,
          password: createPassword || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create user");
      }

      setCreateSuccess(
        `User ${createEmail} created successfully! ${
          json.temporaryPassword
            ? `Assigned temporary password: ${json.temporaryPassword}`
            : ""
        }`
      );
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("customer");

      await fetchUsers();
      setTimeout(() => {
        setAddModalOpen(false);
        setCreateSuccess(null);
      }, 3500);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create user.");
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.account_status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = (u.display_name || "").toLowerCase().includes(q);
        const emailMatch = (u.email || "").toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / 20));
  const currentPage = Math.min(page, pageCount);
  const visibleUsers = filteredUsers.slice((currentPage - 1) * 20, currentPage * 20);

  const confirmStatusChange = async () => {
    if (!pendingUser) return;
    setSavingStatus(true);
    setStatusError(null);
    const accountStatus = pendingUser.account_status === "active" ? "deactivated" : "active";
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingUser.id, accountStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update this account.");
      setNotice(`${pendingUser.display_name || pendingUser.email} ${accountStatus === "active" ? "reactivated" : "deactivated"}.`);
      setPendingUser(null);
      await fetchUsers();
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Could not update this account.");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="space-y-7 pb-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-2 text-sm text-muted-foreground">View profiles and manage access to customer accounts.</p>
          <p className="mt-2 text-xs text-muted-foreground">{users.length} registered ? {users.filter(user => user.account_status === "active").length} active</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void fetchUsers()} disabled={loading}><RotateCw aria-hidden="true" className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          <Button type="button" onClick={() => setAddModalOpen(true)}><Plus aria-hidden="true" className="size-4" />Add user</Button>
        </div>
      </header>
      {notice && <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">{notice}</p>}
      <div className="flex flex-col gap-3 xl:flex-row">
        <label className="relative block flex-1">
          <span className="sr-only">Search users by name or email</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search by name or email..." className="h-10 bg-card pl-9" />
        </label>
        <div className="grid grid-cols-2 gap-3 xl:w-80">
          <NativeSelect aria-label="Filter by role" value={roleFilter} onChange={event => { setRoleFilter(event.target.value as RoleFilter); setPage(1); }} className="h-10 bg-card">
            <option value="all">All roles</option><option value="customer">Customers</option><option value="admin">Administrators</option>
          </NativeSelect>
          <NativeSelect aria-label="Filter by account status" value={statusFilter} onChange={event => { setStatusFilter(event.target.value as StatusFilter); setPage(1); }} className="h-10 bg-card">
            <option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="deactivated">Deactivated</option>
          </NativeSelect>
        </div>
      </div>
      <section aria-label="Registered users" className="overflow-hidden rounded-xl border border-border/60 bg-card">
        {error ? <div role="alert" className="p-6 text-sm text-destructive">{error}<Button type="button" variant="link" onClick={() => void fetchUsers()}>Try again</Button></div>
          : loading ? <p role="status" className="p-8 text-sm text-muted-foreground">Loading users...</p>
          : visibleUsers.length === 0 ? <div className="p-10 text-center"><UserRound aria-hidden="true" className="mx-auto mb-3 size-6 text-muted-foreground" /><p className="text-sm font-medium">{users.length ? "No users match these filters" : "No registered users yet"}</p><Button type="button" variant="link" onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); setPage(1); }}>Clear filters</Button></div>
          : <ul className="divide-y divide-border/60">
            {visibleUsers.map(user => <li key={user.id} className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:gap-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <AvatarDisplay avatarUrl={user.avatar_url} avatarSeed={user.avatar_seed} name={user.display_name || user.email} size="md" />
                <div className="min-w-0">
                  <Link href={`/admin/users/${user.id}`} className="block truncate text-sm font-semibold hover:underline">{user.display_name || "Unnamed user"}</Link>
                  <p className="break-all text-xs text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Joined {formatDate(user.created_at)} ? {user.readings_count} readings ? ?{Number(user.total_spent).toFixed(2)} paid</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-normal">{user.role === "admin" ? "Administrator" : "Customer"}</Badge>
                <Badge variant="outline" className={user.account_status === "active" ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300" : "border-amber-500/25 bg-amber-500/5 text-amber-900 dark:text-amber-200"}>{user.account_status}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild><Link href={`/admin/users/${user.id}`}>View profile</Link></Button>
                {user.auth_user_id === currentUser?.id ? <span className="px-2 text-xs text-muted-foreground">Your account</span> : <Button type="button" variant="ghost" size="sm" onClick={() => { setStatusError(null); setPendingUser(user); }} className={user.account_status === "active" ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : "text-primary"}>{user.account_status === "active" ? "Deactivate" : "Reactivate"}</Button>}
              </div>
            </li>)}
          </ul>}
        {!loading && !error && filteredUsers.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-4">
          <p className="text-xs text-muted-foreground">{(currentPage - 1) * 20 + 1}?{Math.min(currentPage * 20, filteredUsers.length)} of {filteredUsers.length} users</p>
          <nav aria-label="User pages" className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span className="text-xs text-muted-foreground">{currentPage} / {pageCount}</span><Button variant="outline" size="sm" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button></nav>
        </div>}
      </section>
      <AlertDialog open={!!pendingUser} onOpenChange={open => { if (!open && !savingStatus) setPendingUser(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>{pendingUser?.account_status === "active" ? "Deactivate this account?" : "Reactivate this account?"}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="mb-3 block font-medium text-foreground">{pendingUser?.display_name || pendingUser?.email}<span className="block break-all text-xs font-normal text-muted-foreground">{pendingUser?.email}</span></span>
            {pendingUser?.account_status === "active" ? "The user will be blocked from signing in and making new bookings. Their profile and booking history will be retained. You can reactivate the account later." : "The user will be able to sign in and book readings again."}
          </AlertDialogDescription>
          {statusError && <p role="alert" className="text-sm text-destructive">{statusError}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={savingStatus}>Cancel</AlertDialogCancel><Button type="button" variant={pendingUser?.account_status === "active" ? "destructive" : "default"} disabled={savingStatus} onClick={() => void confirmStatusChange()}>{savingStatus ? "Saving..." : pendingUser?.account_status === "active" ? "Deactivate account" : "Reactivate account"}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent aria-describedby={undefined} className="block max-h-[calc(100dvh-2rem)] space-y-5 overflow-y-auto rounded-2xl border-[#E5B842]/30 bg-[#FAF8F5] p-6 text-[#0F172A] dark:bg-[#0D1829] dark:text-[#FAF8F5] sm:max-w-md sm:p-8">
          <DialogTitle className="border-b border-[#0F172A]/10 pb-3 pr-8 font-serif text-xl dark:border-white/10">Create New User</DialogTitle>
            {createError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs">
                {createError}
              </div>
            )}

            {createSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs">
                {createSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label htmlFor="users-field-1" className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Full Name
                </label>
                <Input id="users-field-1"
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Ananya Sen"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                />
              </div>

              <div>
                <label htmlFor="users-field-2" className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Email Address
                </label>
                <Input id="users-field-2"
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                />
              </div>

              <div>
                <label htmlFor="users-field-3" className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Assigned Role
                </label>
                <NativeSelect id="users-field-3"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40 cursor-pointer"
                >
                  <option value="customer">Customer (Default)</option>
                  <option value="admin">Administrator</option>
                </NativeSelect>
                {createRole === "admin" && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    ⚠ Warning: Administrators have full operational access to business analytics, orders, and user records.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="users-field-4" className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Password <span className="font-normal text-[#0F172A]/40 dark:text-[#FAF8F5]/65">(Optional — leave blank to auto-generate)</span>
                </label>
                <Input id="users-field-4"
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddModalOpen(false)}
                  disabled={creating}
                  className="rounded-xl text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {creating ? "Creating User…" : "Create User"}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
