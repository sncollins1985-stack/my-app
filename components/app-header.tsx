"use client"

import { Search } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"

interface AppHeaderProps {
  breadcrumbs?: { label: string; href?: string }[]
}

export function AppHeader({ breadcrumbs = [] }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />

      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1
            return [
              index > 0 ? (
                <BreadcrumbSeparator key={`separator-${crumb.href ?? crumb.label}-${index}`} />
              ) : null,
              <BreadcrumbItem key={`${crumb.href ?? crumb.label}-${index}`}>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href || "#"}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>,
            ]
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search users, projects..."
            className="h-8 w-64 rounded-md bg-muted/50 pl-8 text-sm focus:bg-background"
          />
        </div>
      </div>
    </header>
  )
}
