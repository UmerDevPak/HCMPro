import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = "USD", decimals = 2) {
  if (amount === null || amount === undefined || isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(amount));
}

export function formatCompactCurrency(amount, currency = "USD") {
  if (amount === null || amount === undefined || isNaN(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(Number(num)));
}

export function formatPercent(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return "0.00%";
  return `${Number(val).toFixed(decimals)}%`;
}

export function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatTime(dateInput = new Date()) {
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput || "—");
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getInitials(name = "") {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function generateId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

export function exportToCSV(filename, rows, headers) {
  if (!rows || !rows.length) return;
  const headerKeys = Object.keys(headers);
  const headerLabels = Object.values(headers);

  const csvContent = [
    headerLabels.join(","),
    ...rows.map((row) =>
      headerKeys
        .map((key) => {
          let val = row[key] ?? "";
          if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
