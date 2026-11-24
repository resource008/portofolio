import { Link } from "react-router-dom";
import notFoundIllustration from "@/assets/illustrations/not-found-404.svg";
import { useLanguage } from "@/lib/language";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function NotFoundPage({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="grid min-h-svh grid-rows-[1fr_auto] place-items-center bg-background p-4">
      <Empty>
        <EmptyHeader>
          <img
            alt={t("Ilustrasi kipas meja dengan tulisan 404")}
            className="mb-4 w-full max-w-xs sm:max-w-sm"
            decoding="async"
            src={notFoundIllustration}
          />
          <EmptyTitle>{title ?? t("Halaman tidak ditemukan")}</EmptyTitle>
          <EmptyDescription>
            {description ?? t("Halaman yang kamu cari tidak tersedia atau sudah dipindahkan.")}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/" />}>{t("Kembali ke Beranda")}</Button>
        </EmptyContent>
      </Empty>

      <p className="self-end text-center text-muted-foreground text-xs">
        {t("Ilustrasi oleh")}{" "}
        <a className="underline underline-offset-2 hover:text-foreground" href="https://lottiefiles.com/animoox" rel="noopener noreferrer" target="_blank">
          Abdul Latif
        </a>{" "}
        via LottieFiles
      </p>
    </div>
  );
}
