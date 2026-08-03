"use client";

import { WorkspaceProvider } from "./workspace-context";

export function WorkspaceRoot({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
