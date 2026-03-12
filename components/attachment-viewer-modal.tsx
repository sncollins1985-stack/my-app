"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Archive, Download, File, FileSpreadsheet, FileText, ImageIcon, Presentation, X } from "lucide-react";
import {
  getAttachmentFileCategory,
  isImageAttachmentFile,
  isPdfAttachmentFile,
} from "@/components/task-attachment-row";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type PersistedAttachmentViewerItem = {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedByName: string;
  createdAt: string;
};

type AttachmentViewerModalProps = {
  open: boolean;
  attachment: PersistedAttachmentViewerItem | null;
  inlinePreviewUrl: string | null;
  onOpenChange: (open: boolean) => void;
  onDownload: (attachment: PersistedAttachmentViewerItem) => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  canNavigate?: boolean;
};

function isInteractiveElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (
    tagName === "button" ||
    tagName === "a" ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "summary"
  ) {
    return true;
  }

  return target.isContentEditable;
}

function FileCategoryIcon(props: { category: ReturnType<typeof getAttachmentFileCategory> }) {
  switch (props.category) {
    case "pdf":
      return <FileText className="size-12 text-red-600" />;
    case "word":
      return <FileText className="size-12 text-blue-600" />;
    case "excel":
      return <FileSpreadsheet className="size-12 text-emerald-600" />;
    case "powerpoint":
      return <Presentation className="size-12 text-orange-600" />;
    case "text":
      return <FileText className="size-12 text-slate-600" />;
    case "zip":
      return <Archive className="size-12 text-amber-600" />;
    case "image":
      return <ImageIcon className="size-12 text-indigo-600" />;
    default:
      return <File className="size-12 text-muted-foreground" />;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampPanOffset(params: {
  x: number;
  y: number;
  scale: number;
  container: HTMLDivElement | null;
}) {
  if (!params.container || params.scale <= 1) {
    return { x: 0, y: 0 };
  }

  const maxX = ((params.scale - 1) * params.container.clientWidth) / 2;
  const maxY = ((params.scale - 1) * params.container.clientHeight) / 2;

  return {
    x: clamp(params.x, -maxX, maxX),
    y: clamp(params.y, -maxY, maxY),
  };
}

function ZoomableImagePreview(props: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  function reset() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    dragStartRef.current = null;
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none overflow-hidden bg-black/5"
      onDoubleClick={() => reset()}
      onWheel={(event) => {
        event.preventDefault();

        const nextScale = clamp(scale * (event.deltaY < 0 ? 1.12 : 0.9), 1, 8);
        setScale(nextScale);
        if (nextScale === 1) {
          setOffset({ x: 0, y: 0 });
          return;
        }

        setOffset((current) =>
          clampPanOffset({
            x: current.x,
            y: current.y,
            scale: nextScale,
            container: containerRef.current,
          })
        );
      }}
      onPointerDown={(event) => {
        if (scale <= 1) {
          return;
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        dragStartRef.current = {
          x: event.clientX,
          y: event.clientY,
          startX: offset.x,
          startY: offset.y,
        };
      }}
      onPointerMove={(event) => {
        if (!dragStartRef.current) {
          return;
        }

        const deltaX = event.clientX - dragStartRef.current.x;
        const deltaY = event.clientY - dragStartRef.current.y;
        setOffset(
          clampPanOffset({
            x: dragStartRef.current.startX + deltaX,
            y: dragStartRef.current.startY + deltaY,
            scale,
            container: containerRef.current,
          })
        );
      }}
      onPointerUp={() => {
        setDragging(false);
        dragStartRef.current = null;
      }}
      onPointerCancel={() => {
        setDragging(false);
        dragStartRef.current = null;
      }}
      onPointerLeave={() => {
        if (!dragging) {
          return;
        }

        setDragging(false);
        dragStartRef.current = null;
      }}
      style={{ cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
    >
      <div
        className="relative h-full w-full"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transition: dragging ? "none" : "transform 120ms ease-out",
        }}
      >
        <Image src={props.src} alt={props.alt} fill sizes="92vw" className="select-none object-contain" unoptimized />
      </div>
    </div>
  );
}

export function AttachmentViewerModal({
  open,
  attachment,
  inlinePreviewUrl,
  onOpenChange,
  onDownload,
  onNavigatePrevious,
  onNavigateNext,
  canNavigate = false,
}: AttachmentViewerModalProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !attachment) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      viewerRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [attachment, open]);

  const isImageFile = attachment
    ? isImageAttachmentFile(attachment.originalFilename, attachment.mimeType)
    : false;
  const isPdfFile = attachment ? isPdfAttachmentFile(attachment.originalFilename, attachment.mimeType) : false;
  const canPreviewInline = Boolean(attachment && inlinePreviewUrl && (isImageFile || isPdfFile));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!h-[92vh] !w-[92vw] !max-h-none !max-w-none overflow-hidden p-0"
        overlayClassName="bg-black/55"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          viewerRef.current?.focus();
        }}
      >
        {!attachment ? null : (
          <div
            ref={viewerRef}
            tabIndex={0}
            className="flex h-full flex-col outline-none"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onOpenChange(false);
                return;
              }

              if (canNavigate && event.key === "ArrowLeft") {
                event.preventDefault();
                onNavigatePrevious?.();
                return;
              }

              if (canNavigate && event.key === "ArrowRight") {
                event.preventDefault();
                onNavigateNext?.();
                return;
              }

              if ((event.key === " " || event.code === "Space") && !isInteractiveElement(event.target)) {
                event.preventDefault();
                const scrollDelta = event.shiftKey
                  ? -Math.max(window.innerHeight * 0.7, 240)
                  : Math.max(window.innerHeight * 0.7, 240);
                previewScrollRef.current?.scrollBy({
                  top: scrollDelta,
                  behavior: "smooth",
                });
              }
            }}
          >
            <DialogHeader className="sticky top-0 z-20 flex-row items-center justify-between gap-3 border-b border-black/[0.06] bg-background px-4 py-3 text-left sm:px-5">
              <div className="min-w-0">
                <DialogTitle className="truncate text-sm font-semibold sm:text-base">
                  {attachment.originalFilename}
                </DialogTitle>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onDownload(attachment)}>
                  <Download className="size-4" />
                  Download
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  <X className="size-4" />
                  Close
                </Button>
              </div>
            </DialogHeader>

            <div ref={previewScrollRef} className="min-h-0 flex-1 overflow-auto bg-muted/5">
              {canPreviewInline && inlinePreviewUrl ? (
                isImageFile ? (
                  <div className="h-full min-h-[500px] w-full">
                    <ZoomableImagePreview
                      src={inlinePreviewUrl}
                      alt={attachment.originalFilename}
                    />
                  </div>
                ) : (
                  <div className="h-full min-h-[500px] w-full">
                    <iframe
                      src={inlinePreviewUrl}
                      title={`Preview ${attachment.originalFilename}`}
                      className="h-full min-h-[500px] w-full border-0 bg-background"
                    />
                  </div>
                )
              ) : (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 px-5 text-center">
                  <FileCategoryIcon
                    category={getAttachmentFileCategory(attachment.originalFilename, attachment.mimeType)}
                  />
                  <p className="max-w-[min(92vw,780px)] break-all text-sm font-medium text-foreground">
                    {attachment.originalFilename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Inline preview is not available for this file type.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => onDownload(attachment)}>
                    <Download className="size-4" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
