(function () {
  var btn = document.getElementById('mobile-menu-btn');
  var overlay = document.getElementById('mobile-nav-overlay');
  var closeBtn = document.getElementById('mobile-nav-close');

  function setOpen(open) {
    if (!overlay) return;
    if (open) {
      overlay.removeAttribute('hide');
    } else {
      overlay.setAttribute('hide', '');
    }
  }

  if (btn && overlay) {
    btn.addEventListener('click', function () {
      setOpen(true);
    });
  }
  if (closeBtn && overlay) {
    closeBtn.addEventListener('click', function () {
      setOpen(false);
    });
  }
})();
