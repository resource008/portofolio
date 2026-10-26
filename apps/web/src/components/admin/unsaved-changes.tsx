import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useBlocker, type BlockerFunction } from "react-router-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";

export interface UnsavedChangesGuard {
  isDirty: () => boolean;
  save: () => Promise<unknown>;
  autoSaveOnLeave?: boolean;
}

interface UnsavedChangesContextValue {
  register: (guard: UnsavedChangesGuard | null) => void;
  requestLeave: (proceed: () => void) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const guardRef = useRef<UnsavedChangesGuard | null>(null);
  const pendingRef = useRef<(() => void) | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const [hasGuard, setHasGuard] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const register = useCallback((guard: UnsavedChangesGuard | null) => {
    guardRef.current = guard;
    setHasGuard(Boolean(guard));
  }, []);

  const closeDialog = useCallback(() => {
    pendingRef.current = null;
    cancelRef.current = null;
    setOpen(false);
  }, []);

  const requestLeave = useCallback((proceed: () => void) => {
    const guard = guardRef.current;
    if (guard?.isDirty()) {
      if (guard.autoSaveOnLeave) {
        const finish = () => {
          guardRef.current = null;
          setHasGuard(false);
          proceed();
        };
        // Gagal simpan pun tetap lanjut keluar.
        guard.save().then(finish, finish);
        return;
      }
      pendingRef.current = proceed;
      cancelRef.current = null;
      setOpen(true);
      return;
    }
    proceed();
  }, []);

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname && Boolean(guardRef.current),
    [],
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const { proceed, reset } = blocker;
    const guard = guardRef.current;
    if (guard?.isDirty()) {
      if (guard.autoSaveOnLeave) {
        const finish = () => {
          guardRef.current = null;
          setHasGuard(false);
          proceed();
        };
        guard.save().then(finish, finish);
      } else {
        pendingRef.current = () => proceed();
        cancelRef.current = () => reset();
        setOpen(true);
      }
    } else {
      proceed();
    }
    // Intentionally only reacts to the blocker state transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state]);

  useEffect(() => {
    if (!hasGuard) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasGuard]);

  const handleCancel = useCallback(() => {
    cancelRef.current?.();
    closeDialog();
  }, [closeDialog]);

  const handleDiscard = useCallback(() => {
    const proceed = pendingRef.current;
    // Clear the guard so the navigation we are about to run is not blocked again.
    guardRef.current = null;
    setHasGuard(false);
    closeDialog();
    proceed?.();
  }, [closeDialog]);

  const handleSave = useCallback(async () => {
    const guard = guardRef.current;
    const proceed = pendingRef.current;
    if (!guard) {
      closeDialog();
      proceed?.();
      return;
    }
    setSaving(true);
    try {
      await guard.save();
      guardRef.current = null;
      setHasGuard(false);
      closeDialog();
      proceed?.();
    } catch {
      // Saving failed (the page shows its own toast); keep the dialog open.
    } finally {
      setSaving(false);
    }
  }, [closeDialog]);

  const value = useMemo(() => ({ register, requestLeave }), [register, requestLeave]);

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <AlertDialog
        onOpenChange={(next) => {
          if (!next) handleCancel();
        }}
        open={open}
      >
        <AlertDialogPopup>
          <AlertDialogHeader className="pe-8">
            <AlertDialogClose
              aria-label={t("Batal")}
              className="absolute end-2 top-2 z-1"
              render={<Button size="icon" variant="ghost" />}
            >
              <XMarkIcon />
            </AlertDialogClose>
            <AlertDialogTitle>{t("Perubahan belum disimpan")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Ada perubahan yang belum disimpan. Simpan dulu sebelum meninggalkan halaman ini?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={handleDiscard} type="button" variant="destructive-outline">
              {t("Buang perubahan")}
            </Button>
            <Button loading={saving} onClick={handleSave} type="button">
              {t("Simpan")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChangesGuard({
  isDirty,
  onSave,
  autoSaveOnLeave = false,
}: {
  isDirty: boolean;
  onSave: () => Promise<unknown>;
  autoSaveOnLeave?: boolean;
}): void {
  const context = useContext(UnsavedChangesContext);
  const register = context?.register;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (!register) return;
    if (!isDirty) {
      register(null);
      return;
    }
    register({ isDirty: () => true, save: () => onSaveRef.current(), autoSaveOnLeave });
    return () => register(null);
  }, [register, isDirty, autoSaveOnLeave]);
}

export function useRequestLeave(): (proceed: () => void) => void {
  const context = useContext(UnsavedChangesContext);
  return context?.requestLeave ?? ((proceed: () => void) => proceed());
}
