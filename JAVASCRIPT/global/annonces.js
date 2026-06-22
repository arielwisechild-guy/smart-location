/* ============================================================
   SMART LOCATION — annonces.js
   Rôle : logique de la page annonces.html
   - Lecture des paramètres URL (depuis la recherche hero)
   - Filtrage des annonces par commune / type / prix
   - Tri (prix croissant/décroissant, récence)
   - Pagination
   - Favoris (toggle local)
   ============================================================ */

(function () {

  /* ══════════════════════════════════════
     DONNEES: lire depuis Firestore
     La logique de filtrage/affichage reste inchangée.
  ══════════════════════════════════════ */
  var ANNONCES = [];

  function fetchAnnoncesFromFirestore() {
    // Récupère uniquement les annonces actives (statut = 'active')
    db.collection('annonces')
      .where('statut', '==', 'active')
      .orderBy('createdAt', 'desc')
      .get()
      .then(function (snapshot) {
        ANNONCES = snapshot.docs.map(function (doc) {
          var d = doc.data();
          d.id = doc.id; // garder l'ID pour les favoris / navigation
          return d;
        });
        applyFilters();
      })
      .catch(function (err) {
        console.error('Erreur lecture annonces Firestore:', err);
        // fallback: laisser ANNONCES vide et appliquer filtres
        ANNONCES = [];
        applyFilters();
      });
  }

  var PER_PAGE    = 6;
  var currentPage = 1;
  var filtered    = [];
  var favoris     = (JSON.parse(localStorage.getItem('sl_favoris') || '[]') || []).map(String);

  /* ── Elements DOM ── */
  var grid         = document.querySelector('.listings-grid');
  var countEl      = document.querySelector('.results-count');
  var pagination   = document.querySelector('.pagination');
  var inputSearch  = document.querySelector('.filter-search input');
  var selCommune   = document.querySelector('select[name="commune"]');
  var selType      = document.querySelector('select[name="type"]');
  var selPrix      = document.querySelector('select[name="prix"]');
  var selTri       = document.querySelector('select[name="tri"]');
  var btnApply     = document.querySelector('.btn-filter-apply');
  var btnReset     = document.querySelector('.btn-filter-reset');

  /* ── Lire les paramètres URL ── */
  function readURL() {
    var params = new URLSearchParams(window.location.search);
    if (inputSearch && params.get('q'))    inputSearch.value   = params.get('q');
    if (selType     && params.get('type')) selType.value       = params.get('type');
    if (selCommune  && params.get('commune')) selCommune.value = params.get('commune');
  }

  /* ── Filtrer ── */
  function applyFilters() {
    var q       = inputSearch  ? inputSearch.value.trim().toLowerCase() : '';
    var commune = selCommune   ? selCommune.value   : '';
    var type    = selType      ? selType.value      : '';
    var prix    = selPrix      ? selPrix.value      : '';
    var tri     = selTri       ? selTri.value       : '';

    filtered = ANNONCES.filter(function (a) {
      if (q && !(a.titre.toLowerCase().includes(q) || a.commune.toLowerCase().includes(q) || a.quartier.toLowerCase().includes(q))) return false;
      if (commune && a.commune !== commune) return false;
      if (type    && a.type    !== type)    return false;
      if (prix) {
        var parts = prix.split('-');
        if (parts.length === 2) {
          var min = parseInt(parts[0]); var max = parseInt(parts[1]);
          if (a.prix < min || a.prix > max) return false;
        } else if (prix.endsWith('+')) {
          if (a.prix < parseInt(prix)) return false;
        }
      }
      return true;
    });

    // Tri
    if (tri === 'prix-asc')  filtered.sort(function (a, b) { return a.prix - b.prix; });
    if (tri === 'prix-desc') filtered.sort(function (a, b) { return b.prix - a.prix; });
    if (tri === 'recent')    filtered.sort(function (a, b) { return b.nouveau - a.nouveau; });

    currentPage = 1;
    render();
  }

  /* ── Rendre les cartes ── */
  function render() {
    if (!grid) return;
    grid.innerHTML = '';

    if (countEl) {
      countEl.innerHTML = '<strong>' + filtered.length + '</strong> annonce' + (filtered.length !== 1 ? 's' : '') + ' trouvee' + (filtered.length !== 1 ? 's' : '');
    }

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="listings-empty"><i class="fa-solid fa-house-circle-xmark"></i><h3>Aucune annonce trouvee</h3><p>Essayez de modifier vos filtres de recherche.</p></div>';
      if (pagination) pagination.innerHTML = '';
      return;
    }

    var start = (currentPage - 1) * PER_PAGE;
    var page  = filtered.slice(start, start + PER_PAGE);

    page.forEach(function (a) {
      var aid = String(a.id);
      var isFav = favoris.includes(aid);
      var badge = a.verifie
        ? '<span class="listing-badge verified">Verifie</span>'
        : a.nouveau ? '<span class="listing-badge">Nouveau</span>' : '';

      var card = document.createElement('div');
      card.className = 'listing-card';
      card.dataset.id = a.id;
      card.innerHTML =
        '<div class="listing-img">' +
          '<div class="listing-img-placeholder"><i class="fa-solid fa-house"></i></div>' +
          badge +
          '<button class="listing-fav' + (isFav ? ' active' : '') + '" title="Sauvegarder">' +
            '<i class="fa-' + (isFav ? 'solid' : 'regular') + ' fa-heart"></i>' +
          '</button>' +
        '</div>' +
        '<div class="listing-body">' +
          '<div class="listing-price">' + a.prix + ' $ <span>/ mois</span></div>' +
          '<div class="listing-title">' + a.titre + '</div>' +
          '<div class="listing-location"><i class="fa-solid fa-location-dot"></i>' + a.commune + ', ' + a.quartier + '</div>' +
          '<div class="listing-meta">' +
            '<div class="meta-item"><i class="fa-solid fa-bed"></i> ' + a.chambres + ' ch.</div>' +
            '<div class="meta-item"><i class="fa-solid fa-bath"></i> ' + a.sdb + ' SDB</div>' +
            '<div class="meta-item"><i class="fa-solid fa-circle-check"></i> ' + a.extra + '</div>' +
          '</div>' +
        '</div>';

      card.querySelector('.listing-fav').addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFavori(aid, this);
      });

      grid.appendChild(card);
    });

    renderPagination();
  }

  /* ── Pagination ── */
  function renderPagination() {
    if (!pagination) return;
    var total = Math.ceil(filtered.length / PER_PAGE);
    pagination.innerHTML = '';
    if (total <= 1) return;

    function makeBtn(label, page, disabled, active) {
      var btn = document.createElement('button');
      btn.className = 'page-btn' + (active ? ' active' : '');
      btn.innerHTML = label;
      btn.disabled  = disabled;
      if (!disabled) btn.addEventListener('click', function () { currentPage = page; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      return btn;
    }

    pagination.appendChild(makeBtn('<i class="fa-solid fa-chevron-left"></i>', currentPage - 1, currentPage === 1, false));
    for (var i = 1; i <= total; i++) {
      pagination.appendChild(makeBtn(i, i, false, i === currentPage));
    }
    pagination.appendChild(makeBtn('<i class="fa-solid fa-chevron-right"></i>', currentPage + 1, currentPage === total, false));
  }

  /* ── Favoris ── */
  function toggleFavori(id, btn) {
    id = String(id);
    var idx = favoris.indexOf(id);
    if (idx === -1) {
      favoris.push(id);
      btn.classList.add('active');
      btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    } else {
      favoris.splice(idx, 1);
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    }
    localStorage.setItem('sl_favoris', JSON.stringify(favoris));
  }

  /* ── Evenements ── */
  if (btnApply)  btnApply.addEventListener('click', applyFilters);
  if (btnReset)  btnReset.addEventListener('click', function () {
    if (inputSearch) inputSearch.value = '';
    if (selCommune)  selCommune.value  = '';
    if (selType)     selType.value     = '';
    if (selPrix)     selPrix.value     = '';
    if (selTri)      selTri.value      = '';
    applyFilters();
  });
  if (selTri) selTri.addEventListener('change', applyFilters);
  if (inputSearch) {
    inputSearch.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') applyFilters();
    });
  }

  /* ── Init ── */
  readURL();
  applyFilters();

})();
