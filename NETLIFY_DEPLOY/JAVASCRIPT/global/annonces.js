/* ============================================================
   SMART LOCATION — annonces.js
   Rôle : lecture des annonces depuis Firestore
   - Chargement des annonces actives
   - Filtrage par commune, type, prix
   - Tri et pagination
   - Favoris en localStorage
   Développé par : Ariel Wise Child & Mr. Google — © 2026
   ============================================================ */

(function () {

  var PER_PAGE    = 6;
  var currentPage = 1;
  var allAnnonces = [];
  var filtered    = [];
  var favoris     = JSON.parse(localStorage.getItem('sl_favoris') || '[]');

  /* ── Elements DOM ── */
  var grid       = document.querySelector('.listings-grid');
  var countEl    = document.querySelector('.results-count');
  var pagination = document.querySelector('.pagination');
  var inputSearch = document.querySelector('.filter-search input');
  var selCommune  = document.querySelector('select[name="commune"]');
  var selType     = document.querySelector('select[name="type"]');
  var selPrix     = document.querySelector('select[name="prix"]');
  var selTri      = document.querySelector('select[name="tri"]');
  var btnApply    = document.querySelector('.btn-filter-apply');
  var btnReset    = document.querySelector('.btn-filter-reset');

  /* ══════════════════════════════════════
     1. CHARGER LES ANNONCES DEPUIS FIRESTORE
  ══════════════════════════════════════ */
  function loadAnnonces() {
    if (!grid) return;

    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--gray);">' +
      '<i class="fa-solid fa-circle-notch fa-spin" style="font-size:1.5rem;margin-bottom:12px;display:block;"></i>' +
      'Chargement des annonces...' +
      '</div>';

    // Charger les annonces soumises par les utilisateurs (afficher même si non vérifiées)
    db.collection('annonces')
      .where('statut', '==', 'active')
      .orderBy('createdAt', 'desc')
      .get()
      .then(function (snapshot) {
        allAnnonces = [];
        snapshot.forEach(function (doc) {
          var data = doc.data();
          data.id  = doc.id;
          allAnnonces.push(data);
        });

        /* Lire les paramètres URL (depuis la recherche hero) */
        var params = new URLSearchParams(window.location.search);
        if (inputSearch && params.get('q'))       inputSearch.value  = params.get('q');
        if (selType     && params.get('type'))     selType.value      = params.get('type');
        if (selCommune  && params.get('commune'))  selCommune.value   = params.get('commune');

        applyFilters();
      })
      .catch(function (err) {
        console.error('Chargement annonces:', err);
        grid.innerHTML =
          '<div class="listings-empty" style="grid-column:1/-1">' +
          '<i class="fa-solid fa-triangle-exclamation"></i>' +
          '<h3>Erreur de chargement</h3>' +
          '<p>Impossible de charger les annonces. Verifiez votre connexion.</p>' +
          '</div>';
      });
  }

  /* ══════════════════════════════════════
     2. FILTRER
  ══════════════════════════════════════ */
  function applyFilters() {
    var q       = inputSearch ? inputSearch.value.trim().toLowerCase() : '';
    var commune = selCommune  ? selCommune.value  : '';
    var type    = selType     ? selType.value     : '';
    var prix    = selPrix     ? selPrix.value     : '';
    var tri     = selTri      ? selTri.value      : '';

    filtered = allAnnonces.filter(function (a) {
      if (q && !(
        (a.titre   || '').toLowerCase().includes(q) ||
        (a.commune || '').toLowerCase().includes(q) ||
        (a.quartier|| '').toLowerCase().includes(q)
      )) return false;
      if (commune && a.commune !== commune) return false;
      if (type    && a.type    !== type)    return false;
      if (prix) {
        var parts = prix.split('-');
        if (parts.length === 2) {
          if (a.prix < parseInt(parts[0]) || a.prix > parseInt(parts[1])) return false;
        } else if (prix.endsWith('+')) {
          if (a.prix < parseInt(prix)) return false;
        }
      }
      return true;
    });

    if (tri === 'prix-asc')  filtered.sort(function (a, b) { return a.prix - b.prix; });
    if (tri === 'prix-desc') filtered.sort(function (a, b) { return b.prix - a.prix; });

    currentPage = 1;
    render();
  }

  /* ══════════════════════════════════════
     3. AFFICHER LES CARTES
  ══════════════════════════════════════ */
  function render() {
    if (!grid) return;
    grid.innerHTML = '';

    if (countEl) {
      countEl.innerHTML =
        '<strong>' + filtered.length + '</strong> annonce' +
        (filtered.length !== 1 ? 's' : '') + ' trouvee' +
        (filtered.length !== 1 ? 's' : '');
    }

    if (filtered.length === 0) {
      grid.innerHTML =
        '<div class="listings-empty" style="grid-column:1/-1">' +
        '<i class="fa-solid fa-house-circle-xmark"></i>' +
        '<h3>Aucune annonce trouvee</h3>' +
        '<p>Essayez de modifier vos filtres de recherche.</p>' +
        '</div>';
      if (pagination) pagination.innerHTML = '';
      return;
    }

    var start = (currentPage - 1) * PER_PAGE;
    var page  = filtered.slice(start, start + PER_PAGE);

    page.forEach(function (a) {
      var isFav  = favoris.includes(a.id);
      var photo  = (a.photos && a.photos.length > 0)
        ? '<img src="' + a.photos[0] + '" alt="' + (a.titre || '') + '"/>'
        : '<div class="listing-img-placeholder"><i class="fa-solid fa-house"></i></div>';
      var badge  = a.verifie
        ? '<span class="listing-badge verified">Verifié</span>'
        : '<span class="listing-badge unverified">Non vérifiée</span>';

      var card = document.createElement('div');
      card.className = 'listing-card';
      card.innerHTML =
        '<div class="listing-img">' +
          photo + badge +
          '<button class="listing-fav' + (isFav ? ' active' : '') + '" data-id="' + a.id + '" title="Sauvegarder">' +
            '<i class="fa-' + (isFav ? 'solid' : 'regular') + ' fa-heart"></i>' +
          '</button>' +
        '</div>' +
        '<div class="listing-body">' +
          '<div class="listing-price">' + (a.prix || '--') + ' $ <span>/ mois</span></div>' +
          '<div class="listing-title">' + (a.titre || '') + '</div>' +
          '<div class="listing-location"><i class="fa-solid fa-location-dot"></i> ' + (a.commune || '') + ', ' + (a.quartier || '') + '</div>' +
          '<div class="listing-meta">' +
            '<div class="meta-item"><i class="fa-solid fa-bed"></i> ' + (a.chambres || '--') + ' ch.</div>' +
            '<div class="meta-item"><i class="fa-solid fa-bath"></i> ' + (a.sdb || '--') + ' SDB</div>' +
          '</div>' +
        '</div>';

      card.querySelector('.listing-fav').addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFavori(a.id, this);
      });

      grid.appendChild(card);
    });

    renderPagination();
  }

  /* ══════════════════════════════════════
     4. PAGINATION
  ══════════════════════════════════════ */
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
      if (!disabled) {
        btn.addEventListener('click', function () {
          currentPage = page;
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
      return btn;
    }

    pagination.appendChild(makeBtn('<i class="fa-solid fa-chevron-left"></i>', currentPage - 1, currentPage === 1, false));
    for (var i = 1; i <= total; i++) {
      pagination.appendChild(makeBtn(i, i, false, i === currentPage));
    }
    pagination.appendChild(makeBtn('<i class="fa-solid fa-chevron-right"></i>', currentPage + 1, currentPage === total, false));
  }

  /* ══════════════════════════════════════
     5. FAVORIS
  ══════════════════════════════════════ */
  function toggleFavori(id, btn) {
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

  /* ══════════════════════════════════════
     6. EVENEMENTS
  ══════════════════════════════════════ */
  if (btnApply) btnApply.addEventListener('click', applyFilters);

  if (btnReset) btnReset.addEventListener('click', function () {
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

  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */
  if (grid) loadAnnonces();

})();
