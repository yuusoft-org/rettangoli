(function () {
  var btn = document.getElementById('mobile-menu-btn');
  var overlay = document.getElementById('mobile-nav-overlay');
  var icon = document.getElementById('mobile-menu-icon');
  var sidebar = document.querySelector('#mobile-nav-overlay rtgl-sidebar');

  if (!btn || !overlay) {
    return;
  }

  function setOpen(open) {
    overlay.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close docs navigation' : 'Open docs navigation');
    document.body.classList.toggle('mobile-nav-open', open);
    if (icon) {
      icon.setAttribute('svg', open ? 'close' : 'menu');
    }
  }

  btn.addEventListener('click', function () {
    setOpen(overlay.hidden);
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
})();
