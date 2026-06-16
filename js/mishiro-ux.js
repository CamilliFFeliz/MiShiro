const SEARCH_DEBOUNCE_MS = 140;
const VISIBILITY_SELECTOR = [
  ".hero-card",
  ".flow-card",
  ".feature-card",
  ".report-card",
  ".report-chart-card",
  ".inventory-card",
  ".picker-card",
  ".cart-line",
  ".budget-form-card",
  ".budget-picker-card",
  ".cart-card",
  ".client-pdf-options"
].join(",");

let lucideFrameId = 0;
let originalLucideCreateIcons = null;

export function setupMiShiroExperienceLayer() {
  setupBatchedLucideRendering();
  setupDebouncedSearchInputs();
  setupRevealAnimations();
  setupInteractiveFeedback();
  setupAdaptiveHeaderShadow();
  warmUpIdleWork();
}

function setupBatchedLucideRendering() {
  if (!window.lucide || typeof window.lucide.createIcons !== "function" || originalLucideCreateIcons) {
    return;
  }

  originalLucideCreateIcons = window.lucide.createIcons.bind(window.lucide);
  window.lucide.createIcons = (options = {}) => {
    window.cancelAnimationFrame(lucideFrameId);
    lucideFrameId = window.requestAnimationFrame(() => {
      originalLucideCreateIcons(options);
    });
  };

  window.lucide.createIcons();
}

function setupDebouncedSearchInputs() {
  ["#inventorySearchInput", "#budgetSearchInput"].forEach((selector) => {
    const input = document.querySelector(selector);

    if (!input || input.dataset.mishiroDebounced === "true") {
      return;
    }

    input.dataset.mishiroDebounced = "true";
    let debounceId = 0;

    input.addEventListener("input", (event) => {
      if (event.mishiroSynthetic === true) {
        return;
      }

      event.stopImmediatePropagation();
      window.clearTimeout(debounceId);
      input.classList.add("is-searching");
      debounceId = window.setTimeout(() => {
        const syntheticEvent = new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: null
        });
        Object.defineProperty(syntheticEvent, "mishiroSynthetic", { value: true });
        input.dispatchEvent(syntheticEvent);
        input.classList.remove("is-searching");
      }, SEARCH_DEBOUNCE_MS);
    }, { capture: true });
  });
}

function setupRevealAnimations() {
  const observedElements = new WeakSet();

  const revealElement = (element) => {
    if (observedElements.has(element)) {
      return;
    }

    observedElements.add(element);
    element.classList.add("mishiro-reveal");
  };

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -8% 0px" })
    : null;

  const observeCurrentElements = () => {
    document.querySelectorAll(VISIBILITY_SELECTOR).forEach((element) => {
      revealElement(element);

      if (observer) {
        observer.observe(element);
      } else {
        element.classList.add("is-visible");
      }
    });
  };

  observeCurrentElements();

  const mutationObserver = new MutationObserver(() => {
    window.requestAnimationFrame(observeCurrentElements);
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function setupInteractiveFeedback() {
  document.addEventListener("pointerdown", (event) => {
    const interactiveElement = event.target.closest("button, .inventory-card, .picker-card, .cart-line, .feature-card, .report-card");

    if (!interactiveElement) {
      return;
    }

    const rect = interactiveElement.getBoundingClientRect();
    interactiveElement.style.setProperty("--press-x", `${event.clientX - rect.left}px`);
    interactiveElement.style.setProperty("--press-y", `${event.clientY - rect.top}px`);
    interactiveElement.classList.add("is-pressing");

    window.setTimeout(() => {
      interactiveElement.classList.remove("is-pressing");
    }, 360);
  }, { passive: true });
}

function setupAdaptiveHeaderShadow() {
  const topbar = document.querySelector(".topbar");

  if (!topbar) {
    return;
  }

  const updateShadow = () => {
    topbar.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateShadow();
  window.addEventListener("scroll", updateShadow, { passive: true });
}

function warmUpIdleWork() {
  const runWhenIdle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 240));
  runWhenIdle(() => {
    document.fonts?.ready?.catch(() => {});

    if (window.html2pdf) {
      void window.html2pdf;
    }
  });
}
