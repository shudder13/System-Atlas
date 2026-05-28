import "@testing-library/jest-dom/vitest";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class DOMMatrixReadOnlyStub {
  m22 = 1;
  constructor() {}
}

const globalAny = globalThis as unknown as Record<string, unknown>;

if (typeof globalAny.ResizeObserver === "undefined") {
  globalAny.ResizeObserver = ResizeObserverStub;
}

if (typeof globalAny.DOMMatrixReadOnly === "undefined") {
  globalAny.DOMMatrixReadOnly = DOMMatrixReadOnlyStub;
}

if (typeof Element !== "undefined") {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
}
