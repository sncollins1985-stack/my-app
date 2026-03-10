"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, UserRound, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  notifyProjectCreated,
  OPEN_CREATE_PROJECT_DIALOG_EVENT,
} from "@/components/project-create-events";

function normalizeProjectName(value: string) {
  return value.trim();
}

interface ProjectCreateDialogProps {
  currentUserEmail: string;
}

export function ProjectCreateDialog({ currentUserEmail }: ProjectCreateDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const openDialog = () => setOpen(true);
    window.addEventListener(OPEN_CREATE_PROJECT_DIALOG_EVENT, openDialog);

    return () => {
      window.removeEventListener(OPEN_CREATE_PROJECT_DIALOG_EVENT, openDialog);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const id = window.requestAnimationFrame(() => {
      projectNameInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(id);
  }, [open]);

  function resetForm() {
    setName("");
    setDescription("");
    setError(null);
  }

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedName = normalizeProjectName(name);
    if (!normalizedName) {
      setError("Project name is required");
      return;
    }

    setSaving(true);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: normalizedName,
        description: description.trimEnd(),
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload?.error ?? "Failed to create project");
      return;
    }

    onOpenChange(false);
    notifyProjectCreated();
    router.refresh();
  }

  function onFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    formRef.current?.requestSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden rounded-xl border-border/80 p-0 shadow-xl sm:max-w-[30rem]"
        onEscapeKeyDown={() => onOpenChange(false)}
        showCloseButton={false}
      >
        <DialogHeader className="flex-row items-center justify-between border-b px-5 py-4">
          <DialogTitle className="text-base font-semibold">Create project</DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={onSubmit}
          onKeyDown={onFormKeyDown}
          className="flex flex-1 flex-col"
        >
          <div className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="global-project-name">Project name</Label>
              <Input
                id="global-project-name"
                ref={projectNameInputRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Website redesign"
                className="bg-muted/30 shadow-none focus-visible:ring-2 focus-visible:ring-ring/40"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="global-project-description">Description (optional)</Label>
              <Textarea
                id="global-project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add context for your team"
                rows={4}
                className="min-h-24 resize-none bg-muted/20 shadow-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Owner</Label>
              <div className="flex h-9 items-center gap-2 rounded-md border border-border/70 bg-muted/35 px-3 text-sm text-foreground">
                <UserRound className="size-4 text-muted-foreground" />
                <span className="truncate">{currentUserEmail}</span>
              </div>
            </div>

            {error ? (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <CircleAlert className="size-4" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>

          <DialogFooter className="flex-row justify-end gap-2 border-t bg-muted/15 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              className="min-w-[96px]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="min-w-[132px]">
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
