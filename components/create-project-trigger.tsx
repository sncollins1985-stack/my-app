"use client";

import { ButtonHTMLAttributes } from "react";
import { openCreateProjectDialog } from "@/components/project-create-events";

type CreateProjectTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function CreateProjectTrigger({
  onClick,
  type = "button",
  ...props
}: CreateProjectTriggerProps) {
  return (
    <button
      {...props}
      type={type}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          openCreateProjectDialog();
        }
      }}
    />
  );
}
