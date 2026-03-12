"use client";

import { ReactNode, SyntheticEvent, useMemo, useState } from "react";
import Image from "next/image";
import {
  Archive,
  File,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  MoreHorizontal,
  Presentation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AttachmentFileCategory =
  | "image"
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "text"
  | "zip"
  | "generic";

type AttachmentTypeMetadata = {
  category: AttachmentFileCategory;
  shortLabel: string;
  displayLabel: string;
};

export type AttachmentRowAction = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

type TaskAttachmentRowProps = {
  filename: string;
  mimeType?: string | null;
  fileSizeBytes: number;
  previewUrl?: string | null;
  hoverMetadata?: string[];
  onRowClick?: () => void;
  rowAriaLabel?: string;
  actions: AttachmentRowAction[];
  disabled?: boolean;
  cardDataId?: string;
};

export function AttachmentGrid(props: { children: ReactNode; className?: string }) {
  return (
    <ol
      className={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3",
        props.className
      )}
    >
      {props.children}
    </ol>
  );
}

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "heic",
  "heif",
]);

const PDF_EXTENSIONS = new Set(["pdf"]);
const WORD_EXTENSIONS = new Set(["doc", "docx"]);
const EXCEL_EXTENSIONS = new Set(["xls", "xlsx"]);
const POWERPOINT_EXTENSIONS = new Set(["ppt", "pptx"]);
const TEXT_EXTENSIONS = new Set(["txt", "csv", "tsv", "md", "rtf", "log"]);
const ZIP_EXTENSIONS = new Set(["zip", "rar", "7z", "gz", "tar"]);

function getFileExtension(filename: string) {
  const segments = filename.trim().split(".");
  if (segments.length <= 1) {
    return "";
  }

  return segments[segments.length - 1].toLowerCase();
}

function resolveAttachmentType(filename: string, mimeType?: string | null): AttachmentTypeMetadata {
  const normalizedMimeType = (mimeType || "").toLowerCase();
  const extension = getFileExtension(filename);

  if (normalizedMimeType.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
    return { category: "image", shortLabel: "IMG", displayLabel: "Image file" };
  }

  if (normalizedMimeType === "application/pdf" || PDF_EXTENSIONS.has(extension)) {
    return { category: "pdf", shortLabel: "PDF", displayLabel: "PDF document" };
  }

  if (
    normalizedMimeType.includes("word") ||
    normalizedMimeType === "application/msword" ||
    WORD_EXTENSIONS.has(extension)
  ) {
    return { category: "word", shortLabel: "DOC", displayLabel: "Word document" };
  }

  if (
    normalizedMimeType.includes("spreadsheet") ||
    normalizedMimeType.includes("excel") ||
    normalizedMimeType === "application/vnd.ms-excel" ||
    EXCEL_EXTENSIONS.has(extension)
  ) {
    return { category: "excel", shortLabel: "XLS", displayLabel: "Spreadsheet" };
  }

  if (
    normalizedMimeType.includes("presentation") ||
    normalizedMimeType.includes("powerpoint") ||
    POWERPOINT_EXTENSIONS.has(extension)
  ) {
    return { category: "powerpoint", shortLabel: "PPT", displayLabel: "Presentation" };
  }

  if (
    normalizedMimeType.startsWith("text/") ||
    normalizedMimeType === "text/csv" ||
    TEXT_EXTENSIONS.has(extension)
  ) {
    return { category: "text", shortLabel: "TXT", displayLabel: "Text document" };
  }

  if (
    normalizedMimeType.includes("zip") ||
    normalizedMimeType.includes("archive") ||
    ZIP_EXTENSIONS.has(extension)
  ) {
    return { category: "zip", shortLabel: "ZIP", displayLabel: "Archive file" };
  }

  return { category: "generic", shortLabel: "FILE", displayLabel: "File" };
}

export function getAttachmentFileCategory(filename: string, mimeType?: string | null) {
  return resolveAttachmentType(filename, mimeType).category;
}

export function getAttachmentFileTypeLabel(filename: string, mimeType?: string | null) {
  return resolveAttachmentType(filename, mimeType).displayLabel;
}

