/* ============================================================
   SMART LOCATION — navbar.js
   Gestion du menu burger mobile
   ============================================================ */

(function () {
  const burger = document.querySelector('.nav-burger');
  const mobileMenu = document.querySelector('.nav-mobile');

  if (!burger || !mobileMenu) return;

  burger.addEventListener('click', function () {
    const isOpen = mobileMenu.classList.toggle('open');
    // Alterner l'icône burger / croix
    burger.classList.toggle('fa-bars', !isOpen);
    burger.classList.toggle('fa-xmark', isOpen);
  });

  // Fermer le menu quand on clique sur un lien
  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileMenu.classList.remove('open');
      burger.classList.add('fa-bars');
      burger.classList.remove('fa-xmark');
    });
  });

  // Fermer si on clique en dehors
  document.addEventListener('click', function (e) {
    if (!burger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
      burger.classList.add('fa-bars');
      burger.classList.remove('fa-xmark');
    }
  });

  // Fallback for local file testing: convert absolute /HTML/... links to relative paths
  try {
    if (location && location.protocol === 'file:') {
      var allNavLinks = document.querySelectorAll('nav a, .nav-mobile a');
      var pathParts = location.pathname.split('/');
      var htmlIndex = Math.max(pathParts.lastIndexOf('HTML'), pathParts.lastIndexOf('html'));
      if (htmlIndex !== -1) {
        var depth = Math.max(0, pathParts.length - htmlIndex - 2); // number of folders under HTML
        allNavLinks.forEach(function (a) {
          try {
            var href = a.getAttribute('href') || '';
            if (href.indexOf('/HTML/') === 0 || href.indexOf('/html/') === 0) {
              // convert '/HTML/global/mes-comptes.html' -> '../'.repeat(depth) + 'global/mes-comptes.html'
              var target = href.replace(/^\/HTML\//i, '');
              var rel = (depth > 0 ? new Array(depth + 1).join('../') : './') + target;
              a.setAttribute('href', rel);
            }
          } catch (e) {}
        });
      }
    }
  } catch (e) {}
})();
