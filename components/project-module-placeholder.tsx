import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectModulePlaceholderProps {
  title: string;
  description: string;
  nextFocus: string;
  children?: ReactNode;
}

export function ProjectModulePlaceholder({
  title,
  description,
  nextFocus,
  children,
}: ProjectModulePlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Project module</CardDescription>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>{description}</p>
        <p>
          Next focus: <span className="font-medium text-foreground">{nextFocus}</span>
        </p>
        {children}
      </CardContent>
    </Card>
  );
}
