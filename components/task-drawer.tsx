"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { CircleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TaskPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TaskStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";
type PriorityValue = "low" | "medium" | "high" | "critical";
type StatusValue = "not_started" | "in_progress" | "blocked" | "done";
type DrawerMode = "create" | "edit";
type TaskActivityActionType = "CREATED" | "FIELD_CHANGED";
type TaskActivityFieldValue =
  | "TITLE"
  | "DESCRIPTION"
  | "ASSIGNEE"
  | "DUE_DATE"
  | "PRIORITY"
  | "STATUS";

type AssigneeOption = {
  id: string;
  label: string;
};

type TaskActivityItem = {
  id: number;
  userName: string;
  actionType: TaskActivityActionType;
  field: TaskActivityFieldValue | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
};

export type TaskDrawerTask = {
  id: number;
  title: string;
  description: string | null;
  assigneeId: number | null;
  assigneeEmail: string | null;
  assigneeFirstName: string | null;
  assigneeLastName: string | null;
  dueDate: string | null;
  priority: TaskPriorityValue;
  status: TaskStatusValue;
  createdAt: string;
};

interface TaskDrawerProps {
  open: boolean;
  mode: DrawerMode;
  projectId: string;
  task: TaskDrawerTask | null;
  onOpenChange: (nextOpen: boolean) => void;
}

