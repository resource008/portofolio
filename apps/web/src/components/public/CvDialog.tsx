import { useState } from "react";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogPopup, DialogTitle } from "@/components/ui/dialog";

interface CvDialogProps {
  url: string;
}

interface CvDialogContentProps {
  url: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Dialog CV (tanpa tombol) — bisa dipicu dari komponen mana pun. */
export function CvDialogContent({ url, open, onOpenChange }: CvDialogContentProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Curriculum Vitae</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <iframe
            className="h-[70vh] w-full rounded-lg border bg-white"
            src={url}
            title="Curriculum Vitae"
          />
        </div>
      </DialogPopup>
    </Dialog>
  );
}

/** Tombol + dialog CV (dipakai di kolom kiri hero). */
export function CvDialog({ url }: CvDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="lg" variant="default">
        <DocumentTextIcon /> Lihat CV
      </Button>

      <CvDialogContent onOpenChange={setOpen} open={open} url={url} />
    </>
  );
}