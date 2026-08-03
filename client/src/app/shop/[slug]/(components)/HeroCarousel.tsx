"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type HeroCarouselProps = {
  images: string[];
  fallbackStyle?: React.CSSProperties;
  intervalMs?: number;
  children: React.ReactNode;
};

export default function HeroCarousel({
  images,
  fallbackStyle,
  intervalMs = 5500,
  children,
}: HeroCarouselProps) {
  const slides = images.filter(Boolean);
  const [active, setActive] = useState(0);
  const count = slides.length;

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      setActive(((index % count) + count) % count);
    },
    [count],
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setInterval(next, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, next, intervalMs]);

  return (
    <section className="sf-hero">
      <div className="sf-hero-carousel" aria-hidden={count === 0}>
        {count > 0 ? (
          slides.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className={`sf-hero-slide${index === active ? " is-active" : ""}`}
              style={{ backgroundImage: `url(${url})` }}
            />
          ))
        ) : (
          <div className="sf-hero-slide is-active" style={fallbackStyle} />
        )}
      </div>

      <div className="sf-hero-overlay" />

      {count > 1 && (
        <>
          <button
            type="button"
            className="sf-hero-nav sf-hero-nav-prev"
            onClick={prev}
            aria-label="Previous banner"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            className="sf-hero-nav sf-hero-nav-next"
            onClick={next}
            aria-label="Next banner"
          >
            <ChevronRight size={22} />
          </button>
          <div className="sf-hero-dots" role="tablist" aria-label="Hero banners">
            {slides.map((url, index) => (
              <button
                key={`dot-${url}-${index}`}
                type="button"
                role="tab"
                aria-selected={index === active}
                aria-label={`Banner ${index + 1}`}
                className={`sf-hero-dot${index === active ? " is-active" : ""}`}
                onClick={() => goTo(index)}
              />
            ))}
          </div>
        </>
      )}

      <div className="sf-hero-content">{children}</div>
    </section>
  );
}
