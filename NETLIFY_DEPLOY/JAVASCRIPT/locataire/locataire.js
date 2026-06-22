/* ============================================================
   SMART LOCATION — locataire.js
   Rôle : logique des pages locataire
   - Recherche avancée avec filtres
   - Favoris (ajout / suppression / affichage)
   - Appel direct bailleur
   ============================================================ */

(function () {

  /* ══════════════════════════════════════
     DONNEES DE DEMO
     À remplacer par Firebase Firestore
  ══════════════════════════════════════ */
  var ANNONCES = [
    { id: 1, titre: 'Maison 3 chambres avec salon', commune: 'Gombe', quartier: 'Avenue des Aviateurs', type: 'maison', prix: 450, chambres: 3, sdb: 2, verifie: true, tel: '+243812000001' },
    { id: 2, titre: 'Appartement 2 chambres', commune: 'Lingwala', quartier: 'Quartier Socimat', type: 'appartement', prix: 200, chambres: 2, sdb: 1, verifie: false, tel: '+243812000002' },
    { id: 3, titre: 'Studio meuble, eau incluse', commune: 'Kalamu', quartier: 'Avenue Kasa-Vubu', type: 'studio', prix: 120, chambres: 1, sdb: 1, verifie: true, tel: '+243812000003' },
    { id: 4, titre: 'Villa 4 chambres avec jardin', commune: 'Ngaliema', quartier: 'Quartier Binza', type: 'villa', prix: 900, chambres: 4, sdb: 3, verifie: true, tel: '+243812000004' },
    { id: 5, titre: 'Maison 2 chambres', commune: 'Lemba', quartier: 'Quartier 1', type: 'maison', prix: 180, chambres: 2, sdb: 1, verifie: false, tel: '+243812000005' },
    { id: 6, titre: 'Appartement standing', commune: 'Gombe', quartier: 'Boulevard du 30 Juin', type: 'appartement', prix: 650, chambres: 3, sdb: 2, verifie: true, tel: '+243812000006' },
    { id: 7, titre: 'Studio proche marche', commune: 'Kintambo', quartier: 'Marche de Kintambo', type: 'studio', prix: 90, chambres: 1, sdb: 1, verifie: false, tel: '+243812000007' },
    { id: 8, titre: 'Maison spacieuse 4 chambres', commune: 'Limete', quartier: 'Industriel', type: 'maison', prix: 350, chambres: 4, sdb: 2, verifie: true, tel: '+243812000008' },
  ];

  var favoris = JSON.parse(localStorage.getItem('sl_favoris') || '[]');

  /* ══════════════════════════════════════
     1. PAGE RECHERCHE
  ══════════════════════════════════════ */
  var grid       = document.querySelector('.listings-grid');
  var countEl    = document.querySelector('.results-count');
  var btnSearch  = document.querySelector('.btn-search');
  var btnReset   = document.querySelector('.btn-reset');

  function getFilters() {
    return {
      q:       getVal('[name="q"]'),
      commune: getVal('[name="commune"]'),
      type:    getVal('[name="type"]'),
      prixMin: parseInt(getVal('[name="prix_min"]')) || 0,
      prixMax: parseInt(getVal('[name="prix_max"]')) || Infinity,
      chambres:parseInt(getVal('[name="chambres"]')) || 0,
    };
  }

  function getVal(selector) {
    var el = document.querySelector(selector);
    return el ? el.value.trim() : '';
  }

  function filterAnnonces(f) {
    return ANNONCES.filter(function (a) {
      if (f.q && !(a.titre.toLowerCase().includes(f.q.toLowerCase()) || a.commune.toLowerCase().includes(f.q.toLowerCase()))) return false;
      if (f.commune && a.commune !== f.commune) return false;
      if (f.type    && a.type    !== f.type)    return false;
      if (a.prix < f.prixMin || a.prix > f.prixMax) return false;
      if (f.chambres && a.chambres < f.chambres) return false;
      return true;
    });
  }

  function renderGrid(list) {
    if (!grid) return;
    grid.innerHTML = '';

    if (countEl) {
      countEl.innerHTML = '<strong>' + list.length + '</strong> annonce' + (list.length !== 1 ? 's' : '') + ' trouvee' + (list.length !== 1 ? 's' : '');
    }

    if (list.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-house-circle-xmark"></i><h3>Aucun resultat</h3><p>Modifiez vos filtres pour elargir la recherche.</p></div>';
      return;
    }

    list.forEach(function (a) {
      var isFav = favoris.includes(a.id);
      var card  = document.createElement('div');
      card.className = 'listing-card';
      card.innerHTML =
        '<div class="listing-img">' +
          '<div class="listing-img-placeholder"><i class="fa-solid fa-house"></i></div>' +
          (a.verifie ? '<span class="listing-badge verified">Verifie</span>' : '<span class="listing-badge">Disponible</span>') +
          '<button class="listing-fav' + (isFav ? ' active' : '') + '" data-id="' + a.id + '" title="Sauvegarder">' +
            '<i class="fa-' + (isFav ? 'solid' : 'regular') + ' fa-heart"></i>' +
          '</button>' +
        '</div>' +
        '<div class="listing-body">' +
          '<div class="listing-price">' + a.prix + ' $ <span>/ mois</span></div>' +
          '<div class="listing-title">' + a.titre + '</div>' +
          '<div class="listing-location"><i class="fa-solid fa-location-dot"></i> ' + a.commune + ', ' + a.quartier + '</div>' +
          '<div class="listing-meta">' +
            '<div class="meta-item"><i class="fa-solid fa-bed"></i> ' + a.chambres + ' ch.</div>' +
            '<div class="meta-item"><i class="fa-solid fa-bath"></i> ' + a.sdb + ' SDB</div>' +
          '</div>' +
          '<a href="tel:' + a.tel + '" class="btn-call"><i class="fa-solid fa-phone"></i> Appeler le bailleur</a>' +
        '</div>';

      card.querySelector('.listing-fav').addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFavori(a.id, this);
      });

      grid.appendChild(card);
    });
  }

  if (btnSearch) {
    btnSearch.addEventListener('click', function () {
      renderGrid(filterAnnonces(getFilters()));
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', function () {
      document.querySelectorAll('.filter-field input, .filter-field select').forEach(function (el) { el.value = ''; });
      renderGrid(ANNONCES);
    });
  }

  // Init recherche
  if (grid && document.querySelector('.recherche-filters')) {
    renderGrid(ANNONCES);
  }

  /* ══════════════════════════════════════
     2. PAGE FAVORIS
  ══════════════════════════════════════ */
  var favsGrid = document.querySelector('.favoris-grid');

  function renderFavoris() {
    if (!favsGrid) return;
    favsGrid.innerHTML = '';
    var liste = ANNONCES.filter(function (a) { return favoris.includes(a.id); });

    if (liste.length === 0) {
      favsGrid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1">' +
        '<i class="fa-regular fa-heart"></i>' +
        '<h3>Aucun favori sauvegarde</h3>' +
        '<p>Parcourez les annonces et cliquez sur le coeur pour sauvegarder vos coups de coeur.</p>' +
        '<a href="recherche.html" class="btn-call" style="display:inline-flex;width:auto;margin-top:4px;">Voir les annonces</a>' +
        '</div>';
      return;
    }

    liste.forEach(function (a) {
      var card = document.createElement('div');
      card.className = 'listing-card';
      card.innerHTML =
        '<div class="listing-img">' +
          '<div class="listing-img-placeholder"><i class="fa-solid fa-house"></i></div>' +
          (a.verifie ? '<span class="listing-badge verified">Verifie</span>' : '') +
          '<button class="listing-fav active" data-id="' + a.id + '" title="Retirer des favoris">' +
            '<i class="fa-solid fa-heart"></i>' +
          '</button>' +
        '</div>' +
        '<div class="listing-body">' +
          '<div class="listing-price">' + a.prix + ' $ <span>/ mois</span></div>' +
          '<div class="listing-title">' + a.titre + '</div>' +
          '<div class="listing-location"><i class="fa-solid fa-location-dot"></i> ' + a.commune + ', ' + a.quartier + '</div>' +
          '<div class="listing-meta">' +
            '<div class="meta-item"><i class="fa-solid fa-bed"></i> ' + a.chambres + ' ch.</div>' +
            '<div class="meta-item"><i class="fa-solid fa-bath"></i> ' + a.sdb + ' SDB</div>' +
          '</div>' +
          '<a href="tel:' + a.tel + '" class="btn-call"><i class="fa-solid fa-phone"></i> Appeler le bailleur</a>' +
        '</div>';

      card.querySelector('.listing-fav').addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFavori(a.id, this);
        setTimeout(renderFavoris, 300);
      });

      favsGrid.appendChild(card);
    });
  }

  renderFavoris();

  /* ══════════════════════════════════════
     3. TOGGLE FAVORI
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

})();