const priorityOptions: { value: PriorityValue; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const statusOptions: { value: StatusValue; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

function normalizeTaskTitle(value: string) {
  return value.trim();
}

function toInputPriority(value: TaskPriorityValue): PriorityValue {
  switch (value) {
    case "LOW":
      return "low";
    case "HIGH":
      return "high";
    case "CRITICAL":
      return "critical";
    case "MEDIUM":
    default:
      return "medium";
  }
}

function toInputStatus(value: TaskStatusValue): StatusValue {
  switch (value) {
    case "IN_PROGRESS":
      return "in_progress";
    case "BLOCKED":
      return "blocked";
    case "DONE":
      return "done";
    case "NOT_STARTED":
    default:
      return "not_started";
  }
}

function formatAssigneeLabel(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const fullName = [user.firstName ?? "", user.lastName ?? ""].join(" ").trim();
  if (fullName) {
    return user.email ? `${fullName} (${user.email})` : fullName;
  }

  return user.email?.trim() || "Unknown user";
}

function normalizeDateForInput(value: string | null) {
  if (!value) {
    return "";
  }

  const isoDateMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch?.[1]) {
    return isoDateMatch[1];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatActivityField(field: TaskActivityFieldValue | null) {
  switch (field) {
    case "TITLE":
      return "title";
    case "DESCRIPTION":
      return "description";
    case "ASSIGNEE":
      return "assignee";
    case "DUE_DATE":
      return "due date";
    case "PRIORITY":
      return "priority";
    case "STATUS":
      return "status";
    default:
      return "task";
  }
}

function formatActivityTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeActivity(item: TaskActivityItem) {
  if (item.actionType === "CREATED") {
    return `${item.userName} created task`;
  }

  return `${item.userName} changed ${formatActivityField(item.field)}`;
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => ({}));
    const apiError =
      typeof payload?.error === "string" && payload.error.trim().length > 0
        ? payload.error.trim()
        : null;
    return apiError ?? `Request failed (HTTP ${response.status})`;
  }

  const fallbackText = await response.text().catch(() => "");
  const normalizedFallback = fallbackText.trim();
  const looksLikeHtml =
    normalizedFallback.startsWith("<!DOCTYPE html") || normalizedFallback.startsWith("<html");

  return normalizedFallback.length > 0 && !looksLikeHtml
    ? normalizedFallback
    : `Server error (HTTP ${response.status})`;
}

export function TaskDrawer({ open, mode, projectId, task, onOpenChange }: TaskDrawerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const taskTitleInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("unassigned");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<PriorityValue>("medium");
  const [status, setStatus] = useState<StatusValue>("not_started");
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[] | null>(null);
  const [activeTab, setActiveTab] = useState("comments");
  const [activityItems, setActivityItems] = useState<TaskActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const id = window.requestAnimationFrame(() => {
      taskTitleInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const id = window.requestAnimationFrame(() => {
      setError(null);
      setSaving(false);
      setActiveTab("comments");

      if (mode === "edit" && task) {
        setTitle(task.title);
        setDescription(task.description ?? "");
        setAssigneeId(task.assigneeId ? String(task.assigneeId) : "unassigned");
        setDueDate(normalizeDateForInput(task.dueDate));
        setPriority(toInputPriority(task.priority));
        setStatus(toInputStatus(task.status));
        return;
      }

      setTitle("");
      setDescription("");
      setAssigneeId("unassigned");
      setDueDate("");
      setPriority("medium");
      setStatus("not_started");
      setActivityItems([]);
      setActivityError(null);
    });

    return () => window.cancelAnimationFrame(id);
  }, [mode, open, task]);

  useEffect(() => {
    if (!open || assigneeOptions !== null) {
      return;
    }

    let active = true;

    async function loadAssignees() {
      const response = await fetch("/api/users");
      if (!response.ok) {
        if (active) {
          setAssigneeOptions([]);
        }
        return;
      }

      const payload = await response.json().catch(() => []);
      if (!Array.isArray(payload)) {
        if (active) {
          setAssigneeOptions([]);
        }
        return;
      }

      const options = payload
        .map((entry) => ({
          id: String(entry.id),
          label: formatAssigneeLabel({
            firstName: typeof entry.firstName === "string" ? entry.firstName : null,
            lastName: typeof entry.lastName === "string" ? entry.lastName : null,
            email: typeof entry.email === "string" ? entry.email : null,
          }),
        }))
        .filter((entry) => entry.id && entry.label);

      if (active) {
        setAssigneeOptions(options);
      }
    }

    void loadAssignees();

    return () => {
      active = false;
    };
  }, [assigneeOptions, open]);

  useEffect(() => {
    if (!open || mode !== "edit" || !task) {
      return;
    }

    const taskId = task.id;
    let active = true;

    async function loadActivity() {
      setActivityLoading(true);
      setActivityError(null);
      setActivityItems([]);

      const response = await fetch(`/api/tasks/${taskId}/activity`);
      if (!response.ok) {
        if (active) {
          setActivityError(await readErrorMessage(response));
          setActivityItems([]);
          setActivityLoading(false);
        }
        return;
      }

      const payload = await response.json().catch(() => []);
      if (!Array.isArray(payload)) {
        if (active) {
          setActivityError("Activity response was invalid");
          setActivityItems([]);
          setActivityLoading(false);
        }
        return;
      }

      if (active) {
        const normalized = payload
          .map((entry) => ({
            id: Number(entry.id),
            userName: typeof entry.userName === "string" ? entry.userName : "Unknown user",
            actionType:
              entry.actionType === "CREATED" || entry.actionType === "FIELD_CHANGED"
                ? entry.actionType
                : "FIELD_CHANGED",
            field:
              entry.field === "TITLE" ||
              entry.field === "DESCRIPTION" ||
              entry.field === "ASSIGNEE" ||
              entry.field === "DUE_DATE" ||
              entry.field === "PRIORITY" ||
              entry.field === "STATUS"
                ? entry.field
                : null,
            oldValue: typeof entry.oldValue === "string" ? entry.oldValue : null,
            newValue: typeof entry.newValue === "string" ? entry.newValue : null,
            createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
          }))
          .filter((entry) => Number.isInteger(entry.id) && entry.id > 0);

        setActivityItems(normalized);
        setActivityLoading(false);
      }
    }

    void loadActivity();

    return () => {
      active = false;
    };
  }, [mode, open, task]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedTitle = normalizeTaskTitle(title);
    if (!normalizedTitle) {
      setError("Task title is required");
      return;
    }

    if (mode === "edit" && !task) {
      setError("Task details are unavailable");
      return;
    }

    setSaving(true);

    const endpoint = mode === "create" ? "/api/tasks" : `/api/tasks/${task!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: normalizedTitle,
        description: description.trim(),
        assigneeId: assigneeId === "unassigned" ? null : assigneeId,
        dueDate: dueDate || null,
        priority,
        status,
        projectId,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      setError(await readErrorMessage(response));
      return;
    }

    router.refresh();
    onOpenChange(false);
  }

  function onFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter") {
      return;
    }

    const target = event.target as HTMLElement;
    if (
      target instanceof HTMLTextAreaElement ||
      target.getAttribute("data-slot") === "select-trigger" ||
      !!target.closest("[data-slot='select-content']")
    ) {
      return;
    }

    event.preventDefault();
    formRef.current?.requestSubmit();
  }

  const titleLabel = mode === "create" ? "Create task" : "Task details";
  const descriptionLabel =
    mode === "create"
      ? "Add a task without leaving your current workspace."
      : "Update details while keeping the task list in view.";

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="gap-0 overflow-hidden border-border/80 p-0 shadow-xl data-[vaul-drawer-direction=right]:w-[640px] data-[vaul-drawer-direction=right]:max-w-[95vw]">
        <DrawerHeader className="gap-1 border-b border-border/60 px-5 pb-4 pt-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DrawerTitle className="text-base font-semibold">{titleLabel}</DrawerTitle>
              <DrawerDescription className="text-[11px] text-muted-foreground/80">
                {descriptionLabel}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <X className="size-4" />
                <span className="sr-only">Close task drawer</span>
              </Button>
            </DrawerClose>
          </div>

          <div className="mt-3 space-y-1.5">
            <Label htmlFor="task-title">Task title</Label>
            <Input
              id="task-title"
              ref={taskTitleInputRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Confirm kickoff meeting"
              className="h-9 border-border/70 bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40"
              required
            />
          </div>
        </DrawerHeader>

        <form
          ref={formRef}
          onSubmit={onSubmit}
          onKeyDown={onFormKeyDown}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-4">
            <section className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="task-assignee">Assignee</Label>
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger id="task-assignee" className="h-9 border-border/70 bg-background">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {(assigneeOptions ?? []).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assigneeOptions === null ? (
                    <p className="text-[11px] text-muted-foreground">Loading assignees...</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="task-due-date">Due date</Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="h-9 border-border/70 bg-background shadow-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="task-priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(value) => setPriority(value as PriorityValue)}
                  >
                    <SelectTrigger id="task-priority" className="h-9 border-border/70 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="task-status">Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as StatusValue)}>
                    <SelectTrigger id="task-status" className="h-9 border-border/70 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-1.5">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add details, notes, or next steps"
                rows={5}
                className="min-h-28 resize-y border-border/70 bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </section>

            <section className="space-y-2">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground/85 uppercase">
                Subtasks
              </p>
              <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                Subtasks will appear here.
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground/85 uppercase">
                Attachments
              </p>
              <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                Attachments will appear here.
              </div>
            </section>

            <section className="space-y-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-3">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="comments" className="min-w-24">
                    Comments
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="min-w-24">
                    Activity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="comments" className="mt-0">
                  <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                    Comments are separate from system activity and will appear here.
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-0">
                  {mode !== "edit" || !task ? (
                    <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                      Create the task to start activity history.
                    </div>
                  ) : activityLoading ? (
                    <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                      Loading activity...
                    </div>
                  ) : activityError ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {activityError}
                    </div>
                  ) : activityItems.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                      No activity yet.
                    </div>
                  ) : (
                    <ol className="space-y-2.5">
                      {activityItems.map((item) => (
                        <li key={item.id} className="rounded-md border border-border/70 bg-muted/10 px-3 py-2">
                          <p className="text-sm font-medium text-foreground">{describeActivity(item)}</p>
                          {item.oldValue !== null || item.newValue !== null ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {(item.oldValue ?? "(none)") + " -> " + (item.newValue ?? "(none)")}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatActivityTimestamp(item.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </TabsContent>
              </Tabs>
            </section>

            {error ? (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <CircleAlert className="size-4" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>

          <DrawerFooter className="flex-row justify-end gap-2 border-t border-border/70 bg-muted/5 px-5 py-3.5">
            <Button type="button" variant="outline" className="min-w-[92px]" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="min-w-[124px]">
              {saving ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create task" : "Save changes"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
