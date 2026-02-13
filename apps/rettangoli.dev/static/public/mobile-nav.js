(function () {
  var MOBILE_MEDIA_QUERY = '(max-width: 768px)';
  var HIDE_SCROLL_DELTA = 10;
  var SHOW_TOP_OFFSET = 8;

  var navElements = Array.prototype.slice.call(
    document.querySelectorAll('[data-mobile-autohide="true"]')
  );
  var btn = document.getElementById('mobile-menu-btn');
  var overlay = document.getElementById('mobile-nav-overlay');
  var icon = document.getElementById('mobile-menu-icon');
  var sidebar = document.querySelector('#mobile-nav-overlay rtgl-sidebar');

  function isMobileViewport() {
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  }

  function isOverlayOpen() {
    return !!(overlay && !overlay.hasAttribute('hidden'));
  }

  function setNavHidden(hidden) {
    var transformValue = hidden ? 'translateY(calc(-100% - 1px))' : 'translateY(0)';
    for (var i = 0; i < navElements.length; i += 1) {
      navElements[i].style.transform = transformValue;
      navElements[i].setAttribute('data-mobile-hidden', hidden ? 'true' : 'false');
    }
  }

  function showNavbar() {
    setNavHidden(false);
  }

  var refreshAutoHide = function () {};

  if (navElements.length > 0) {
    var lastY = Math.max(window.scrollY || window.pageYOffset || 0, 0);
    var ticking = false;

    for (var n = 0; n < navElements.length; n += 1) {
      navElements[n].style.transition = 'transform 180ms ease';
      navElements[n].style.willChange = 'transform';
    }

    refreshAutoHide = function () {
      var currentY = Math.max(window.scrollY || window.pageYOffset || 0, 0);

      if (!isMobileViewport()) {
        showNavbar();
        lastY = currentY;
        return;
      }

      if (isOverlayOpen()) {
        showNavbar();
        lastY = currentY;
        return;
      }

      if (currentY <= SHOW_TOP_OFFSET) {
        showNavbar();
        lastY = currentY;
        return;
      }

      var delta = currentY - lastY;
      if (Math.abs(delta) < HIDE_SCROLL_DELTA) {
        return;
      }

      if (delta > 0) {
        setNavHidden(true);
      } else {
        showNavbar();
      }
      lastY = currentY;
    };

    window.addEventListener('scroll', function () {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(function () {
        refreshAutoHide();
        ticking = false;
      });
    }, { passive: true });

    window.addEventListener('resize', function () {
      refreshAutoHide();
    }, { passive: true });

    refreshAutoHide();
  }

  function setOpen(open) {
    if (!btn || !overlay) {
      return;
    }
    if (open) {
      overlay.removeAttribute('hidden');
      showNavbar();
    } else {
      overlay.setAttribute('hidden', '');
    }

    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close docs navigation' : 'Open docs navigation');
    if (icon) {
      icon.setAttribute('svg', open ? 'close' : 'menu');
    }

    refreshAutoHide();
  }

  if (btn && overlay) {
    btn.addEventListener('click', function () {
      setOpen(overlay.hasAttribute('hidden'));
    });

    if (sidebar) {
      sidebar.addEventListener('item-click', function () {
        setOpen(false);
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    });

    window.addEventListener('resize', function () {
      if (window.matchMedia('(min-width: 769px)').matches) {
        setOpen(false);
      }
    }, { passive: true });
  }
})();
