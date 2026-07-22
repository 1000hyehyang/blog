import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const REVEAL_Y = -28;
export const REVEAL_DURATION = 0.55;
export const REVEAL_STAGGER = 0.08;
export const REVEAL_EASE = "power2.out";
export const REVEAL_SCROLL_START = "top 88%";

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function resetRevealElements(elements: gsap.TweenTarget) {
  gsap.set(elements, { autoAlpha: 1, y: 0 });
}

export function hideRevealElements(elements: gsap.TweenTarget) {
  gsap.set(elements, { autoAlpha: 0, y: REVEAL_Y });
}

export function revealOnMount(elements: gsap.TweenTarget) {
  hideRevealElements(elements);

  return gsap.to(elements, {
    autoAlpha: 1,
    y: 0,
    duration: REVEAL_DURATION,
    stagger: REVEAL_STAGGER,
    ease: REVEAL_EASE,
  });
}

export function revealOnScroll(
  trigger: Element,
  elements: gsap.TweenTarget,
  options?: { stagger?: number },
) {
  hideRevealElements(elements);

  return gsap.to(elements, {
    autoAlpha: 1,
    y: 0,
    duration: REVEAL_DURATION,
    stagger: options?.stagger ?? REVEAL_STAGGER,
    ease: REVEAL_EASE,
    scrollTrigger: {
      trigger,
      start: REVEAL_SCROLL_START,
      once: true,
    },
  });
}

export function setupCardGridReveal(grid: HTMLElement) {
  const cards = grid.querySelectorAll<HTMLElement>("[data-post-card]");
  if (!cards.length) return;

  if (prefersReducedMotion()) {
    resetRevealElements(cards);
    return;
  }

  revealOnScroll(grid, cards);
}

export function setupDetailPageReveal(root: HTMLElement) {
  if (prefersReducedMotion()) {
    resetRevealElements(
      root.querySelectorAll("[data-reveal], [data-post-card]"),
    );
    return;
  }

  const mountElements = root.querySelectorAll<HTMLElement>("[data-reveal='mount']");
  if (mountElements.length) {
    revealOnMount(mountElements);
  }

  root.querySelectorAll<HTMLElement>("[data-reveal='scroll']").forEach((element) => {
    revealOnScroll(element, element, { stagger: 0 });
  });

  root.querySelectorAll<HTMLElement>("[data-reveal-cards]").forEach((grid) => {
    setupCardGridReveal(grid);
  });
}
