import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Layar loading satu-satunya untuk route & cek sesi, supaya urutan
 * fallback router → cek sesi → layout tidak berkedip ganti latar/posisi.
 * `admin` memakai latar sidebar agar menyatu dengan AdminLayout (bg-sidebar).
 */
export function PageLoader({ admin = false }: { admin?: boolean }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "fixed inset-0 grid place-items-center",
        admin ? "bg-sidebar" : "bg-background",
      )}
    >
      <Spinner className="size-6 text-muted-foreground" />
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
