import "@testing-library/jest-dom/vitest";

process.env.LOCAL_CONTENT_PATH = "tests/fixtures/posts";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    // jsdom에서 등장 애니메이션 때문에 콘텐츠가 숨겨지지 않도록 한다.
    matches: query === "(prefers-reduced-motion: reduce)",
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

Object.defineProperty(HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: () => Promise.resolve(),
});

Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  configurable: true,
  value: () => {},
});

class MockAudio {
  loop = false;
  preload = "auto";
  volume = 1;
  currentTime = 0;
  paused = true;

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

Object.defineProperty(window, "Audio", {
  writable: true,
  value: MockAudio,
});
