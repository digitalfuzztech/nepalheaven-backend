import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function PendingContent() {
  return (
    <div className="container-lux flex min-h-[45vh] items-center justify-center py-20 text-sm font-semibold text-muted-foreground">
      Loading Nepal Heaven content…
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: PendingContent,
    defaultPendingMs: 250,
    defaultPendingMinMs: 300,
  });

  return router;
};
