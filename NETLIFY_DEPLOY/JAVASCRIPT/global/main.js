/* ============================================================
   SMART LOCATION — main.js
   Logique page d'accueil : recherche, animation stats, scroll
   ============================================================ */

(function () {

  /* ── Barre de recherche ── */
  const searchBtn = document.querySelector('.search-btn');
  const searchInput = document.querySelector('.search-field input');
  const searchSelect = document.querySelector('.search-select select');

  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
      const query = searchInput ? searchInput.value.trim() : '';
      const type  = searchSelect ? searchSelect.value : '';
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (type)  params.set('type', type);
      const dest = 'HTML/global/annonces.html' + (params.toString() ? '?' + params.toString() : '');
      window.location.href = dest;
    });
  }

  // Recherche avec la touche Entrée
  if (searchInput) {
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && searchBtn) searchBtn.click();
    });
  }

  /* ── Animation des statistiques (compteur) ── */
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target)) return;
    const duration = 1400;
    const step = 16;
    const increment = target / (duration / step);
    let current = 0;
    const suffix = el.dataset.suffix || '';

    const timer = setInterval(function () {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.floor(current).toLocaleString('fr-FR') + suffix;
    }, step);
  }

  // Observer pour déclencher les compteurs quand ils entrent dans le viewport
  const statEls = document.querySelectorAll('.stat-count');
  if (statEls.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statEls.forEach(function (el) { observer.observe(el); });
  }

  /* ── Lire les statistiques depuis Firestore si disponible ── */
  function fetchStatsFromFirestore() {
    if (typeof db === 'undefined') return;
    // Nombre d'annonces actives
    db.collection('annonces').where('statut', '==', 'active').get()
      .then(function (snap) {
        var annoncesCountEl = document.querySelector('.stat-count[data-target]');
        if (annoncesCountEl) {
          annoncesCountEl.dataset.target = String(snap.size);
        }
      }).catch(function (err) { console.error('Stats annonces:', err); });

    // Nombre de communes (approx): lire 1000 docs et dédupliquer le champ 'commune'
    db.collection('annonces').where('statut','==','active').limit(1000).get()
      .then(function (snap) {
        var communes = {};
        snap.forEach(function (d) { if (d.data().commune) communes[d.data().commune] = true; });
        var communesCount = Object.keys(communes).length;
        var communesEl = document.querySelectorAll('.stat-count')[1];
        if (communesEl) communesEl.dataset.target = String(communesCount);
      }).catch(function (err) { console.error('Stats communes:', err); });
  }

  // Charger les stats dynamiques si Firebase est disponible
  if (typeof db !== 'undefined') fetchStatsFromFirestore();

  /* ── Favoris (placeholder — nécessite Firebase auth) ── */
  document.querySelectorAll('.listing-fav').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      btn.classList.toggle('active');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-regular');
        icon.classList.toggle('fa-solid');
      }
    });
  });

  /* ── Scroll reveal léger sur les cartes ── */
  if ('IntersectionObserver' in window) {
    const cards = document.querySelectorAll('.listing-card, .account-card, .step-card');
    const revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    cards.forEach(function (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      revealObserver.observe(card);
    });
  }

})();
