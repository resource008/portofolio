import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { queryClient } from "./lib/query";
import { router } from "./router";
import { ToastProvider } from "@/components/ui/toast";
import { useFavicon } from "@/lib/favicon";
import { useMotionEnabled } from "@/lib/motion";

function GlobalEffects() {
  useFavicon();
  return null;
}

export default function App() {
  const { motionEnabled } = useMotionEnabled();

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion={motionEnabled ? "user" : "always"}>
        <GlobalEffects />
        <ToastProvider position="top-right">
          <RouterProvider router={router} />
        </ToastProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
