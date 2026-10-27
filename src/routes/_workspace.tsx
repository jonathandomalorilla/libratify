import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_workspace")({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
