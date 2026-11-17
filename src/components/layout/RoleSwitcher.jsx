"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/constants";
import { ShieldCheck, Users, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function RoleSwitcher() {
  const { role, user } = useAuth();

  const roles = [
    {
      id: "ADMIN",
      label: ROLE_LABELS.ADMIN || "Admin",
      desc: ROLE_DESCRIPTIONS.ADMIN,
      icon: ShieldCheck,
      color: "text-indigo-400",
    },
    {
      id: "HR",
      label: ROLE_LABELS.HR || "HR",
      desc: ROLE_DESCRIPTIONS.HR,
      icon: Users,
      color: "text-emerald-400",
    },
    {
      id: "EMPLOYEE",
      label: ROLE_LABELS.EMPLOYEE || "Employee",
      desc: ROLE_DESCRIPTIONS.EMPLOYEE,
      icon: UserCheck,
      color: "text-cyan-400",
    },
  ];

  const activeRoleCanonical = normalizeRole(user?.role || role);
  const currentRoleObj = roles.find((r) => r.id === activeRoleCanonical) || roles[2];
  const CurrentIcon = currentRoleObj.icon;

  return (
    <div
      title={currentRoleObj.desc}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-xs font-medium text-zinc-700 dark:text-zinc-200 cursor-default select-none whitespace-nowrap shrink-0"
    >
      <CurrentIcon className={cn("w-3.5 h-3.5 shrink-0", currentRoleObj.color)} />
      <span className="hidden sm:inline text-zinc-400">Role:</span>
      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
        {currentRoleObj.label}
      </span>
    </div>
  );
}
