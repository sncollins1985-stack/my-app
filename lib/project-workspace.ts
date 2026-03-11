export type ProjectModuleId =
  | "overview"
  | "phases"
  | "plan"
  | "tasks"
  | "risks"
  | "issues"
  | "team"
  | "financials"
  | "documents"
  | "activity"
  | "settings";

export type ProjectFinancialSubmoduleId = "budgets" | "orders" | "invoices";

export interface ProjectModuleChildDefinition {
  id: string;
  label: string;
  segment: string;
  description: string;
  defaultEnabled: boolean;
  requiredPermission?: string;
}

export interface ProjectModuleDefinition {
  id: ProjectModuleId;
  label: string;
  segment: string;
  description: string;
  defaultEnabled: boolean;
  requiredPermission?: string;
  templateScopes?: string[];
  children?: ProjectModuleChildDefinition[];
}

export interface ProjectModuleSelectionOptions {
  enabledModuleIds?: ProjectModuleId[];
  permissions?: string[];
}

const DEFAULT_MODULE_SEGMENT = "overview";

export const PROJECT_MODULES: ProjectModuleDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    segment: "overview",
    description: "Project summary and key status indicators.",
    defaultEnabled: true,
  },
  {
    id: "phases",
    label: "Phases",
    segment: "phases",
    description: "Major delivery phases, milestones, and readiness gates.",
    defaultEnabled: true,
  },
  {
    id: "plan",
    label: "Plan",
    segment: "plan",
    description: "Delivery planning, assumptions, and schedule baselines.",
    defaultEnabled: true,
  },
  {
    id: "tasks",
    label: "Tasks",
    segment: "tasks",
    description: "Work items and execution progress for project teams.",
    defaultEnabled: true,
  },
  {
    id: "risks",
    label: "Risks",
    segment: "risks",
    description: "Risk register and mitigation activity for this project.",
    defaultEnabled: true,
  },
  {
    id: "issues",
    label: "Issues",
    segment: "issues",
    description: "Live issues, ownership, and resolution tracking.",
    defaultEnabled: true,
  },
  {
    id: "team",
    label: "Team",
    segment: "team",
    description: "Roles, capacity, and team assignment context.",
    defaultEnabled: true,
  },
  {
    id: "financials",
    label: "Financials",
    segment: "financials",
    description: "Commercial and financial controls across project delivery.",
    defaultEnabled: true,
    children: [
      {
        id: "budgets",
        label: "Budgets",
        segment: "budgets",
        description: "Budget setup, revisions, and variance tracking.",
        defaultEnabled: true,
      },
      {
        id: "orders",
        label: "Orders",
        segment: "orders",
        description: "Purchase and service orders linked to delivery scope.",
        defaultEnabled: true,
      },
      {
        id: "invoices",
        label: "Invoices",
        segment: "invoices",
        description: "Invoice intake, review, and payment readiness.",
        defaultEnabled: true,
      },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    segment: "documents",
    description: "Document library for project assets and references.",
    defaultEnabled: true,
  },
  {
    id: "activity",
    label: "Activity",
    segment: "activity",
    description: "Cross-module timeline of noteworthy project events.",
    defaultEnabled: true,
  },
  {
    id: "settings",
    label: "Settings",
    segment: "settings",
    description: "Project preferences, module controls, and access setup.",
    defaultEnabled: true,
  },
];

const PROJECT_MODULE_MAP = new Map(PROJECT_MODULES.map((module) => [module.segment, module]));

function hasPermission(permissions: Set<string> | null, requiredPermission?: string) {
  if (!requiredPermission) {
    return true;
  }

  if (!permissions) {
    return false;
  }

  return permissions.has(requiredPermission);
}

export function getProjectModules(
  options: ProjectModuleSelectionOptions = {}
): ProjectModuleDefinition[] {
  const enabledModuleIdSet = options.enabledModuleIds
    ? new Set(options.enabledModuleIds)
    : null;
  const permissionSet = options.permissions ? new Set(options.permissions) : null;

  return PROJECT_MODULES.filter((module) => {
    const enabledByTemplate =
      enabledModuleIdSet === null ? module.defaultEnabled : enabledModuleIdSet.has(module.id);

    if (!enabledByTemplate) {
      return false;
    }

    return hasPermission(permissionSet, module.requiredPermission);
  });
}

export function getProjectModuleBySegment(segment?: string | null): ProjectModuleDefinition {
  return (
    PROJECT_MODULE_MAP.get(segment ?? DEFAULT_MODULE_SEGMENT) ??
    PROJECT_MODULE_MAP.get(DEFAULT_MODULE_SEGMENT)!
  );
}

export function getProjectModuleChildBySegment(
  module: ProjectModuleDefinition,
  childSegment?: string | null
) {
  if (!childSegment || !module.children) {
    return null;
  }

  return module.children.find((child) => child.segment === childSegment) ?? null;
}

export function buildProjectModuleHref(
  projectId: string | number,
  moduleSegment: string
): string {
  const encodedProjectId = encodeURIComponent(String(projectId));
  return `/projects/${encodedProjectId}/${moduleSegment}`;
}

export function buildProjectModuleChildHref(
  projectId: string | number,
  moduleSegment: string,
  childSegment: string
): string {
  const moduleHref = buildProjectModuleHref(projectId, moduleSegment);
  return `${moduleHref}/${childSegment}`;
}
