"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";

import { prefersReducedMotion } from "@/lib/gsap/reveal";

type HomeHeroProps = {
  title: string;
  description: string;
};

export function HomeHero({ title, description }: HomeHeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const words = title.split(" ");

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const wordElements = root.querySelectorAll<HTMLElement>("[data-hero-word]");
    const descriptionElement = root.querySelector<HTMLElement>("[data-hero-desc]");

    if (!wordElements.length || !descriptionElement) return;

    if (prefersReducedMotion()) {
      gsap.set([wordElements, descriptionElement], {
        autoAlpha: 1,
        y: 0,
        filter: "blur(0px)",
      });
      return;
    }

    gsap.set(wordElements, { autoAlpha: 0, y: -28, filter: "blur(6px)" });
    gsap.set(descriptionElement, { autoAlpha: 0, y: -20, filter: "blur(4px)" });

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline();

      timeline.to(wordElements, {
        autoAlpha: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
      });

      timeline.to(
        descriptionElement,
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.55,
          ease: "power2.out",
        },
        "-=0.25",
      );
    }, root);

    return () => ctx.revert();
  }, [title, description]);

  return (
    <section ref={rootRef}>
      <h1 className="page-title">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} className="inline-block">
            <span data-hero-word className="inline-block">
              {word}
            </span>
            {index < words.length - 1 ? "\u00A0" : null}
          </span>
        ))}
      </h1>
      <p data-hero-desc className="mt-3 text-sm text-secondary">
        {description}
      </p>
    </section>
  );
}
