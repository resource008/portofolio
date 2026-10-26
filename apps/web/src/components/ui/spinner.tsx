import { translate } from "@/lib/language";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { cn } from "@/lib/utils";

export function Spinner({
  className,
  ...props
}: React.ComponentProps<typeof ArrowPathIcon>): React.ReactElement {
  return (
    <ArrowPathIcon
      aria-label={translate("Memuat")}
      className={cn("animate-spin", className)}
      role="status"
      {...props}
    />
  );
}
