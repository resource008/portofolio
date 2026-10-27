import { Link } from "react-router-dom";
import notFoundIllustration from "@/assets/illustrations/not-found-404.svg";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function NotFoundPage({
  title = "Halaman tidak ditemukan",
  description = "Halaman yang kamu cari tidak tersedia atau sudah dipindahkan.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="grid min-h-svh grid-rows-[1fr_auto] place-items-center bg-background p-4">
      <Empty>
        <EmptyHeader>
          <img
            alt="Ilustrasi kipas meja dengan tulisan 404"
            className="mb-4 w-full max-w-xs sm:max-w-sm"
            decoding="async"
            src={notFoundIllustration}
          />
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>
            {description}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/" />}>Kembali ke Beranda</Button>
        </EmptyContent>
      </Empty>

      <p className="self-end text-center text-muted-foreground text-xs">
        Ilustrasi Oleh{" "}
        <a className="underline underline-offset-2 hover:text-foreground" href="https://lottiefiles.com/animoox" rel="noopener noreferrer" target="_blank">
          Abdul Latif
        </a>{" "}
        Via LottieFiles
      </p>
    </div>
  );
}
