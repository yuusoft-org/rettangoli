(function () {
  var STORAGE_PREFIX = 'rtgl:docs-sidebar:';
  var DESKTOP_VISIBILITY_PROPERTY = '--rtgl-docs-sidebar-desktop-visibility';
  var initScope = document.currentScript
    && document.currentScript.getAttribute('data-docs-sidebar-restore-scope');

  if (initScope) {
    try {
      var initKey = STORAGE_PREFIX + initScope + ':desktop';
      if (window.sessionStorage.getItem(initKey) !== null) {
        document.documentElement.style.setProperty(
          DESKTOP_VISIBILITY_PROPERTY,
          'hidden'
        );
        window.setTimeout(function () {
          document.documentElement.style.removeProperty(
            DESKTOP_VISIBILITY_PROPERTY
          );
        }, 1000);
      }
    } catch (_error) {
      // sessionStorage can be unavailable in privacy-restricted contexts.
    }
    return;
  }

  var sidebars = Array.prototype.slice.call(
    document.querySelectorAll('rtgl-sidebar[data-docs-sidebar]')
  );
  var activeSidebars = new WeakSet();
  var mobileMenuButton = document.getElementById('mobile-menu-btn');
  var mobileOverlay = document.getElementById('mobile-nav-overlay');

  if (sidebars.length === 0) {
    return;
  }

  function storageKey(sidebar) {
    var scope = sidebar.getAttribute('data-docs-sidebar-scope') || 'default';
    var instance = sidebar.getAttribute('data-docs-sidebar') || 'default';
    return STORAGE_PREFIX + scope + ':' + instance;
  }

  function readPosition(sidebar) {
    try {
      var storedTop = window.sessionStorage.getItem(storageKey(sidebar));
      if (storedTop === null) {
        return null;
      }

      var top = Number(storedTop);
      return Number.isFinite(top) ? top : null;
    } catch (_error) {
      return null;
    }
  }

  function savePosition(sidebar) {
    if (!activeSidebars.has(sidebar)
      || typeof sidebar.getScrollPosition !== 'function') {
      return;
    }

    if (mobileOverlay
      && mobileOverlay.hasAttribute('hidden')
      && mobileOverlay.contains(sidebar)) {
      return;
    }

    try {
      var position = sidebar.getScrollPosition();
      var top = Number(position && position.top);

      if (Number.isFinite(top)) {
        window.sessionStorage.setItem(storageKey(sidebar), String(top));
      }
    } catch (_error) {
      // sessionStorage can be unavailable in privacy-restricted contexts.
    }
  }

  function restorePosition(sidebar) {
    activeSidebars.add(sidebar);
    var top = readPosition(sidebar);

    if (top !== null && typeof sidebar.setScrollPosition === 'function') {
      sidebar.setScrollPosition({ top: top });
    }

    if (sidebar.getAttribute('data-docs-sidebar') === 'desktop') {
      document.documentElement.style.removeProperty(
        DESKTOP_VISIBILITY_PROPERTY
      );
    }
  }

  customElements.whenDefined('rtgl-sidebar').then(function () {
    sidebars.forEach(function (sidebar) {
      if (sidebar.getAttribute('data-docs-sidebar') !== 'mobile') {
        restorePosition(sidebar);
      }
      sidebar.addEventListener('item-click', function () {
        savePosition(sidebar);
      }, true);
    });

    if (mobileMenuButton && mobileOverlay) {
      mobileMenuButton.addEventListener('click', function () {
        if (mobileOverlay.hasAttribute('hidden')) {
          return;
        }

        sidebars
          .filter(function (sidebar) {
            return sidebar.getAttribute('data-docs-sidebar') === 'mobile';
          })
          .forEach(savePosition);
      }, true);

      mobileMenuButton.addEventListener('click', function () {
        if (mobileOverlay.hasAttribute('hidden')) {
          return;
        }

        sidebars
          .filter(function (sidebar) {
            return sidebar.getAttribute('data-docs-sidebar') === 'mobile';
          })
          .forEach(restorePosition);
      });
    }
  });

  window.addEventListener('pagehide', function () {
    sidebars.forEach(savePosition);
  });
})();
