import { useQuery } from "@tanstack/react-query";
import { AcademicCapIcon, ArrowUpRightIcon, CalendarIcon, DocumentTextIcon, TrophyIcon } from "@heroicons/react/24/outline";
import type { Certificate, Education, EducationContent } from "@portofolio/shared";
import { apiGet } from "@/lib/api";
import { campusLogo } from "@/lib/campus-logo";
import { safeHref } from "@/lib/sanitize";
import { cn, isDocumentFile } from "@/lib/utils";
import { useRef } from "react";
import { ScrollTimeline } from "@/components/public/ScrollTimeline";
import { useRevealOnScroll } from "@/components/public/use-reveal-on-scroll";
import { MediaPlaceholder } from "@/components/public/MediaPlaceholder";
import medal from "@/assets/illustrations/medal.svg";

function EducationMainBlock({ item }: { item: Education }) {
  const logo = item.logo_url ?? campusLogo(item.institution_name);

  return (
    <div className="flex items-start gap-4">
      <div className="size-12 shrink-0 overflow-hidden rounded-md border bg-white">
        <MediaPlaceholder
          className="size-12 object-contain p-1.5"
          icon={AcademicCapIcon}
          rounded="rounded-none"
          src={logo}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-base text-foreground leading-snug sm:text-lg">
          {item.institution_name}
        </h3>
        <p className="text-muted-foreground text-sm">{item.degree_major}</p>
        {item.gpa !== null ? (
          <p className="mt-2 text-muted-foreground text-xs tabular-nums">
            IPK <span className="font-medium text-foreground">{item.gpa}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i;
const PDF_EXT = /\.pdf(\?|#|$)/i;

function CertificatePreview({ src, title }: { src: string; title: string }) {
  if (IMAGE_EXT.test(src)) {
    return (
      <img
        alt={title}
        className="size-full object-cover object-top"
        decoding="async"
        loading="lazy"
        src={src}
      />
    );
  }
  if (PDF_EXT.test(src)) {
    return (
      <iframe
        className="pointer-events-none size-full bg-white"
        loading="lazy"
        src={`${src}#toolbar=0&navpanes=0&view=FitH`}
        tabIndex={-1}
        title={title}
      />
    );
  }
  return (
    <span className="grid size-full place-items-center text-muted-foreground">
      <DocumentTextIcon className="size-8" />
    </span>
  );
}

function AchievementRow({ achievement }: { achievement: Certificate }) {
  const documents = achievement.documents ?? [];
  const file = documents.find(isDocumentFile);
  const link = documents.find((doc) => doc.trim() && !isDocumentFile(doc));

  return (
    <li className="flex items-stretch overflow-hidden rounded-lg border border-border/60 bg-muted/50">
      {file ? (
        <a
          aria-label={`Lihat sertifikat ${achievement.title}`}
          className="block aspect-[4/3] w-28 shrink-0 overflow-hidden bg-muted transition-opacity hover:opacity-90 sm:w-36"
          href={safeHref(file)}
          rel="noreferrer"
          target="_blank"
        >
          <CertificatePreview src={file} title={achievement.title} />
        </a>
      ) : (
        <div className="grid aspect-[4/3] w-28 shrink-0 place-items-center bg-muted text-muted-foreground sm:w-36">
          <TrophyIcon className="size-8" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          {achievement.period ? (
            <p className="mb-1.5 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs tabular-nums">
              <CalendarIcon className="size-3.5" />
              {achievement.period}
            </p>
          ) : null}
          <p className="font-medium text-foreground text-sm">{achievement.title}</p>
          {achievement.organization ? (
            <p className="mt-0.5 text-muted-foreground text-xs">{achievement.organization}</p>
          ) : null}
        </div>
        {link ? (
          <a
            aria-label={`Buka kredensial ${achievement.title}`}
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            href={safeHref(link)}
            rel="noreferrer"
            target="_blank"
          >
            <ArrowUpRightIcon className="size-4" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

function EducationCard({ item }: { item: Education }) {
  return (
    <article className="rounded-xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      <EducationMainBlock item={item} />

      {item.description ? (
        <p className="mt-5 text-justify text-muted-foreground text-sm leading-relaxed">
          {item.description}
        </p>
      ) : null}

      {item.achievements.length > 0 ? (
        <div className="mt-5">
          <ul className="flex flex-col gap-3">
            {item.achievements.map((achievement) => (
              <AchievementRow achievement={achievement} key={achievement.id} />
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function EducationTimeline({ items }: { items: Education[] }) {
  return (
    <section className="relative scroll-mt-[7rem] bg-muted/20">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div>
          <ScrollTimeline
            className="py-16 md:py-28"
            getKey={(item) => item.id}
            items={items}
            renderItem={(item) => <EducationCard item={item} />}
            renderLabel={(item) => `${item.range_date}${item.is_current ? " - Saat Ini" : ""}`}
          />
        </div>
      </div>
    </section>
  );
}

export function EducationSection() {
  const revealRef = useRef<HTMLDivElement>(null);
  useRevealOnScroll(revealRef);
  const { data } = useQuery({
    queryKey: ["educations"],
    queryFn: () => apiGet<EducationContent>("/educations"),
  });

  const header = data?.section_header;
  const items = data?.items ?? [];
  const title = header?.title || "Pendidikan & Pencapaian";
  const description =
    header?.description ||
    "Latar belakang pendidikan formal dan pencapaian sertifikasi kompetensi yang menjadi fondasi perjalanan karier di bidang teknologi.";

  const isEmpty = items.length === 0;

  return (
    <>
      <section
        className={cn(
          "scroll-mt-[7rem] py-16 md:py-24",
          !isEmpty && "bg-muted/40",
        )}
        id="about"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            ref={revealRef}
            className={cn(
              "flex flex-col gap-6",
              isEmpty ? "mx-auto max-w-2xl items-center text-center" : "items-start text-left",
            )}
          >
            <img
              data-reveal="img"
              alt="Medali"
              className="size-36 shrink-0 sm:size-44 md:size-52"
              decoding="async"
              loading="lazy"
              src={header?.illustration_url ?? medal}
            />
            <div className="max-w-2xl">
              {title ? (
                <h2 className="font-bold text-3xl tracking-tight sm:text-4xl" data-reveal="title">{title}</h2>
              ) : null}
              {description ? (
                <p className="mt-3 text-muted-foreground" data-reveal="text">{description}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {!isEmpty ? <EducationTimeline items={items} /> : null}
    </>
  );
}