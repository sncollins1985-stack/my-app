export const OPEN_CREATE_PROJECT_DIALOG_EVENT = "open-create-project-dialog";
export const PROJECT_CREATED_EVENT = "project-created";

export function openCreateProjectDialog() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(OPEN_CREATE_PROJECT_DIALOG_EVENT));
}

export function notifyProjectCreated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(PROJECT_CREATED_EVENT));
}
