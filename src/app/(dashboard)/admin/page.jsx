"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  TrendingDown,
  CreditCard,
  DollarSign,
  Settings,
  Building2,
  ShieldCheck,
  Plus,
  ExternalLink,
  Cpu,
  Clock,
  Calendar,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole } from "@/lib/constants";
import { reportService } from "@/services/reportService";
import { formatCurrency } from "@/lib/utils";
import { containerStagger, itemFadeUp, scrollViewport } from "@/lib/animationVariants";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmployeeModal } from "@/components/employees/EmployeeModal";
import { WorkforceDistributionChart } from "@/components/charts/WorkforceDistributionChart";
import { WorkforceTenureChart } from "@/components/charts/WorkforceTenureChart";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState(() => reportService.peekCachedMetrics("admin"));
  const [loading, setLoading] = useState(() => !reportService.peekCachedMetrics("admin"));
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      const userRole = normalizeRole(user.role);
      router.replace(userRole === "HR" ? "/hr" : "/employee");
    }
  }, [user, isAdmin, authLoading, router]);

  const loadData = async (force = false) => {
    if (!isAdmin) return;
    try {
      const data = await reportService.getAdminDashboardMetrics(force);
      setMetrics(data);
    } catch (err) {
      console.warn("[AdminDashboard] Error loading metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  if (!authLoading && (!user || !isAdmin)) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const {
    activeHeadcount,
    attritionRate,
    totalMonthlyPayroll,
    averageSalary,
    departmentStats = [],
    tenureStats = {},
    auditLogs = [],
    activePolicySummary = {},
  } = metrics || {};

  const totalHeadcount = metrics?.totalHeadcount || 1;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerStagger}
      className="space-y-6"
    >
      {/* 1. Header Card */}
      <motion.div
        variants={itemFadeUp}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-indigo-950/40 border border-zinc-800 shadow-elevated"
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-glow shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-50">
              Enterprise Admin Portal
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Policy Engine Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-xl">
            Welcome back, {user?.displayName || "Super Admin"}. Live 10-Tab HCM Setup governance, locked payroll disbursement, and immutable audit telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          <Link href="/settings">
            <Button variant="outline" size="sm" icon={Settings}>
              10-Tab HCM Setup
            </Button>
          </Link>

          <Button
            size="sm"
            icon={Plus}
            onClick={() => setIsEmployeeModalOpen(true)}
          >
            Onboard Employee
          </Button>

          <Link href="/payroll">
            <Button variant="secondary" size="sm" icon={CreditCard}>
              Finalize Payroll
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Active Policy & Compliance Governance Strip */}
      <motion.div variants={itemFadeUp}>
        <Card className="border-indigo-500/20 bg-zinc-900/70">
          <CardContent className="py-3.5 px-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-1 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Primary Shift & Grace</span>
                    <span className="font-mono font-semibold text-zinc-200">
                      {activePolicySummary.shiftStart || "09:00"}–{activePolicySummary.shiftEnd || "18:00"} ({activePolicySummary.graceMinutes ?? 15}m)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Biometric Terminals</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      {activePolicySummary.devicesOnline ?? 0}/{activePolicySummary.devicesTotal ?? 0} Online
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Tab 10 Salary Basis</span>
                    <span className="font-mono font-semibold text-zinc-200">
                      {activePolicySummary.salaryMethod || "WorkingDays"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Public Holidays</span>
                    <span className="font-mono font-semibold text-zinc-200">
                      {activePolicySummary.holidaysCount ?? 0} Configured
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Payroll / Att. Lock</span>
                    <span className="font-mono font-semibold text-amber-300">
                      {activePolicySummary.attendanceLockedUpTo || "Unlocked"}
                    </span>
                  </div>
                </div>
              </div>
              <Link href="/settings" className="shrink-0">
                <Button size="sm" variant="ghost" icon={Settings}>
                  Configure Policies
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2. Top KPI Metric Cards */}
      <motion.div
        variants={containerStagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemFadeUp}>
          <StatCard
            title="Total Active Headcount"
            value={activeHeadcount || 0}
            change="+8.3%"
            changeType="positive"
            subtext="Active & Onboarding personnel"
            icon={Users}
          />
        </motion.div>

        <motion.div variants={itemFadeUp}>
          <StatCard
            title="Attrition Rate YTD"
            value={`${attritionRate ?? 0}%`}
            changeType="positive"
            subtext="Calculated from live directory"
            icon={TrendingDown}
          />
        </motion.div>

        <motion.div variants={itemFadeUp}>
          <StatCard
            title="Total Monthly Payroll Cost"
            value={formatCurrency(totalMonthlyPayroll || 0)}
            changeType="neutral"
            subtext={`Tab 10 Basis: ${activePolicySummary.salaryMethod || "WorkingDays"}`}
            icon={CreditCard}
          />
        </motion.div>

        <motion.div variants={itemFadeUp}>
          <StatCard
            title="Average Annual Salary"
            value={formatCurrency(averageSalary || 0)}
            changeType="neutral"
            subtext="Across all company divisions"
            icon={DollarSign}
          />
        </motion.div>
      </motion.div>

      {/* 3. Visual Breakdown Grid */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
        variants={containerStagger}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <motion.div variants={itemFadeUp} className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Department Headcount & Monthly Payroll Allocation</CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Interactive real-time breakdown with animated morphing between Bar and Donut views.
                </p>
              </div>
              <Link
                href="/employees"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 shrink-0"
              >
                View Directory <ExternalLink className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-5 pt-2 flex-1 flex flex-col justify-between">
              <WorkforceDistributionChart
                departmentStats={departmentStats}
                totalHeadcount={totalHeadcount}
              />

              <div className="border-t border-zinc-800/80 pt-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  <span>Division Personnel Detail</span>
                  <span className="text-zinc-500 font-normal font-mono">{departmentStats.length} active teams</span>
                </div>
                <motion.div
                  variants={containerStagger}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                >
                  {departmentStats.map((dept) => {
                    const headcountPercent = Math.round((dept.headcount / totalHeadcount) * 100);
                    return (
                      <motion.div
                        key={dept.name}
                        variants={itemFadeUp}
                        className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/40 transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-200 truncate">{dept.name}</span>
                          <span className="font-mono font-semibold text-emerald-400 text-[11px] shrink-0">
                            {formatCurrency(dept.totalSalary)}/mo
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span>{dept.headcount} {dept.headcount === 1 ? "member" : "members"}</span>
                          <span className="font-mono text-zinc-300 font-semibold">{headcountPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(headcountPercent, 6)}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemFadeUp}>
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex flex-col items-start gap-1">
              <CardTitle>Workforce Tenure Distribution</CardTitle>
              <p className="text-xs text-zinc-400">
                Staff longevity, new hire onboarding, and seniority telemetry.
              </p>
            </CardHeader>
            <CardContent className="space-y-5 flex-1 flex flex-col justify-between">
              <WorkforceTenureChart
                tenureStats={tenureStats}
                totalEmployees={totalHeadcount}
              />

              <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-950/20 text-xs text-indigo-300 space-y-1 mt-auto">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Live HCM Policy Compliance
                </div>
                <p className="text-[11px] text-zinc-400">
                  {activePolicySummary.shiftName || "General Office Shift"} ({activePolicySummary.shiftStart || "09:00"} start, {activePolicySummary.graceMinutes ?? 15}m grace) and leave quotas ({activePolicySummary.annualQuota ?? 14} Annual, {activePolicySummary.sickQuota ?? 8} Sick, {activePolicySummary.casualQuota ?? 10} Casual) are live and synchronized.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* 4. Live Audit Feed Card */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
        variants={itemFadeUp}
      >
        <Card id="audit">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Live System Audit Feed</CardTitle>
              <p className="text-xs text-zinc-400 mt-0.5">
                Immutable governance ledger recording setup changes, payroll locks, approvals, and device syncs.
              </p>
            </div>
            <Badge variant="info">Immutable Ledger</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Actor & Role</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Action & Target Entity</TableHead>
                    <TableHead>Before → After</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-xs text-zinc-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                          <span>{item.actor}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {item.role}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral" size="sm">
                          {item.module || "System"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-zinc-200">{item.action}</div>
                        <div className="text-[11px] text-zinc-400 font-mono truncate max-w-xs">{item.target}</div>
                      </TableCell>
                      <TableCell className="text-[11px] text-zinc-400 font-mono">
                        {item.oldValue || item.newValue
                          ? `${item.oldValue || "—"} → ${item.newValue || "—"}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "success"
                              ? "success"
                              : item.status === "warning"
                              ? "warning"
                              : item.status === "info"
                              ? "info"
                              : "neutral"
                          }
                          size="sm"
                          dot
                        >
                          {item.status === "success" ? "Completed" : "Logged"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-zinc-400 font-mono">
                        {item.timestamp}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSaved={() => loadData(true)}
      />
    </motion.div>
  );
}
