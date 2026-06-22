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
})();
