"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import ManageTopbar from "@/components/manage/ManageTopbar";

export type ManageRole = "admin" | "manager";

export type ManageUser = {
  name: string;
  company: string | null;
  email: string;
};

type ManageShellContextValue = {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
};

const ManageShellContext = createContext<ManageShellContextValue | null>(null);

export function useManageShell() {
  const context = useContext(ManageShellContext);

  if (!context) {
    throw new Error("useManageShell must be used within ManageShell");
  }

  return context;
}

export default function ManageShell({
  user,
  role,
  children,
}: {
  user: ManageUser;
  role: ManageRole;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <ManageShellContext.Provider
      value={{ sidebarOpen, openSidebar, closeSidebar }}
    >
      <div className="panel-theme min-h-screen bg-background text-white">
        <ManageTopbar
          user={user}
          role={role}
          onOpenSidebar={openSidebar}
        />
        {children}
      </div>
    </ManageShellContext.Provider>
  );
}
