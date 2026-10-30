import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { ApiError, apiSend } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { useRevealOnScroll } from "@/components/public/use-reveal-on-scroll";
import giraffeVR from "@/assets/illustrations/giraffe-vr-headset.webp";

interface FormState {
  name: string;
  email: string;
  message: string;
}

const EMPTY_FORM: FormState = { name: "", email: "", message: "" };

const FIELD_CLASS =
  "border-transparent bg-muted/70 shadow-none has-focus-visible:border-ring dark:bg-muted/70";

function validateForm(form: FormState): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const name = form.name.trim();
  const email = form.email.trim();
  const message = form.message.trim();

  if (name.length < 3) errors.name = ["Nama minimal 3 karakter."];
  else if (name.length > 100) errors.name = ["Nama maksimal 100 karakter."];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ["Format email tidak valid."];
  } else if (email.length > 150) {
    errors.email = ["Email maksimal 150 karakter."];
  }

  if (message.length < 10) errors.message = ["Pesan minimal 10 karakter."];
  else if (message.length > 3000) errors.message = ["Pesan maksimal 3000 karakter."];

  return errors;
}

export function ContactSection() {
  const revealRef = useRef<HTMLDivElement>(null);
  useRevealOnScroll(revealRef);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const mutation = useMutation({
    mutationFn: (payload: FormState) =>
      apiSend<{ id: number; name: string; created_at: string }>("POST", "/contact", payload),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setErrors({});
      toastManager.add({
        title: "Pesan terkirim",
        description: "Terima kasih telah menghubungi saya!",
        type: "success",
      });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.errors) {
        setErrors(error.errors);
      }
      toastManager.add({
        title: "Gagal mengirim pesan",
        description: (error as Error).message,
        type: "error",
      });
    },
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <section className="scroll-mt-[7rem] bg-muted/40 py-16 md:py-28" id="contact">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div
          className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left"
          ref={revealRef}
        >
          <img
            data-reveal="img"
            alt="Jerapah lucu memakai headset realitas virtual"
            className="size-36 shrink-0 sm:size-44 md:size-52 lg:size-60"
            decoding="async"
            loading="lazy"
            src={giraffeVR}
          />
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2 className="font-bold text-3xl tracking-tight sm:text-4xl" data-reveal="title">
              Terbuka untuk Proyek dan Kerja Sama
            </h2>
            <p className="mt-3 text-muted-foreground" data-reveal="text">
              Punya ide, proyek, atau peluang kolaborasi? Kirim pesan dan saya
              akan membalasnya secepat mungkin.
            </p>
          </div>
        </div>

        <Card className="w-full max-w-xl mx-auto">
          <CardPanel>
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                const nextErrors = validateForm(form);
                setErrors(nextErrors);
                if (Object.keys(nextErrors).length > 0) return;
                mutation.mutate(form);
              }}
            >
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="contact-name">
                  Nama
                </label>
                <Input
                  autoComplete="name"
                  className={cn(FIELD_CLASS, errors.name && "border-destructive/60")}
                  id="contact-name"
                  maxLength={100}
                  minLength={3}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Nama lengkap"
                  required
                  value={form.name}
                />
                {errors.name ? (
                  <p className="text-destructive-foreground text-xs">{errors.name[0]}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="contact-email">
                  Email
                </label>
                <Input
                  autoComplete="email"
                  className={cn(FIELD_CLASS, errors.email && "border-destructive/60")}
                  id="contact-email"
                  maxLength={150}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="nama@email.com"
                  required
                  type="email"
                  value={form.email}
                />
                {errors.email ? (
                  <p className="text-destructive-foreground text-xs">{errors.email[0]}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="contact-message">
                  Pesan
                </label>
                <Textarea
                  className={cn(FIELD_CLASS, errors.message && "border-destructive/60")}
                  id="contact-message"
                  maxLength={3000}
                  minLength={10}
                  onChange={(event) => update("message", event.target.value)}
                  placeholder="Tulis pesan Anda di sini…"
                  required
                  rows={5}
                  value={form.message}
                />
                {errors.message ? (
                  <p className="text-destructive-foreground text-xs">{errors.message[0]}</p>
                ) : null}
              </div>

              <Button
                className="w-full border-emerald-900 bg-emerald-900 text-white hover:bg-emerald-800"
                loading={mutation.isPending}
                type="submit"
              >
                <PaperAirplaneIcon />
                Kirim Pesan
              </Button>
            </form>
          </CardPanel>
        </Card>
      </div>
    </section>
  );
}
