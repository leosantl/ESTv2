import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { PortalAuthProvider } from "@/contexts/PortalAuthContext";

const portalQueryClient = new QueryClient();

export const Route = createFileRoute("/portal")({
  component: PortalLayout,
});

function PortalLayout() {
  return (
    <QueryClientProvider client={portalQueryClient}>
      <PortalAuthProvider>
        <Outlet />
        <Toaster position="top-right" />
      </PortalAuthProvider>
    </QueryClientProvider>
  );
}
