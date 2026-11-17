"use client";

import React, { useState } from "react";
import { Shield, Mail, Building2, Check, BadgeCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { ALL_AVATAR_PRESETS } from "@/lib/avatarSystem";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, normalizeRole } from "@/lib/constants";

export default function ProfilePage() {
  const { user } = useAuth();
  const { notifySuccess } = useNotification();
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || null);

  const canonicalRole = normalizeRole(user?.role);

  const handleSelectAvatar = (preset) => {
    setSelectedAvatar(preset.dataUri);
    try {
      const raw = localStorage.getItem("hcm_lite_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.avatar = preset.dataUri;
        parsed.photoURL = preset.dataUri;
        localStorage.setItem("hcm_lite_session", JSON.stringify(parsed));
      }
    } catch {}
    notifySuccess("Profile Avatar Updated", `Switched portrait to ${preset.label}.`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          My Account & Role Scope
        </h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          View your authenticated HCM Lite identity, department assignment, and portrait preset.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-6">
          <Avatar
            src={selectedAvatar || user?.avatar}
            name={user?.displayName || "HCM User"}
            email={user?.email}
            id={user?.uid}
            size="xl"
          />
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-zinc-100">{user?.displayName}</h2>
              <Badge variant="info" size="sm">
                {ROLE_LABELS[canonicalRole]}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">{ROLE_DESCRIPTIONS[canonicalRole]}</p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-300">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                {user?.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                Department: {user?.department || "Executive"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-indigo-400" />
                ID: {user?.employeeId || "EMP-001"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                {user?.jobTitle || ROLE_LABELS[canonicalRole]}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Vector Portrait Presets</CardTitle>
            <CardDescription>Choose an illustrated avatar for your HCM Lite employee profile</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ALL_AVATAR_PRESETS.map((preset) => {
              const isSelected = (selectedAvatar || user?.avatar) === preset.dataUri;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectAvatar(preset)}
                  className={`relative rounded-xl border p-3 flex flex-col items-center gap-2 transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <img
                    src={preset.dataUri}
                    alt={preset.label}
                    className="w-14 h-14 rounded-full"
                  />
                  <span className="text-[11px] font-medium text-zinc-300 text-center">
                    {preset.label.split(" (")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}