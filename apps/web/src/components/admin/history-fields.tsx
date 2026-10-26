import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  selectTriggerIconClassName,
  selectTriggerVariants,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language";

const MONTHS = [
  { value: "Januari", abbr: "Jan" },
  { value: "Februari", abbr: "Feb" },
  { value: "Maret", abbr: "Mar" },
  { value: "April", abbr: "Apr" },
  { value: "Mei", abbr: "Mei" },
  { value: "Juni", abbr: "Jun" },
  { value: "Juli", abbr: "Jul" },
  { value: "Agustus", abbr: "Agu" },
  { value: "September", abbr: "Sep" },
  { value: "Oktober", abbr: "Okt" },
  { value: "November", abbr: "Nov" },
  { value: "Desember", abbr: "Des" },
];

const MIN_YEAR = 1970;
const MAX_YEAR = new Date().getFullYear() + 20;

function parseMonthYear(text: string): { month: string; year: string } {
  const value = text.trim();
  const yearMatch = value.match(/\d{4}/);
  const month =
    MONTHS.find((item) => value.toLowerCase().includes(item.value.toLowerCase()))
      ?.value ??
    MONTHS.find((item) => value.toLowerCase().includes(item.abbr.toLowerCase()))
      ?.value ??
    "";
  return { month, year: yearMatch ? yearMatch[0] : "" };
}

function composeMonthYear(month: string, year: string): string {
  const abbr = month
    ? (MONTHS.find((item) => item.value === month)?.abbr ?? month)
    : "";
  if (abbr && year) return `${abbr} ${year}`;
  return year || abbr || "";
}

const pickerNavButtonClassName =
  "grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0";

