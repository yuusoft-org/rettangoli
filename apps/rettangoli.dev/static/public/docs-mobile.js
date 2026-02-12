(() => {
  const MOBILE_MAX_WIDTH = 768;
  const SCROLL_DELTA = 8;
  const TOP_THRESHOLD = 16;

  const setupDocsMobileShell = () => {
    const navbar = document.getElementById("docs-mobile-navbar");
    const navbarToggle = document.getElementById("docs-mobile-navbar-toggle");
    const sidebarOverlay = document.getElementById("docs-mobile-sidebar-overlay");
    const sidebar = document.getElementById("docs-mobile-sidebar-nav");
    const contentContainer = document.getElementById("content-container");

    if (!navbar || !navbarToggle || !sidebarOverlay || !sidebar) {
      return;
    }

    const readScrollTop = () => {
      const containerTop = contentContainer ? contentContainer.scrollTop : 0;
      return Math.max(window.scrollY, containerTop);
    };

    const isMobileViewport = () => window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;

    const setNavbarHidden = (hidden) => {
      navbar.classList.toggle("is-hidden", hidden);
    };

    const setSidebarOpen = (open) => {
      const shouldOpen = open && isMobileViewport();
      sidebarOverlay.hidden = !shouldOpen;
      navbarToggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      document.body.classList.toggle("docs-mobile-sidebar-open", shouldOpen);
      if (shouldOpen) {
        setNavbarHidden(false);
      }
    };

    sidebar.addEventListener("item-click", () => {
      setSidebarOpen(false);
    });

    navbarToggle.addEventListener("click", () => {
      setSidebarOpen(sidebarOverlay.hidden);
    });

    sidebarOverlay.addEventListener("click", (event) => {
      if (event.target === sidebarOverlay) {
        setSidebarOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    });

    let lastY = readScrollTop();
    const handleScroll = () => {
      if (!isMobileViewport()) {
        setNavbarHidden(false);
        lastY = readScrollTop();
        return;
      }

      if (!sidebarOverlay.hidden) {
        setNavbarHidden(false);
        lastY = readScrollTop();
        return;
      }

      const currentY = readScrollTop();
      const delta = currentY - lastY;

      if (currentY <= TOP_THRESHOLD || delta <= -SCROLL_DELTA) {
        setNavbarHidden(false);
      } else if (delta >= SCROLL_DELTA) {
        setNavbarHidden(true);
      }

      lastY = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    if (contentContainer) {
      contentContainer.addEventListener("scroll", handleScroll, { passive: true });
    }

    window.addEventListener("resize", () => {
      if (!isMobileViewport()) {
        setSidebarOpen(false);
        setNavbarHidden(false);
      }
    }, { passive: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupDocsMobileShell);
    return;
  }

  setupDocsMobileShell();
})();
