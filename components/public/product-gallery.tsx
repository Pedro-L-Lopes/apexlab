"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Box, ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicProductImage } from "@/lib/queries/public";
import { EASE_DEFAULT } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: PublicProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const touchStartX = React.useRef<number | null>(null);

  const safeIndex =
    images.length > 0 ? Math.min(activeIndex, images.length - 1) : 0;
  const activeImage = images[safeIndex] ?? null;

  const goPrevious = React.useCallback(() => {
    if (images.length <= 1) return;
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = React.useCallback(() => {
    if (images.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX;
    if (typeof endX !== "number") return;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) goPrevious();
    else goNext();
  };

  if (!activeImage) {
    return (
      <div className="relative flex aspect-[4/5] w-full flex-col items-center justify-center overflow-hidden rounded-[26px] border border-line bg-surface shadow-card">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Box className="h-8 w-8" />
        </div>
        <p className="mt-3 text-sm font-medium text-muted">
          Sem imagem cadastrada
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-3 focus:outline-none"
      tabIndex={images.length > 1 ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-label={`Galeria de imagens de ${productName}`}
    >
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-[26px] border border-line bg-surface shadow-card"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeImage.id}
            initial={{ opacity: 0, scale: 1.015 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_DEFAULT }}
            className="relative h-full w-full"
          >
            <Image
              src={activeImage.url}
              alt={`${productName} — imagem ${safeIndex + 1} de ${images.length}`}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority={safeIndex === 0}
            />
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <span className="absolute right-3.5 top-3.5 rounded-full bg-ink-deep/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {safeIndex + 1} / {images.length}
            </span>

            <button
              type="button"
              onClick={goPrevious}
              aria-label="Imagem anterior"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/90 text-ink shadow-sm backdrop-blur-sm transition hover:bg-surface cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={goNext}
              aria-label="Próxima imagem"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/90 text-ink shadow-sm backdrop-blur-sm transition hover:bg-surface cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {images.map((image, index) => {
            const isSelected = index === safeIndex;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ver imagem ${index + 1} de ${productName}`}
                aria-pressed={isSelected}
                className={cn(
                  "relative aspect-square w-16 shrink-0 overflow-hidden rounded-2xl border bg-surface transition cursor-pointer sm:w-20",
                  isSelected
                    ? "border-accent ring-2 ring-accent/25"
                    : "border-line opacity-75 hover:opacity-100"
                )}
              >
                <Image
                  src={image.url}
                  alt={`${productName} — miniatura ${index + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