export function MonthYearPicker({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"month" | "year">("month");
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const { month, year } = parseMonthYear(value);
  const isDesktop = useMediaQuery("lg");

  function handleOpenChange(next: boolean) {
    if (next) {
      const { year: selectedYear } = parseMonthYear(value);
      setViewYear(
        selectedYear ? Number(selectedYear) : new Date().getFullYear(),
      );
      setView("month");
    }
    setOpen(next);
  }

  function selectMonth(m: string) {
    onChange(composeMonthYear(m, String(viewYear)));
    setOpen(false);
  }

  function clear() {
    onChange("");
  }

  const yearStart = Math.floor((viewYear - 1) / 12) * 12 + 1;
  const yearRange = Array.from({ length: 12 }, (_, i) => yearStart + i);

  const trigger = (
    <button
      className={cn(
        selectTriggerVariants({ size: "sm" }),
        "min-w-0",
        className,
      )}
      type="button"
    >
      <span className="min-w-0 flex-1 truncate text-left">
        {value ? (
          value
        ) : (
          <span className="text-muted-foreground/72">{placeholder ?? t("Pilih bulan & tahun")}</span>
        )}
      </span>
      <ChevronUpDownIcon className={selectTriggerIconClassName} />
    </button>
  );

  const pickerBody = (
    <>
      {view === "month" ? (
        <>
          <div className="flex items-center justify-between">
            <button
              aria-label={t("Tahun sebelumnya")}
              className={pickerNavButtonClassName}
              disabled={viewYear <= MIN_YEAR}
              onClick={() => setViewYear((y) => Math.max(MIN_YEAR, y - 1))}
              type="button"
            >
              <ChevronLeftIcon />
            </button>
            <button
              aria-label={t("Pilih tahun")}
              className="min-w-16 rounded-md px-2 py-1 text-center text-sm font-medium hover:bg-accent"
              onClick={() => setView("year")}
              type="button"
            >
              {viewYear}
            </button>
            <button
              aria-label={t("Tahun berikutnya")}
              className={pickerNavButtonClassName}
              disabled={viewYear >= MAX_YEAR}
              onClick={() => setViewYear((y) => Math.min(MAX_YEAR, y + 1))}
              type="button"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((m) => {
              const selected = m.value === month && year === String(viewYear);
              return (
                <button
                  className={cn(
                    "rounded-md px-2 py-2 text-sm transition-colors",
                    selected
                      ? "bg-primary font-medium text-primary-foreground"
                      : "hover:bg-accent",
                  )}
                  key={m.value}
                  onClick={() => selectMonth(m.value)}
                  type="button"
                >
                  {t(m.abbr)}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <button
              aria-label={t("Sebelumnya")}
              className={pickerNavButtonClassName}
              disabled={yearStart <= MIN_YEAR}
              onClick={() => setViewYear(Math.max(MIN_YEAR, yearStart - 1))}
              type="button"
            >
              <ChevronLeftIcon />
            </button>
            <span className="min-w-16 rounded-md px-2 py-1 text-center text-sm font-medium">
              {yearStart}–{Math.min(MAX_YEAR, yearStart + 11)}
            </span>
            <button
              aria-label={t("Berikutnya")}
              className={pickerNavButtonClassName}
              disabled={yearStart + 12 > MAX_YEAR}
              onClick={() => setViewYear(Math.min(MAX_YEAR, yearStart + 12))}
              type="button"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {yearRange.map((y) => {
              const selected = y === Number(year);
              return (
                <button
                  className={cn(
                    "rounded-md px-2 py-2 text-sm transition-colors",
                    selected
                      ? "bg-primary font-medium text-primary-foreground"
                      : "hover:bg-accent",
                  )}
                  key={y}
                  onClick={() => {
                    setViewYear(y);
                    setView("month");
                  }}
                  type="button"
                >
                  {y}
                </button>
              );
            })}
          </div>
        </>
      )}

      {(month || year) && (
        <button
          className="w-full pt-1.5 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={clear}
          type="button"
        >
          {t("Hapus pilihan")}
        </button>
      )}
    </>
  );

  const footer = (
    <Button
      className="w-full sm:w-auto"
      onClick={() => setOpen(false)}
      type="button"
    >
      {t("Selesai")}
    </Button>
  );

  if (isDesktop) {
    return (
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogTrigger render={trigger} />
        <DialogPopup className="sm:max-w-xs" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-base">{t("Pilih Bulan & Tahun")}</DialogTitle>
          </DialogHeader>
          <DialogPanel className="space-y-1">{pickerBody}</DialogPanel>
          <DialogFooter>{footer}</DialogFooter>
        </DialogPopup>
      </Dialog>
    );
  }

  return (
    <Drawer onOpenChange={handleOpenChange} open={open} position="bottom">
      <DrawerTrigger render={trigger} />
      <DrawerPopup showCloseButton>
        <DrawerHeader>
          <DrawerTitle className="text-base">{t("Pilih Bulan & Tahun")}</DrawerTitle>
        </DrawerHeader>
        <DrawerPanel className="space-y-1">{pickerBody}</DrawerPanel>
        <DrawerFooter>{footer}</DrawerFooter>
      </DrawerPopup>
    </Drawer>
  );
}

export function MonthYearRange({
  value,
  onChange,
  hideEnd = false,
  endLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  hideEnd?: boolean;
  endLabel?: string;
}) {
  const [sides, setSides] = useState<[string, string]>(() => {
    const [startText = "", endText = ""] = value.split(/\s*-\s*/);
    return [startText, endText];
  });
  const lastEmitted = useRef(value);
  const { t } = useLanguage();

  useEffect(() => {
    if (value !== lastEmitted.current) {
      const [startText = "", endText = ""] = value.split(/\s*-\s*/);
      setSides([startText, endText]);
      lastEmitted.current = value;
    }
  }, [value]);

  const start = parseMonthYear(sides[0]);
  const end = parseMonthYear(sides[1]);

  function update(side: "start" | "end", sideValue: string) {
    const nextStart = side === "start" ? sideValue : sides[0];
    const nextEnd = side === "end" ? sideValue : sides[1];
    const endValue = hideEnd ? "" : nextEnd;
    setSides([nextStart, endValue]);
    const serialized =
      nextStart && endValue ? `${nextStart} - ${endValue}` : nextStart || endValue || "";
    lastEmitted.current = serialized;
    onChange(serialized);
  }

  return (
    <div className="flex items-center gap-2">
      <MonthYearPicker
        className="min-w-0 flex-1"
        onChange={(sideValue) => update("start", sideValue)}
        value={composeMonthYear(start.month, start.year)}
      />
      {hideEnd ? (
        endLabel ? (
          <>
            <span className="shrink-0 text-muted-foreground text-xs">{t("s/d")}</span>
            <span className="inline-flex h-8 shrink-0 items-center rounded-lg border border-dashed px-2 text-xs font-medium text-muted-foreground sm:h-7">
              {endLabel}
            </span>
          </>
        ) : null
      ) : (
        <>
          <span className="shrink-0 text-muted-foreground text-xs">{t("s/d")}</span>
          <MonthYearPicker
            className="min-w-0 flex-1"
            onChange={(sideValue) => update("end", sideValue)}
            value={composeMonthYear(end.month, end.year)}
          />
        </>
      )}
    </div>
  );
}

export function MorphHeight({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const element = innerRef.current;
    if (!element) return;
    const update = () => setHeight(element.scrollHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ height }}
    >
      <div className="p-1" ref={innerRef}>{children}</div>
    </div>
  );
}