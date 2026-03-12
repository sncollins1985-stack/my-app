"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type AttachmentDropzoneProps = {
  inputId: string;
  title: string;
  secondaryText: string;
  helperText: string;
  onFilesSelected: (files: File[]) => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  multiple?: boolean;
  accept?: string;
  className?: string;
};

export function AttachmentDropzone({
  inputId,
  title,
  secondaryText,
  helperText,
  onFilesSelected,
  disabled = false,
  loading = false,
  multiple = true,
  accept,
  className,
}: AttachmentDropzoneProps) {
  const dragDepthRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  function preventDropDefaults(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function onDragEnter(event: DragEvent<HTMLLabelElement>) {
    preventDropDefaults(event);
    if (disabled) {
      return;
    }

    dragDepthRef.current += 1;
    setIsDragOver(true);
  }

  function onDragOver(event: DragEvent<HTMLLabelElement>) {
    preventDropDefaults(event);
    if (disabled) {
      return;
    }

    if (!isDragOver) {
      setIsDragOver(true);
    }
  }

  function onDragLeave(event: DragEvent<HTMLLabelElement>) {
    preventDropDefaults(event);
    if (disabled) {
      return;
    }

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOver(false);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    preventDropDefaults(event);
    dragDepthRef.current = 0;
    setIsDragOver(false);

    if (disabled) {
      return;
    }

    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    if (droppedFiles.length === 0) {
      return;
    }

    void onFilesSelected(droppedFiles);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length > 0) {
      void onFilesSelected(selectedFiles);
    }

    // Allow re-selecting the same files in consecutive picks.
    event.target.value = "";
  }

  return (
    <div className={className}>
      <input
        id={inputId}
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={onInputChange}
      />
      <label
        htmlFor={inputId}
        aria-disabled={disabled}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "block rounded-md border border-dashed px-4 py-5 text-center transition-colors",
          "focus-within:ring-2 focus-within:ring-ring/40",
          disabled
            ? "cursor-not-allowed border-border/50 bg-muted/20 opacity-70"
            : "cursor-pointer border-border/70 bg-muted/10 hover:border-primary/45 hover:bg-primary/5",
          !disabled && isDragOver ? "border-primary bg-primary/10 ring-1 ring-primary/30" : null
        )}
      >
        <div className="flex flex-col items-center gap-1">
          {loading ? (
            <Loader2 className="size-5 text-primary animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-5 text-primary" aria-hidden="true" />
          )}
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{secondaryText}</p>
          <p className="text-[11px] text-muted-foreground">{helperText}</p>
        </div>
      </label>
    </div>
  );
}