function formatFileSize(fileSizeBytes: number) {
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = fileSizeBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formatted = size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

function AttachmentActionsMenu(props: {
  actions: AttachmentRowAction[];
  disabled: boolean;
  filename: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 bg-background/85 backdrop-blur-[1px]"
          disabled={props.disabled}
          aria-label={`More actions for ${props.filename}`}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {props.actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onSelect={action.onSelect}
            disabled={props.disabled || action.disabled}
            variant={action.destructive ? "destructive" : "default"}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AttachmentPreview(props: {
  filename: string;
  mimeType?: string | null;
  previewUrl?: string | null;
  onImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const typeMetadata = useMemo(
    () => resolveAttachmentType(props.filename, props.mimeType),
    [props.filename, props.mimeType]
  );

  if (typeMetadata.category === "image" && props.previewUrl) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-md border border-border/70 bg-muted/20">
        <Image
          src={props.previewUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 40vw, 140px"
          className="object-cover"
          unoptimized
          onLoad={props.onImageLoad}
        />
      </div>
    );
  }

  let Icon = File;
  let tileClassName = "border-border/70 bg-muted/10 text-muted-foreground";

  switch (typeMetadata.category) {
    case "pdf":
      Icon = FileText;
      tileClassName = "border-red-200 bg-red-50 text-red-700";
      break;
    case "word":
      Icon = FileText;
      tileClassName = "border-blue-200 bg-blue-50 text-blue-700";
      break;
    case "excel":
      Icon = FileSpreadsheet;
      tileClassName = "border-emerald-200 bg-emerald-50 text-emerald-700";
      break;
    case "powerpoint":
      Icon = Presentation;
      tileClassName = "border-orange-200 bg-orange-50 text-orange-700";
      break;
    case "text":
      Icon = FileText;
      tileClassName = "border-slate-200 bg-slate-50 text-slate-700";
      break;
    case "zip":
      Icon = Archive;
      tileClassName = "border-amber-200 bg-amber-50 text-amber-700";
      break;
    case "image":
      Icon = ImageIcon;
      tileClassName = "border-indigo-200 bg-indigo-50 text-indigo-700";
      break;
    default:
      Icon = File;
      tileClassName = "border-border/70 bg-muted/10 text-muted-foreground";
      break;
  }

  return (
    <div
      className={cn(
        "flex aspect-square w-full flex-col items-center justify-center rounded-md border",
        tileClassName
      )}
      aria-hidden="true"
    >
      <Icon className="size-7" />
      <span className="mt-1 text-[10px] font-semibold tracking-wide">{typeMetadata.shortLabel}</span>
    </div>
  );
}

export function isImageAttachmentFile(filename: string, mimeType?: string | null) {
  return getAttachmentFileCategory(filename, mimeType) === "image";
}

export function isPdfAttachmentFile(filename: string, mimeType?: string | null) {
  return getAttachmentFileCategory(filename, mimeType) === "pdf";
}

export function isPreviewableAttachmentFile(filename: string, mimeType?: string | null) {
  const category = getAttachmentFileCategory(filename, mimeType);
  return category === "image" || category === "pdf";
}

export function TaskAttachmentRow({
  filename,
  mimeType,
  fileSizeBytes,
  previewUrl,
  hoverMetadata = [],
  onRowClick,
  rowAriaLabel,
  actions,
  disabled = false,
  cardDataId,
}: TaskAttachmentRowProps) {
  const typeMetadata = useMemo(() => resolveAttachmentType(filename, mimeType), [filename, mimeType]);
  const [imageDimensions, setImageDimensions] = useState<string | null>(null);

  const hoverLines = [
    `Filename: ${filename}`,
    `Type: ${typeMetadata.displayLabel}${mimeType ? ` (${mimeType})` : ""}`,
    `Size: ${formatFileSize(fileSizeBytes)}`,
    ...hoverMetadata,
  ];

  if (imageDimensions) {
    hoverLines.push(`Dimensions: ${imageDimensions}`);
  }

  const bodyClassName = cn(
    "w-full rounded-lg border border-border/70 bg-background p-2 text-left",
    "transition-[transform,box-shadow,background-color] duration-[120ms] ease-out",
    "hover:-translate-y-0.5 hover:bg-muted/10 hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)]",
    "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
    disabled ? "cursor-not-allowed opacity-70" : null
  );

  const content = (
    <>
      <AttachmentPreview
        filename={filename}
        mimeType={mimeType}
        previewUrl={previewUrl}
        onImageLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth > 0 && image.naturalHeight > 0) {
            setImageDimensions(`${image.naturalWidth} x ${image.naturalHeight}`);
          }
        }}
      />
      <p className="mt-2 truncate text-xs font-medium text-foreground">{filename}</p>
    </>
  );

  return (
    <li className="group relative">
      <Tooltip>
        <TooltipTrigger asChild>
          {onRowClick ? (
            <button
              type="button"
              onClick={onRowClick}
              disabled={disabled}
              aria-label={rowAriaLabel ?? filename}
              className={bodyClassName}
              data-attachment-card-id={cardDataId}
            >
              {content}
            </button>
          ) : (
            <div className={bodyClassName} data-attachment-card-id={cardDataId}>
              {content}
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="max-w-[320px] space-y-0.5 p-2.5">
          {hoverLines.map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </TooltipContent>
      </Tooltip>

      <div
        className={cn(
          "absolute right-3 top-3 opacity-0 transition-opacity duration-[120ms]",
          "group-hover:opacity-100 group-focus-within:opacity-100"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <AttachmentActionsMenu actions={actions} disabled={disabled} filename={filename} />
      </div>
    </li>
  );
}
