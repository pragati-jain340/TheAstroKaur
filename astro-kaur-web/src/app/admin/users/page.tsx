"use client";
import { NativeSelect } from "@/components/ui/native-select";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
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
}

type RoleFilter = "all" | "customer" | "admin";
type StatusFilter = "all" | "active" | "suspended" | "deactivated";

export default function AdminUsersPage() {
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
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.users) {
        setUsers(json.users);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ─── Header ─── */}
      <div className="border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase hover:underline">
              ADMIN
            </Link>
            <span className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40">/</span>
            <span className="text-[10px] font-bold tracking-widest text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
              USERS
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] tracking-tight uppercase">
            USER MANAGEMENT
          </h1>
          <p className="mt-1 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
            Manage customer accounts, administrators, and account statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="rounded-full px-5 py-2.5 text-xs font-semibold"
          >
            <span>+ Add User</span>
          </Button>
        </div>
      </div>

      {/* ─── Filters & Search ─── */}
      <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs text-[#0F172A] dark:text-[#FAF8F5] placeholder:text-[#0F172A]/40 dark:placeholder:text-[#FAF8F5]/40 focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
            />
            <span className="absolute left-3.5 top-3 text-[#0F172A]/40 dark:text-[#FAF8F5]/40 text-xs">
              🔍
            </span>
          </div>

          {/* Role Filter Pills */}
          <div className="inline-flex gap-1 p-1 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 self-start md:self-auto">
            {(
              [
                { key: "all", label: "All Roles" },
                { key: "customer", label: "Customers" },
                { key: "admin", label: "Admins" },
              ] as { key: RoleFilter; label: string }[]
            ).map((rf) => (
              <Button
                key={rf.key}
                size="sm"
                variant={roleFilter === rf.key ? "default" : "ghost"}
                onClick={() => setRoleFilter(rf.key)}
                className="h-7 text-xs font-medium"
              >
                {rf.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
          {(
            [
              { key: "all", label: "All Statuses" },
              { key: "active", label: "Active" },
              { key: "suspended", label: "Suspended" },
              { key: "deactivated", label: "Deactivated" },
            ] as { key: StatusFilter; label: string }[]
          ).map((sf) => (
            <Button
              key={sf.key}
              size="sm"
              variant={statusFilter === sf.key ? "default" : "outline"}
              onClick={() => setStatusFilter(sf.key)}
              className="h-7 text-xs capitalize"
            >
              {sf.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ─── Users Table ─── */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
          Loading user records…
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-dashed border-[#E5B842]/30 rounded-2xl p-12 text-center space-y-3">
          <p className="text-2xl text-[#E5B842]">✦</p>
          <p className="font-serif text-base text-[#0F172A] dark:text-[#FAF8F5]">
            No users match the selected filters
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setSearch("");
              setRoleFilter("all");
              setStatusFilter("all");
            }}
            className="text-xs font-semibold text-[#E5B842] underline"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-xs">
              <TableHeader className="bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 text-[10px] font-bold uppercase tracking-wider text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
                <TableRow>
                  <TableHead className="py-3.5 px-5">Name & Email</TableHead>
                  <TableHead className="py-3.5 px-4">Role</TableHead>
                  <TableHead className="py-3.5 px-4">Status</TableHead>
                  <TableHead className="py-3.5 px-4 text-center">Readings</TableHead>
                  <TableHead className="py-3.5 px-4">Total Paid</TableHead>
                  <TableHead className="py-3.5 px-4">Joined Date</TableHead>
                  <TableHead className="py-3.5 px-5 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#0F172A]/6 dark:divide-[#FAF8F5]/6">
                {filteredUsers.map((u) => {
                  const isSuspended = u.account_status === "suspended";
                  const isDeactivated = u.account_status === "deactivated";

                  return (
                    <TableRow
                      key={u.id}
                      className="hover:bg-[#E5B842]/5 transition-colors group"
                    >
                      {/* Name & Email */}
                      <TableCell className="py-4 px-5">
                        <div className="font-semibold text-xs text-[#0F172A] dark:text-[#FAF8F5]">
                          {u.display_name || "—"}
                        </div>
                        <div className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
                          {u.email}
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell className="py-4 px-4">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin" ? "ADMIN" : "Customer"}
                        </Badge>
                      </TableCell>

                      {/* Account Status */}
                      <TableCell className="py-4 px-4">
                        <Badge
                          variant={isDeactivated ? "destructive" : isSuspended ? "secondary" : "default"}
                          className={
                            isDeactivated
                              ? ""
                              : isSuspended
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent"
                              : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-transparent"
                          }
                        >
                          {u.account_status || "active"}
                        </Badge>
                      </TableCell>

                      {/* Readings Count */}
                      <TableCell className="py-4 px-4 text-center font-medium text-xs text-[#0F172A] dark:text-[#FAF8F5]">
                        {u.readings_count}
                      </TableCell>

                      {/* Total Paid */}
                      <TableCell className="py-4 px-4 font-semibold text-xs text-[#0F172A] dark:text-[#FAF8F5]">
                        {u.total_spent > 0 ? `€${u.total_spent.toFixed(2)}` : "€0.00"}
                      </TableCell>

                      {/* Joined Date */}
                      <TableCell className="py-4 px-4 text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
                        {formatDate(u.created_at)}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="py-4 px-5 text-right">
                        <Button asChild variant="outline" size="sm" className="border-[#E5B842]/40 hover:bg-[#E5B842] hover:text-[#0F172A]">
                          <Link href={`/admin/users/${u.id}`}>
                            View User →
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ─── ADD USER DRAWER / MODAL ─── */}
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
                  Password <span className="font-normal text-[#0F172A]/40 dark:text-[#FAF8F5]/40">(Optional — leave blank to auto-generate)</span>
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
