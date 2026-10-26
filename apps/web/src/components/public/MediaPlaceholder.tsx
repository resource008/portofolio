import type * as React from "react";
import { useState } from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface MediaPlaceholderProps {
  src?: string | null;
  alt?: string;
  className?: string;
  rounded?: string;
  icon?: React.ComponentType<React.ComponentProps<"svg">>;
  iconClassName?: string;
  label?: string;
  priority?: boolean;
}

export function MediaPlaceholder({
  src,
  alt = "",
  className,
  rounded = "rounded-2xl",
  icon: Icon = PhotoIcon,
  iconClassName,
  label,
  priority = false,
}: MediaPlaceholderProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        alt={alt}
        className={cn("object-cover", rounded, className)}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        onError={() => setFailed(true)}
        src={src}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid place-items-center bg-muted text-muted-foreground/70",
        rounded,
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <Icon className={cn("size-7", iconClassName)} />
        {label ? <span className="text-xs font-medium">{label}</span> : null}
      </div>
    </div>
  );
}
