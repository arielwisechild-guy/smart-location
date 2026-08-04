/* ============================================================
   SMART LOCATION — locataire.js
   Rôle : logique Firebase des pages locataire
   - Vérification connexion + chargement profil
   - Recherche avancée depuis Firestore
   - Favoris sauvegardés en localStorage
   - Appel direct bailleur
   Développé par : Ariel Wise Child & Mr. Google — © 2026
   ============================================================ */

(function () {

  var favoris = JSON.parse(localStorage.getItem('sl_favoris') || '[]');

  /* ══════════════════════════════════════
     0. VERIFIER LA CONNEXION
  ══════════════════════════════════════ */
  auth.onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href = '../../HTML/Authentification/connexion.html';
      return;
    }

    /* Charger le nom dans la sidebar */
    db.collection('users').doc(user.uid).get().then(function (doc) {
      if (!doc.exists) return;
      var data   = doc.data();
      var nameEl = document.querySelector('.sidebar-user-name');
      if (nameEl) nameEl.textContent = data.prenom + ' ' + data.nom;
    });

    /* Lancer la bonne fonction selon la page */
    var page = window.location.pathname;
    if (page.includes('dashboard'))  initDashboard();
    if (page.includes('recherche'))  initRecherche();
    if (page.includes('favoris'))    initFavoris();
  });

  /* ══════════════════════════════════════
     1. DASHBOARD — annonces récentes
  ══════════════════════════════════════ */
  function initDashboard() {
    var grid = document.querySelector('.listings-grid');
    if (!grid) return;

    db.collection('annonces')
      .where('statut', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get()
      .then(function (snapshot) {
        grid.innerHTML = '';
        snapshot.forEach(function (doc) {
          grid.appendChild(buildCard(doc.id, doc.data()));
        });
      })
      .catch(function (err) { console.error('Dashboard locataire:', err); });
  }

  /* ══════════════════════════════════════
     2. RECHERCHE AVANCEE
  ══════════════════════════════════════ */
  function initRecherche() {
    var grid    = document.querySelector('.listings-grid');
    var countEl = document.querySelector('.results-count');
    var btnSearch = document.querySelector('.btn-search');
    var btnReset  = document.querySelector('.btn-reset');

    /* Charger toutes les annonces actives au démarrage */
    loadAndRender({}, grid, countEl);

    if (btnSearch) {
      btnSearch.addEventListener('click', function () {
        loadAndRender(getFilters(), grid, countEl);
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', function () {
        document.querySelectorAll('.filter-field input, .filter-field select').forEach(function (el) {
          el.value = '';
        });
        loadAndRender({}, grid, countEl);
      });
    }
  }

  function getFilters() {
    return {
      q:        getVal('[name="q"]'),
      commune:  getVal('[name="commune"]'),
      type:     getVal('[name="type"]'),
      prixMin:  parseInt(getVal('[name="prix_min"]')) || 0,
      prixMax:  parseInt(getVal('[name="prix_max"]')) || Infinity,
      chambres: parseInt(getVal('[name="chambres"]')) || 0,
    };
  }

  function getVal(selector) {
    var el = document.querySelector(selector);
    return el ? el.value.trim() : '';
  }

  function loadAndRender(f, grid, countEl) {
    if (!grid) return;
    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);">' +
      '<i class="fa-solid fa-circle-notch fa-spin" style="font-size:1.5rem;display:block;margin-bottom:12px;"></i>' +
      'Recherche en cours...</div>';

    db.collection('annonces')
      .where('statut', '==', 'active')
      .get()
      .then(function (snapshot) {
        var results = [];
        snapshot.forEach(function (doc) {
          var a  = doc.data();
          a.id   = doc.id;

          if (f.commune  && a.commune !== f.commune)  return;
          if (f.type     && a.type    !== f.type)      return;
          if (f.prixMin  && a.prix    <  f.prixMin)    return;
          if (f.prixMax  && a.prix    >  f.prixMax)    return;
          if (f.chambres && parseInt(a.chambres) < f.chambres) return;
          if (f.q && !(
            (a.titre    || '').toLowerCase().includes(f.q.toLowerCase()) ||
            (a.commune  || '').toLowerCase().includes(f.q.toLowerCase()) ||
            (a.quartier || '').toLowerCase().includes(f.q.toLowerCase())
          )) return;

          results.push(a);
        });

        grid.innerHTML = '';

        if (countEl) {
          countEl.innerHTML =
            '<strong>' + results.length + '</strong> annonce' +
            (results.length !== 1 ? 's' : '') + ' trouvee' +
            (results.length !== 1 ? 's' : '');
        }

        if (results.length === 0) {
          grid.innerHTML =
            '<div class="empty-state" style="grid-column:1/-1">' +
            '<i class="fa-solid fa-house-circle-xmark"></i>' +
            '<h3>Aucun resultat</h3>' +
            '<p>Modifiez vos filtres pour elargir la recherche.</p></div>';
          return;
        }

        results.forEach(function (a) {
          grid.appendChild(buildCard(a.id, a));
        });
      })
      .catch(function (err) {
        console.error('Recherche:', err);
        grid.innerHTML =
          '<div class="empty-state" style="grid-column:1/-1">' +
          '<i class="fa-solid fa-triangle-exclamation"></i>' +
          '<h3>Erreur de chargement</h3>' +
          '<p>Verifiez votre connexion et reessayez.</p></div>';
      });
  }

  /* ══════════════════════════════════════
     3. FAVORIS
  ══════════════════════════════════════ */
  function initFavoris() {
    var grid = document.querySelector('.favoris-grid');
    if (!grid || favoris.length === 0) {
      if (grid) grid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1">' +
        '<i class="fa-regular fa-heart"></i>' +
        '<h3>Aucun favori sauvegarde</h3>' +
        '<p>Parcourez les annonces et cliquez sur le coeur pour sauvegarder.</p>' +
        '<a href="recherche.html" class="btn-call" style="display:inline-flex;width:auto;margin-top:4px;">Voir les annonces</a>' +
        '</div>';
      return;
    }

    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);">' +
      '<i class="fa-solid fa-circle-notch fa-spin" style="font-size:1.5rem;display:block;margin-bottom:12px;"></i>' +
      'Chargement...</div>';

    /* Charger chaque favori depuis Firestore */
    var promises = favoris.map(function (id) {
      return db.collection('annonces').doc(id).get();
    });

    Promise.all(promises).then(function (docs) {
      grid.innerHTML = '';
      docs.forEach(function (doc) {
        if (!doc.exists) return;
        var card = buildCard(doc.id, doc.data(), true);
        grid.appendChild(card);
      });

      if (grid.children.length === 0) {
        grid.innerHTML =
          '<div class="empty-state" style="grid-column:1/-1">' +
          '<i class="fa-regular fa-heart"></i>' +
          '<h3>Aucun favori disponible</h3>' +
          '<p>Certaines annonces ont peut-etre ete supprimees.</p></div>';
      }
    }).catch(function (err) { console.error('Favoris:', err); });
  }

  /* ══════════════════════════════════════
     4. CONSTRUCTION D'UNE CARTE
  ══════════════════════════════════════ */
  function buildCard(id, a, isFavPage) {
    var isFav  = favoris.includes(id);
    var photo  = (a.photos && a.photos.length > 0)
      ? '<img src="' + a.photos[0] + '" alt="' + (a.titre || '') + '"/>'
      : '<div class="listing-img-placeholder"><i class="fa-solid fa-house"></i></div>';

    var card = document.createElement('div');
    card.className = 'listing-card';
    card.innerHTML =
      '<div class="listing-img">' +
        photo +
        (a.verifie ? '<span class="listing-badge verified">Verifie</span>' : '<span class="listing-badge">Disponible</span>') +
        '<button class="listing-fav' + (isFav ? ' active' : '') + '" data-id="' + id + '" title="Sauvegarder">' +
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
        '<a href="tel:' + (a.telephone || '') + '" class="btn-call"><i class="fa-solid fa-phone"></i> Appeler le bailleur</a>' +
      '</div>';

    card.querySelector('.listing-fav').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleFavori(id, this, isFavPage ? card : null);
    });

    return card;
  }

  /* ══════════════════════════════════════
     5. TOGGLE FAVORI
  ══════════════════════════════════════ */
  function toggleFavori(id, btn, cardToRemove) {
    var idx = favoris.indexOf(id);
    if (idx === -1) {
      favoris.push(id);
      btn.classList.add('active');
      btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    } else {
      favoris.splice(idx, 1);
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
      if (cardToRemove) {
        cardToRemove.style.opacity = '0';
        cardToRemove.style.transition = 'opacity 0.3s';
        setTimeout(function () { cardToRemove.remove(); }, 300);
      }
    }
    localStorage.setItem('sl_favoris', JSON.stringify(favoris));
  }

})();
