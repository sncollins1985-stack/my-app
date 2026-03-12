"use client";

import { FormEvent, KeyboardEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CircleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { DEFAULT_DOCUMENT_MAX_UPLOAD_BYTES } from "@/lib/documents/constants";
import { parseTaskAttachmentActivityPayload } from "@/lib/task-attachment-activity";
import { AttachmentDropzone } from "@/components/attachment-dropzone";
import {
  AttachmentViewerModal,
  type PersistedAttachmentViewerItem,
} from "@/components/attachment-viewer-modal";
import {
  AttachmentGrid,
  isImageAttachmentFile,
  TaskAttachmentRow,
  type AttachmentRowAction,
} from "@/components/task-attachment-row";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

type TaskCommentItem = {
  id: number;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type TaskAttachmentItem = {
  id: string;
  name: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedByUserId: string;
  uploadedByName: string;
  uploadedByEmail: string;
  createdAt: string;
};

type CreateSubmissionNotice = {
  message: string;
};

export type TaskDrawerTask = {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
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

type TaskMutationPayload = {
  title: string;
  description: string;
  assigneeId: string | null;
  dueDate: string | null;
  priority: PriorityValue;
  status: StatusValue;
  projectId: string;
};

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

const TASK_ATTACHMENT_MAX_BYTES = DEFAULT_DOCUMENT_MAX_UPLOAD_BYTES;
const TASK_ATTACHMENT_MAX_LABEL = "25 MB";

function normalizeTaskTitle(value: string) {
  return value.trim();
}

function buildTaskMutationPayload(params: {
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  priority: PriorityValue;
  status: StatusValue;
  projectId: string;
}): TaskMutationPayload {
  return {
    title: normalizeTaskTitle(params.title),
    description: params.description.trim(),
    assigneeId: params.assigneeId === "unassigned" ? null : params.assigneeId,
    dueDate: params.dueDate.trim() || null,
    priority: params.priority,
    status: params.status,
    projectId: params.projectId,
  };
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

function formatTaskAssigneeFallback(task: TaskDrawerTask) {
  const fullName = [task.assigneeFirstName ?? "", task.assigneeLastName ?? ""].join(" ").trim();
  if (fullName) {
    return task.assigneeEmail ? `${fullName} (${task.assigneeEmail})` : fullName;
  }

  return task.assigneeEmail?.trim() || "Assigned";
}

function normalizeDateForInput(value: string | null) {
  if (!value) {
    return "";
  }

  const slashDateMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDateMatch) {
    const [, dayPart, monthPart, yearPart] = slashDateMatch;
    return `${dayPart.padStart(2, "0")}/${monthPart.padStart(2, "0")}/${yearPart}`;
  }

  const isoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDateMatch) {
    const [, yearPart, monthPart, dayPart] = isoDateMatch;
    return `${dayPart}/${monthPart}/${yearPart}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatDateForInput(date);
}

function parseDateInputValue(value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const slashMatch = normalizedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, dayPart, monthPart, yearPart] = slashMatch;
    const year = Number(yearPart);
    const month = Number(monthPart);
    const day = Number(dayPart);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    ) {
      return date;
    }

    return null;
  }

  const isoMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoMatch) {
    return null;
  }

  const year = Number(isoMatch[1]);
  const month = Number(isoMatch[2]);
  const day = Number(isoMatch[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateForInput(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
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

function resolveCreatedTaskId(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    uuid?: unknown;
    id?: unknown;
  };

  if (typeof candidate.uuid === "string" && candidate.uuid.trim().length > 0) {
    return candidate.uuid.trim();
  }

  if (typeof candidate.id === "number" && Number.isInteger(candidate.id) && candidate.id > 0) {
    return String(candidate.id);
  }

  if (typeof candidate.id === "string" && candidate.id.trim().length > 0) {
    return candidate.id.trim();
  }

  return null;
}

function buildQueuedFileKey(file: File) {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

function validateAttachmentFiles(files: File[]) {
  const validFiles: File[] = [];
  const validationErrors: string[] = [];

  for (const file of files) {
    if (file.size <= 0) {
      validationErrors.push(`${file.name || "File"} is empty`);
      continue;
    }

    if (file.size > TASK_ATTACHMENT_MAX_BYTES) {
      validationErrors.push(`${file.name || "File"} exceeds ${TASK_ATTACHMENT_MAX_LABEL}`);
      continue;
    }

    validFiles.push(file);
  }

  return {
    validFiles,
    validationErrors,
  };
}

function describeActivity(item: TaskActivityItem) {
  if (item.actionType === "CREATED") {
    return `${item.userName} created task`;
  }

  return `${item.userName} changed ${formatActivityField(item.field)}`;
}

function resolveAttachmentActivity(item: TaskActivityItem) {
  if (item.actionType !== "FIELD_CHANGED" || item.field !== null) {
    return null;
  }

  return parseTaskAttachmentActivityPayload(item.newValue);
}

function renderActivityPrimary(item: TaskActivityItem): ReactNode {
  const attachmentActivity = resolveAttachmentActivity(item);
  if (!attachmentActivity) {
    return describeActivity(item);
  }

  if (attachmentActivity.kind === "ATTACHMENT_UPLOADED") {
    return (
      <>
        {item.userName} uploaded{" "}
        <a
          href={`/api/documents/${encodeURIComponent(attachmentActivity.documentId)}/download`}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-muted-foreground/50 underline-offset-2 hover:text-foreground"
        >
          {attachmentActivity.filename}
        </a>
      </>
    );
  }

  return `${item.userName} deleted ${attachmentActivity.filename}`;
}

function renderActivitySecondary(item: TaskActivityItem) {
  const attachmentActivity = resolveAttachmentActivity(item);
  if (attachmentActivity) {
    return null;
  }

  if (item.oldValue === null && item.newValue === null) {
    return null;
  }

  return (item.oldValue ?? "(none)") + " -> " + (item.newValue ?? "(none)");
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
  const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("comments");
  const [activityItems, setActivityItems] = useState<TaskActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentItems, setCommentItems] = useState<TaskCommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachmentItem[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);
  const [existingAttachmentsError, setExistingAttachmentsError] = useState<string | null>(null);
  const [createAttachmentsError, setCreateAttachmentsError] = useState<string | null>(null);
  const [createSubmissionNotice, setCreateSubmissionNotice] = useState<CreateSubmissionNotice | null>(null);
  const [createdTaskIdDuringSubmit, setCreatedTaskIdDuringSubmit] = useState<string | null>(null);
  const [queuedFilesUploading, setQueuedFilesUploading] = useState(false);
  const [existingAttachmentsUploading, setExistingAttachmentsUploading] = useState(false);
  const [attachmentDeletingId, setAttachmentDeletingId] = useState<string | null>(null);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [activeViewerAttachmentId, setActiveViewerAttachmentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedPayload, setLastSavedPayload] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const lastAttemptedPayloadRef = useRef<string | null>(null);
  const viewerOpenedFromAttachmentIdRef = useRef<string | null>(null);
  const resolvedAssigneeOptions = useMemo(() => {
    const options = [...(assigneeOptions ?? [])];

    if (mode === "edit" && task?.assigneeId) {
      const taskAssigneeId = task.assigneeId;
      const alreadyPresent = options.some((option) => option.id === taskAssigneeId);
      if (!alreadyPresent) {
        options.unshift({
          id: taskAssigneeId,
          label: formatTaskAssigneeFallback(task),
        });
      }
    }

    return options;
  }, [assigneeOptions, mode, task]);
  const normalizedCommentBody = commentBody.trim();

  useEffect(() => {
    if (!open || mode !== "create") {
      return;
    }

    const id = window.requestAnimationFrame(() => {
      taskTitleInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(id);
  }, [mode, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const id = window.requestAnimationFrame(() => {
      setError(null);
      setSaving(false);
      setCommentSaving(false);
      setQueuedFilesUploading(false);
      setExistingAttachmentsUploading(false);
      setAttachmentDeletingId(null);
      setActiveTab("comments");
      setAutoSaveEnabled(false);
      setCommentsError(null);
      setExistingAttachmentsError(null);
      setCreateAttachmentsError(null);
      setCreateSubmissionNotice(null);
      setCreatedTaskIdDuringSubmit(null);
      setAttachments([]);
      setAttachmentsLoading(false);
      setAttachmentsLoaded(false);
      setQueuedFiles([]);
      setActiveViewerAttachmentId(null);
      viewerOpenedFromAttachmentIdRef.current = null;

      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      lastAttemptedPayloadRef.current = null;

      if (mode === "edit" && task) {
        const initialDueDate = normalizeDateForInput(task.dueDate);
        const initialPayload = buildTaskMutationPayload({
          title: task.title,
          description: task.description ?? "",
          assigneeId: task.assigneeId ?? "unassigned",
          dueDate: initialDueDate,
          priority: toInputPriority(task.priority),
          status: toInputStatus(task.status),
          projectId,
        });

        setTitle(task.title);
        setDescription(task.description ?? "");
        setAssigneeId(task.assigneeId ?? "unassigned");
        setDueDate(initialDueDate);
        setPriority(toInputPriority(task.priority));
        setStatus(toInputStatus(task.status));
        setCommentBody("");
        setCommentItems([]);
        setCommentsLoading(false);
        setCommentsLoaded(false);
        setLastSavedPayload(JSON.stringify(initialPayload));
        setAutoSaveEnabled(true);
        return;
      }

      setTitle("");
      setDescription("");
      setAssigneeId("unassigned");
      setDueDate("");
      setPriority("medium");
      setStatus("not_started");
      setCommentBody("");
      setCommentItems([]);
      setCommentsLoading(false);
      setCommentsLoaded(false);
      setActivityItems([]);
      setActivityError(null);
      setLastSavedPayload(null);
      lastAttemptedPayloadRef.current = null;
    });

    return () => window.cancelAnimationFrame(id);
  }, [mode, open, projectId, task]);

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
          id:
            typeof entry.uuid === "string" && entry.uuid.trim().length > 0
              ? entry.uuid
              : String(entry.id),
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

  const queuedImagePreviewUrls = useMemo(() => {
    const generatedPreviewUrls: Record<string, string> = {};
    for (const file of queuedFiles) {
      if (!isImageAttachmentFile(file.name, file.type)) {
        continue;
      }

      generatedPreviewUrls[buildQueuedFileKey(file)] = URL.createObjectURL(file);
    }

    return generatedPreviewUrls;
  }, [queuedFiles]);

  useEffect(() => {
    return () => {
      Object.values(queuedImagePreviewUrls).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [queuedImagePreviewUrls]);

  const activeViewerAttachment = useMemo<PersistedAttachmentViewerItem | null>(() => {
    if (!activeViewerAttachmentId) {
      return null;
    }

    return attachments.find((attachment) => attachment.id === activeViewerAttachmentId) ?? null;
  }, [activeViewerAttachmentId, attachments]);

  const activeViewerInlineUrl = activeViewerAttachment
    ? buildAttachmentInlinePreviewUrl(activeViewerAttachment.id)
    : null;

  const loadTaskActivity = useCallback(
    async (taskId: string, options?: { background?: boolean }) => {
      const background = options?.background ?? false;

      if (!background) {
        setActivityLoading(true);
      }
      setActivityError(null);

      const response = await fetch(`/api/tasks/${taskId}/activity`);
      if (!response.ok) {
        setActivityError(await readErrorMessage(response));
        setActivityLoading(false);
        return;
      }

      const payload = await response.json().catch(() => []);
      if (!Array.isArray(payload)) {
        setActivityError("Activity response was invalid");
        setActivityLoading(false);
        return;
      }

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
    },
    []
  );

  const loadTaskComments = useCallback(
    async (taskId: string, options?: { background?: boolean }) => {
      const background = options?.background ?? false;

      if (!background) {
        setCommentsLoading(true);
      }
      setCommentsError(null);

      const response = await fetch(`/api/tasks/${taskId}/comments`);
      if (!response.ok) {
        setCommentsError(await readErrorMessage(response));
        setCommentsLoading(false);
        return;
      }

      const payload = await response.json().catch(() => []);
      if (!Array.isArray(payload)) {
        setCommentsError("Comments response was invalid");
        setCommentsLoading(false);
        return;
      }

      const normalized = payload
        .map((entry) => ({
          id: Number(entry.id),
          authorName: typeof entry.authorName === "string" ? entry.authorName : "Unknown user",
          body: typeof entry.body === "string" ? entry.body : "",
          createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
          updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : "",
        }))
        .filter((entry) => Number.isInteger(entry.id) && entry.id > 0 && entry.body.trim().length > 0);

      setCommentItems(normalized);
      setCommentsLoaded(true);
      setCommentsLoading(false);
    },
    []
  );

  const loadTaskAttachments = useCallback(
    async (taskId: string, options?: { background?: boolean }) => {
      const background = options?.background ?? false;

      if (!background) {
        setAttachmentsLoading(true);
      }
      setExistingAttachmentsError(null);

      const response = await fetch(`/api/tasks/${taskId}/attachments`);
      if (!response.ok) {
        setExistingAttachmentsError(await readErrorMessage(response));
        setAttachmentsLoading(false);
        return;
      }

      const payload = await response.json().catch(() => []);
      if (!Array.isArray(payload)) {
        setExistingAttachmentsError("Attachments response was invalid");
        setAttachmentsLoading(false);
        return;
      }

      const normalized = payload
        .map((entry) => ({
          id: typeof entry.id === "string" ? entry.id : "",
          name: typeof entry.name === "string" ? entry.name : "",
          originalFilename: typeof entry.originalFilename === "string" ? entry.originalFilename : "",
          mimeType: typeof entry.mimeType === "string" ? entry.mimeType : "",
          fileSizeBytes: Number(entry.fileSizeBytes),
          uploadedByUserId: typeof entry.uploadedByUserId === "string" ? entry.uploadedByUserId : "",
          uploadedByName: typeof entry.uploadedByName === "string" ? entry.uploadedByName : "Unknown user",
          uploadedByEmail: typeof entry.uploadedByEmail === "string" ? entry.uploadedByEmail : "",
          createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
        }))
        .filter(
          (entry) =>
            entry.id.length > 0 &&
            entry.originalFilename.length > 0 &&
            Number.isFinite(entry.fileSizeBytes) &&
            entry.fileSizeBytes >= 0
        );

      setAttachments(normalized);
      setAttachmentsLoaded(true);
      setAttachmentsLoading(false);
    },
    []
  );

  useEffect(() => {
    if (!open || mode !== "edit" || !task) {
      return;
    }

    const id = window.requestAnimationFrame(() => {
      void loadTaskActivity(task.id);
    });

    return () => window.cancelAnimationFrame(id);
  }, [loadTaskActivity, mode, open, task]);

  useEffect(() => {
    if (!open || mode !== "edit" || !task || activeTab !== "comments" || commentsLoaded) {
      return;
    }

    const id = window.requestAnimationFrame(() => {
      void loadTaskComments(task.id);
    });

    return () => window.cancelAnimationFrame(id);
  }, [activeTab, commentsLoaded, loadTaskComments, mode, open, task]);

  useEffect(() => {
    if (!open || mode !== "edit" || !task || attachmentsLoaded) {
      return;
    }

    const id = window.requestAnimationFrame(() => {
      void loadTaskAttachments(task.id);
    });

    return () => window.cancelAnimationFrame(id);
  }, [attachmentsLoaded, loadTaskAttachments, mode, open, task]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open || mode !== "edit" || !task || !autoSaveEnabled) {
      return;
    }

    const payload = buildTaskMutationPayload({
      title,
      description,
      assigneeId,
      dueDate,
      priority,
      status,
      projectId,
    });

    if (!payload.title) {
      return;
    }

    if (payload.dueDate && !parseDateInputValue(payload.dueDate)) {
      return;
    }

    const serializedPayload = JSON.stringify(payload);
    if (
      serializedPayload === lastSavedPayload ||
      serializedPayload === lastAttemptedPayloadRef.current ||
      saving
    ) {
      return;
    }

    if (autoSaveTimeoutRef.current !== null) {
      window.clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    autoSaveTimeoutRef.current = window.setTimeout(() => {
      autoSaveTimeoutRef.current = null;

      void (async () => {
        setSaving(true);
        lastAttemptedPayloadRef.current = serializedPayload;

        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        setSaving(false);

        if (!response.ok) {
          setError(await readErrorMessage(response));
          return;
        }

        setError(null);
        setLastSavedPayload(serializedPayload);
        lastAttemptedPayloadRef.current = null;
        void loadTaskActivity(task.id, { background: true });
        router.refresh();
      })();
    }, 700);

    return () => {
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [
    assigneeId,
    autoSaveEnabled,
    description,
    dueDate,
    lastSavedPayload,
    loadTaskActivity,
    mode,
    open,
    priority,
    projectId,
    router,
    saving,
    status,
    task,
    title,
  ]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreateSubmissionNotice(null);
    setCreateAttachmentsError(null);

    if (mode !== "create") {
      return;
    }

    if (createdTaskIdDuringSubmit) {
      setError("This task has already been created. Close the drawer and open the task to continue.");
      return;
    }

    const normalizedTitle = normalizeTaskTitle(title);
    if (!normalizedTitle) {
      setError("Task title is required");
      return;
    }

    if (dueDate && !parseDateInputValue(dueDate)) {
      setError("Due date must use DD/MM/YYYY");
      return;
    }

    const pendingValidation = validateAttachmentFiles(queuedFiles);
    if (pendingValidation.validationErrors.length > 0) {
      setCreateAttachmentsError(pendingValidation.validationErrors[0]);
      return;
    }

    setSaving(true);

    const response = await fetch("/api/tasks", {
      method: "POST",
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

    if (!response.ok) {
      setSaving(false);
      setError(await readErrorMessage(response));
      return;
    }

    const createdTaskPayload = await response.json().catch(() => null);
    const createdTaskId = resolveCreatedTaskId(createdTaskPayload);
    router.refresh();

    if (!createdTaskId) {
      setSaving(false);
      setQueuedFiles([]);
      setCreatedTaskIdDuringSubmit("created");
      setCreateSubmissionNotice({
        message: "Task created, but some attachments could not be uploaded.",
      });
      return;
    }

    const failedUploads: File[] = [];
    if (queuedFiles.length > 0) {
      setQueuedFilesUploading(true);

      for (const file of queuedFiles) {
        const uploadError = await uploadTaskAttachment(createdTaskId, file);
        if (uploadError) {
          failedUploads.push(file);
        }
      }

      setQueuedFilesUploading(false);
      setQueuedFiles([]);
    }

    setSaving(false);
    if (failedUploads.length > 0) {
      setCreatedTaskIdDuringSubmit(createdTaskId);
      setCreateSubmissionNotice({
        message: "Task created, but some attachments could not be uploaded.",
      });
      return;
    }

    onOpenChange(false);
  }

  async function onCommentSubmit() {
    setCommentsError(null);

    if (mode !== "edit" || !task) {
      setCommentsError("Task details are unavailable");
      return;
    }

    const normalizedBody = commentBody.trim();
    if (!normalizedBody) {
      return;
    }

    setCommentSaving(true);

    const response = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: normalizedBody,
      }),
    });

    setCommentSaving(false);

    if (!response.ok) {
      setCommentsError(await readErrorMessage(response));
      return;
    }

    const payload = await response.json().catch(() => null);
    if (!payload || !Number.isInteger(Number(payload.id)) || Number(payload.id) <= 0) {
      setCommentsError("Comment response was invalid");
      return;
    }

    const createdComment: TaskCommentItem = {
      id: Number(payload.id),
      authorName: typeof payload.authorName === "string" ? payload.authorName : "Unknown user",
      body: typeof payload.body === "string" ? payload.body : normalizedBody,
      createdAt: typeof payload.createdAt === "string" ? payload.createdAt : new Date().toISOString(),
      updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString(),
    };

    setCommentItems((current) => [...current, createdComment]);
    setCommentBody("");
    void loadTaskComments(task.id, { background: true });
  }

  async function uploadTaskAttachment(taskId: string, file: File) {
    const payload = new FormData();
    payload.append("file", file);

    const response = await fetch(`/api/tasks/${taskId}/attachments`, {
      method: "POST",
      body: payload,
    });

    if (response.ok) {
      return null;
    }

    return await readErrorMessage(response);
  }

  function onQueueAttachmentAdd(selectedFiles: File[]) {
    setCreateAttachmentsError(null);

    if (createdTaskIdDuringSubmit !== null) {
      return;
    }

    if (selectedFiles.length === 0) {
      setCreateAttachmentsError("Select a file to add");
      return;
    }

    const { validFiles, validationErrors } = validateAttachmentFiles(selectedFiles);
    if (validationErrors.length > 0) {
      setCreateAttachmentsError(validationErrors[0]);
    }

    if (validFiles.length > 0) {
      setQueuedFiles((current) => {
        const existingKeys = new Set(current.map((file) => buildQueuedFileKey(file)));
        const filesToAdd = validFiles.filter((file) => !existingKeys.has(buildQueuedFileKey(file)));
        return [...current, ...filesToAdd];
      });
    }
  }

  function removePendingCreateAttachment(indexToRemove: number) {
    setCreateAttachmentsError(null);
    setQueuedFiles((current) =>
      current.filter((_, index) => index !== indexToRemove)
    );
  }

  async function onAttachmentUpload(selectedFiles: File[]) {
    setExistingAttachmentsError(null);

    if (mode !== "edit" || !task) {
      setExistingAttachmentsError("Task details are unavailable");
      return;
    }

    if (selectedFiles.length === 0) {
      setExistingAttachmentsError("Select a file to upload");
      return;
    }

    const { validFiles, validationErrors } = validateAttachmentFiles(selectedFiles);
    if (validationErrors.length > 0) {
      setExistingAttachmentsError(validationErrors[0]);
      return;
    }

    setExistingAttachmentsUploading(true);
    const failedFiles: string[] = [];

    for (const file of validFiles) {
      const uploadError = await uploadTaskAttachment(task.id, file);
      if (uploadError) {
        failedFiles.push(file.name);
      }
    }

    setExistingAttachmentsUploading(false);

    if (failedFiles.length > 0) {
      setExistingAttachmentsError(
        failedFiles.length === 1
          ? `Failed to upload ${failedFiles[0]}`
          : `Failed to upload ${failedFiles.length} files`
      );
    }

    void loadTaskAttachments(task.id, { background: true });
    void loadTaskActivity(task.id, { background: true });
    router.refresh();
  }

  async function onAttachmentDelete(documentId: string) {
    setExistingAttachmentsError(null);

    if (mode !== "edit" || !task) {
      setExistingAttachmentsError("Task details are unavailable");
      return;
    }

    setAttachmentDeletingId(documentId);

    const response = await fetch(`/api/documents/${documentId}`, {
      method: "DELETE",
    });

    setAttachmentDeletingId(null);

    if (!response.ok) {
      setExistingAttachmentsError(await readErrorMessage(response));
      return;
    }

    setAttachments((current) => current.filter((attachment) => attachment.id !== documentId));
    void loadTaskAttachments(task.id, { background: true });
    void loadTaskActivity(task.id, { background: true });
    if (activeViewerAttachmentId === documentId) {
      closeAttachmentViewer();
    }
    router.refresh();
  }

  function buildAttachmentDownloadUrl(documentId: string) {
    return `/api/documents/${encodeURIComponent(documentId)}/download`;
  }

  function buildAttachmentInlinePreviewUrl(documentId: string) {
    return `${buildAttachmentDownloadUrl(documentId)}?disposition=inline`;
  }

  function openAttachmentViewer(documentId: string) {
    viewerOpenedFromAttachmentIdRef.current = documentId;
    setActiveViewerAttachmentId(documentId);
  }

  function closeAttachmentViewer() {
    const openerId = viewerOpenedFromAttachmentIdRef.current ?? activeViewerAttachmentId;
    setActiveViewerAttachmentId(null);
    viewerOpenedFromAttachmentIdRef.current = null;

    if (!openerId) {
      return;
    }

    window.requestAnimationFrame(() => {
      const card = document.querySelector<HTMLElement>(
        `[data-attachment-card-id="${openerId}"]`
      );
      card?.focus();
    });
  }

  function showPreviousAttachmentInViewer() {
    if (!activeViewerAttachment || attachments.length <= 1) {
      return;
    }

    const currentIndex = attachments.findIndex((entry) => entry.id === activeViewerAttachment.id);
    if (currentIndex < 0) {
      return;
    }

    const previousIndex = (currentIndex - 1 + attachments.length) % attachments.length;
    setActiveViewerAttachmentId(attachments[previousIndex].id);
  }

  function showNextAttachmentInViewer() {
    if (!activeViewerAttachment || attachments.length <= 1) {
      return;
    }

    const currentIndex = attachments.findIndex((entry) => entry.id === activeViewerAttachment.id);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = (currentIndex + 1) % attachments.length;
    setActiveViewerAttachmentId(attachments[nextIndex].id);
  }

  function downloadAttachment(downloadUrl: string, filename: string) {
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = filename;
    anchor.rel = "noreferrer";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  function onFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (mode !== "create") {
      return;
    }

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
    <Drawer direction="right" open={open} onOpenChange={onOpenChange} handleOnly>
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
                <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
                  <Label htmlFor="task-assignee">Assignee</Label>
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger id="task-assignee" className="h-9 border-border/70 bg-background">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {resolvedAssigneeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assigneeOptions === null ? (
                    <p className="col-start-2 text-[11px] text-muted-foreground">Loading assignees...</p>
                  ) : null}
                </div>

                <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
                  <Label htmlFor="task-due-date">Due date</Label>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <Input
                      id="task-due-date"
                      type="text"
                      inputMode="numeric"
                      placeholder="DD/MM/YYYY"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="h-9 border-border/70 bg-background shadow-none"
                    />
                    <Popover open={dueDatePickerOpen} onOpenChange={setDueDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="h-9 w-9 border-border/70 bg-background"
                          aria-label="Open due date picker"
                        >
                          <CalendarDays className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={parseDateInputValue(dueDate) ?? undefined}
                          onSelect={(date) => {
                            setDueDate(date ? formatDateForInput(date) : "");
                            setDueDatePickerOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
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

                <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
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
              {mode === "create" ? (
                <div className="space-y-3">
                  <AttachmentDropzone
                    inputId="task-create-attachment-file"
                    title="Add attachments"
                    secondaryText="Drag and drop files here, or click to browse"
                    helperText={`Files upload after task creation. Max upload size: ${TASK_ATTACHMENT_MAX_LABEL}`}
                    onFilesSelected={onQueueAttachmentAdd}
                    disabled={saving || queuedFilesUploading || createdTaskIdDuringSubmit !== null}
                    loading={queuedFilesUploading}
                  />
                  {createAttachmentsError ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {createAttachmentsError}
                    </div>
                  ) : null}
                  {createSubmissionNotice ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {createSubmissionNotice.message}
                    </div>
                  ) : null}
                  {queuedFilesUploading ? (
                    <p className="text-xs text-muted-foreground">Uploading attachments...</p>
                  ) : null}
                  {createdTaskIdDuringSubmit ? (
                    <p className="text-xs text-muted-foreground">
                      Task is already created. Close this drawer and open the task to continue uploading files.
                    </p>
                  ) : null}
                  {queuedFiles.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                      No attachments queued.
                    </div>
                  ) : (
                    <AttachmentGrid>
                      {queuedFiles.map((file, index) => {
                        const rowDisabled =
                          saving || queuedFilesUploading || createdTaskIdDuringSubmit !== null;
                        const queuedFileKey = buildQueuedFileKey(file);
                        const actions: AttachmentRowAction[] = [
                          {
                            label: "Remove",
                            onSelect: () => removePendingCreateAttachment(index),
                            disabled: rowDisabled,
                            destructive: true,
                          },
                        ];

                        return (
                          <TaskAttachmentRow
                            key={queuedFileKey}
                            filename={file.name}
                            mimeType={file.type || null}
                            fileSizeBytes={file.size}
                            previewUrl={queuedImagePreviewUrls[queuedFileKey] ?? null}
                            hoverMetadata={["Status: Queued for upload"]}
                            actions={actions}
                            disabled={rowDisabled}
                          />
                        );
                      })}
                    </AttachmentGrid>
                  )}
                </div>
              ) : mode !== "edit" || !task ? (
                <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                  Task details are unavailable.
                </div>
              ) : (
                <div className="space-y-3">
                  <AttachmentDropzone
                    inputId="task-attachment-file"
                    title="Upload an attachment"
                    secondaryText="Drag and drop files here, or click to browse"
                    helperText={`Max upload size: ${TASK_ATTACHMENT_MAX_LABEL}`}
                    onFilesSelected={onAttachmentUpload}
                    disabled={existingAttachmentsUploading || attachmentDeletingId !== null}
                    loading={existingAttachmentsUploading}
                  />

                  {existingAttachmentsError ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {existingAttachmentsError}
                    </div>
                  ) : null}

                  {attachmentsLoading && attachments.length > 0 ? (
                    <p className="text-xs text-muted-foreground">Refreshing attachments...</p>
                  ) : null}

                  {attachmentsLoading && attachments.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                      Loading attachments...
                    </div>
                  ) : attachments.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                      No attachments yet.
                    </div>
                  ) : (
                    <AttachmentGrid>
                      {attachments.map((attachment) => {
                        const rowDisabled =
                          existingAttachmentsUploading || attachmentDeletingId !== null;
                        const downloadUrl = buildAttachmentDownloadUrl(attachment.id);
                        const inlinePreviewUrl = buildAttachmentInlinePreviewUrl(attachment.id);
                        const rowAction = () => openAttachmentViewer(attachment.id);
                        const actions: AttachmentRowAction[] = [
                          {
                            label: "Open",
                            onSelect: () => openAttachmentViewer(attachment.id),
                            disabled: rowDisabled,
                          },
                          {
                            label: "Download",
                            onSelect: () => downloadAttachment(downloadUrl, attachment.originalFilename),
                            disabled: rowDisabled,
                          },
                          {
                            label: "Delete",
                            onSelect: () => {
                              void onAttachmentDelete(attachment.id);
                            },
                            disabled: rowDisabled,
                            destructive: true,
                          },
                        ];

                        return (
                          <TaskAttachmentRow
                            key={attachment.id}
                            filename={attachment.originalFilename}
                            mimeType={attachment.mimeType}
                            fileSizeBytes={attachment.fileSizeBytes}
                            previewUrl={
                              isImageAttachmentFile(attachment.originalFilename, attachment.mimeType)
                                ? inlinePreviewUrl
                                : null
                            }
                            hoverMetadata={[
                              `Uploaded by: ${attachment.uploadedByName}`,
                              `Uploaded at: ${formatActivityTimestamp(attachment.createdAt)}`,
                            ]}
                            onRowClick={rowAction}
                            rowAriaLabel={`Open ${attachment.originalFilename}`}
                            actions={actions}
                            disabled={rowDisabled}
                            cardDataId={attachment.id}
                          />
                        );
                      })}
                    </AttachmentGrid>
                  )}
                </div>
              )}
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

                <TabsContent value="comments" className="mt-0 min-h-24">
                  {mode !== "edit" || !task ? (
                    <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                      Create the task to start comments.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2 rounded-md border border-border/70 bg-muted/10 p-3">
                        <Label htmlFor="task-comment-body" className="text-xs text-muted-foreground">
                          Add comment
                        </Label>
                        <Textarea
                          id="task-comment-body"
                          value={commentBody}
                          onChange={(event) => setCommentBody(event.target.value)}
                          placeholder="Write a comment..."
                          rows={3}
                          className="min-h-24 resize-y border-border/70 bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        />
                        <div className="flex items-center justify-end gap-2">
                          {commentSaving ? (
                            <p className="text-xs text-muted-foreground">Saving comment...</p>
                          ) : null}
                          <Button
                            type="button"
                            onClick={onCommentSubmit}
                            disabled={commentSaving || normalizedCommentBody.length === 0}
                            className="h-8 px-3"
                          >
                            {commentSaving ? "Commenting..." : "Comment"}
                          </Button>
                        </div>
                      </div>

                      {commentsError ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                          {commentsError}
                        </div>
                      ) : null}

                      {commentsLoading && commentItems.length > 0 ? (
                        <p className="text-xs text-muted-foreground">Refreshing comments...</p>
                      ) : null}

                      {commentsLoading && commentItems.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                          Loading comments...
                        </div>
                      ) : commentItems.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                          No comments yet.
                        </div>
                      ) : (
                        <ol className="space-y-2.5">
                          {commentItems.map((comment) => (
                            <li
                              key={comment.id}
                              className="rounded-md border border-border/70 bg-background px-3 py-2.5"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="text-sm font-medium text-foreground">{comment.authorName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatActivityTimestamp(comment.createdAt)}
                                </p>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="mt-0 min-h-24">
                  {mode !== "edit" || !task ? (
                    <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                      Create the task to start activity history.
                    </div>
                  ) : activityError ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {activityError}
                    </div>
                  ) : activityLoading && activityItems.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                      Loading activity...
                    </div>
                  ) : activityItems.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                      No activity yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activityLoading ? (
                        <p className="text-xs text-muted-foreground">Refreshing activity...</p>
                      ) : null}
                      <ol className="space-y-2.5">
                        {activityItems.map((item) => {
                          const secondary = renderActivitySecondary(item);
                          return (
                            <li key={item.id} className="rounded-md border border-border/70 bg-muted/10 px-3 py-2">
                              <p className="text-sm font-medium text-foreground">{renderActivityPrimary(item)}</p>
                              {secondary ? (
                                <p className="mt-0.5 text-xs text-muted-foreground">{secondary}</p>
                              ) : null}
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatActivityTimestamp(item.createdAt)}
                              </p>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
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
            {mode === "edit" ? (
              <p className="mr-auto text-xs text-muted-foreground">
                {saving ? "Saving changes..." : "Changes are saved automatically"}
              </p>
            ) : null}
            <Button type="button" variant="outline" className="min-w-[92px]" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {mode === "create" ? (
              <Button
                type="submit"
                disabled={saving || createdTaskIdDuringSubmit !== null}
                className="min-w-[124px]"
              >
                {saving
                  ? queuedFilesUploading
                    ? "Uploading..."
                    : "Creating..."
                  : createdTaskIdDuringSubmit
                    ? "Created"
                    : "Create task"}
              </Button>
            ) : null}
          </DrawerFooter>
        </form>

        <AttachmentViewerModal
          open={mode === "edit" && !!activeViewerAttachment}
          attachment={mode === "edit" ? activeViewerAttachment : null}
          inlinePreviewUrl={mode === "edit" ? activeViewerInlineUrl : null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeAttachmentViewer();
            }
          }}
          onDownload={(attachment) => {
            const downloadUrl = buildAttachmentDownloadUrl(attachment.id);
            downloadAttachment(downloadUrl, attachment.originalFilename);
          }}
          onNavigatePrevious={showPreviousAttachmentInViewer}
          onNavigateNext={showNextAttachmentInViewer}
          canNavigate={mode === "edit" && attachments.length > 1}
        />
      </DrawerContent>
    </Drawer>
  );
}
