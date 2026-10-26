import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";
import { authClient } from "@/lib/auth-client";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <PageLoader admin />;
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
