import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "./lib/query";
import { router } from "./router";
import { ToastProvider } from "@/components/ui/toast";
import { useFavicon } from "@/lib/favicon";

function GlobalEffects() {
  useFavicon();
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalEffects />
      <ToastProvider position="top-right">
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
