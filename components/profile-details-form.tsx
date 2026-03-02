"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileDetailsFormProps {
  initialFirstName: string;
  initialLastName: string;
}

export function ProfileDetailsForm({
  initialFirstName,
  initialLastName,
}: ProfileDetailsFormProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName,
        lastName,
      }),
    });

    setSaving(false);

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error ?? "Unable to update profile");
      return;
    }

    setFirstName(payload.firstName ?? "");
    setLastName(payload.lastName ?? "");
    setSuccess("Profile updated successfully");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="profile-first-name">First name</Label>
        <Input
          id="profile-first-name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          autoComplete="given-name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-last-name">Surname</Label>
        <Input
          id="profile-last-name"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          autoComplete="family-name"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

      <Button type="submit" disabled={saving}>
        {saving ? "Updating..." : "Update profile"}
      </Button>
    </form>
  );
}
