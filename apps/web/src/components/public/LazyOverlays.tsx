import { lazy, Suspense, useState, type ComponentProps } from "react";
import type { ProjectDrawer as ProjectDrawerType } from "@/components/public/ProjectDrawer";
import type { CvDialogContent as CvDialogContentType } from "@/components/public/CvDialog";

// Drawer proyek & dialog CV baru diunduh saat pertama kali dibuka, supaya tidak
// membebani muatan awal halaman publik. Setelah itu tetap terpasang agar animasi
// buka/tutup berjalan normal.
const ProjectDrawerImpl = lazy(() =>
  import("@/components/public/ProjectDrawer").then((m) => ({ default: m.ProjectDrawer })),
);
const CvDialogImpl = lazy(() =>
  import("@/components/public/CvDialog").then((m) => ({ default: m.CvDialogContent })),
);

export function LazyProjectDrawer(props: ComponentProps<typeof ProjectDrawerType>) {
  const [used, setUsed] = useState(false);
  if (props.project && !used) setUsed(true);
  if (!used && !props.project) return null;
  return (
    <Suspense fallback={null}>
      <ProjectDrawerImpl {...props} />
    </Suspense>
  );
}

export function LazyCvDialog(props: ComponentProps<typeof CvDialogContentType>) {
  const [used, setUsed] = useState(false);
  if (props.open && !used) setUsed(true);
  if (!used && !props.open) return null;
  return (
    <Suspense fallback={null}>
      <CvDialogImpl {...props} />
    </Suspense>
  );
}
