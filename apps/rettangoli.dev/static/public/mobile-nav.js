(function () {
  var btn = document.getElementById('mobile-menu-btn');
  var overlay = document.getElementById('mobile-nav-overlay');
  var closeBtn = document.getElementById('mobile-nav-close');

  if (btn && overlay) {
    btn.addEventListener('click', function () {
      overlay.style.display = 'flex';
    });
  }
  if (closeBtn && overlay) {
    closeBtn.addEventListener('click', function () {
      overlay.style.display = 'none';
    });
  }
})();
