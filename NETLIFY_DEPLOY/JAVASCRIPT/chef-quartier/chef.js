/* ============================================================
   SMART LOCATION — chef.js
   Rôle : logique Firebase des pages chef de quartier
   - Vérification connexion + chargement profil et zone
   - Chargement des annonces de la zone depuis Firestore
   - Approbation / blocage des annonces
   - Chargement et traitement des signalements
   Développé par : Ariel Wise Child & Mr. Google — © 2026
   ============================================================ */

(function () {

  var chefZone = '';

  /* ══════════════════════════════════════
     0. VERIFIER LA CONNEXION
  ══════════════════════════════════════ */
  auth.onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href = '../../HTML/Authentification/connexion.html';
      return;
    }

    db.collection('users').doc(user.uid).get().then(function (doc) {
      if (!doc.exists) return;
      var data = doc.data();

      /* Afficher le nom et la zone dans la sidebar */
      var nameEl = document.querySelector('.sidebar-user-name');
      var zoneEl = document.querySelector('.sidebar-user-zone');
      if (nameEl) nameEl.textContent = data.prenom + ' ' + data.nom;
      if (zoneEl) zoneEl.innerHTML   = '<i class="fa-solid fa-location-dot"></i> ' + (data.commune || '') + ' — Kinshasa';

      chefZone = data.commune || '';

      /* Lancer la bonne fonction selon la page */
      var page = window.location.pathname;
      if (page.includes('dashboard'))    initDashboard();
      if (page.includes('moderation'))   initModeration();
      if (page.includes('signalements')) initSignalements();
    });
  });

  /* ══════════════════════════════════════
     1. DASHBOARD — stats + annonces en attente
  ══════════════════════════════════════ */
  function initDashboard() {
    if (!chefZone) return;

    db.collection('annonces')
      .where('commune', '==', chefZone)
      .get()
      .then(function (snapshot) {
        var total    = snapshot.size;
        var pending  = 0;
        var actives  = 0;

        var tbody = document.querySelector('.mod-table tbody');
        if (tbody) tbody.innerHTML = '';

        snapshot.forEach(function (doc) {
          var a = doc.data();
          if (a.statut === 'pending') pending++;
          if (a.statut === 'active')  actives++;
          if (tbody && a.statut === 'pending') {
            tbody.innerHTML += buildModerationRow(doc.id, a);
          }
        });

        setStatCard(0, total);
        setStatCard(1, pending);
        setStatCard(2, actives);

        bindModerationButtons();
      });

    /* Signalements en attente */
    db.collection('signalements')
      .where('commune', '==', chefZone)
      .where('statut', '==', 'nouveau')
      .get()
      .then(function (snapshot) {
        setStatCard(3, snapshot.size);
      });
  }

  /* ══════════════════════════════════════
     2. MODERATION — toutes les annonces de la zone
  ══════════════════════════════════════ */
  function initModeration() {
    if (!chefZone) return;

    db.collection('annonces')
      .where('commune', '==', chefZone)
      .orderBy('createdAt', 'desc')
      .get()
      .then(function (snapshot) {
        var tbody = document.querySelector('.mod-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (snapshot.empty) {
          tbody.innerHTML =
            '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--gray);">' +
            'Aucune annonce dans votre zone.</td></tr>';
          return;
        }

        snapshot.forEach(function (doc) {
          var row = document.createElement('tr');
          row.className      = 'mod-row';
          row.dataset.status = doc.data().statut || 'pending';
          row.innerHTML      = buildModerationRow(doc.id, doc.data(), true);
          tbody.appendChild(row);
        });

        bindModerationButtons();
        bindFilterTabs();
      })
      .catch(function (err) { console.error('Moderation:', err); });
  }

  /* ══════════════════════════════════════
     3. SIGNALEMENTS
  ══════════════════════════════════════ */
  function initSignalements() {
    if (!chefZone) return;

    db.collection('signalements')
      .where('commune', '==', chefZone)
      .orderBy('createdAt', 'desc')
      .get()
      .then(function (snapshot) {
        var containerNouveaux = document.querySelector('.signalements-nouveaux');
        var containerResolus  = document.querySelector('.signalements-resolus');

        if (!containerNouveaux && !containerResolus) return;

        if (containerNouveaux) containerNouveaux.innerHTML = '';
        if (containerResolus)  containerResolus.innerHTML  = '';

        var countNouveaux = 0;
        var countResolus  = 0;

        snapshot.forEach(function (doc) {
          var s    = doc.data();
          s.id     = doc.id;
          var card = buildSignalementCard(s);

          if (s.statut === 'resolu' || s.statut === 'archive') {
            if (containerResolus) { containerResolus.appendChild(card); countResolus++; }
          } else {
            if (containerNouveaux) { containerNouveaux.appendChild(card); countNouveaux++; }
          }
        });

        /* Mettre à jour les titres de sections */
        var titreNouveaux = document.querySelector('.titre-nouveaux');
        var titreResolus  = document.querySelector('.titre-resolus');
        if (titreNouveaux) titreNouveaux.textContent = 'En attente de traitement (' + countNouveaux + ')';
        if (titreResolus)  titreResolus.textContent  = 'Recemment resolus (' + countResolus + ')';

        if (containerNouveaux && countNouveaux === 0) {
          containerNouveaux.innerHTML =
            '<div class="empty-state"><i class="fa-solid fa-check-circle"></i>' +
            '<h3>Aucun signalement en attente</h3>' +
            '<p>Votre zone est propre.</p></div>';
        }
      })
      .catch(function (err) { console.error('Signalements:', err); });
  }

  /* ══════════════════════════════════════
     4. ACTIONS MODERATION
  ══════════════════════════════════════ */
  function bindModerationButtons() {
    document.querySelectorAll('.btn-approuver').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id  = btn.dataset.id;
        var row = btn.closest('tr');
        db.collection('annonces').doc(id).update({ statut: 'active', verifie: true })
          .then(function () {
            var badge = row && row.querySelector('.status-badge');
            if (badge) {
              badge.className = 'status-badge active';
              badge.innerHTML = '<i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> Active';
            }
            if (row) row.dataset.status = 'active';
            btn.disabled = true;
            btn.style.opacity = '0.5';
            showToast('success', 'Annonce approuvee et publiee.');
          })
          .catch(function (err) { console.error(err); showToast('error', 'Erreur lors de l\'approbation.'); });
      });
    });

    document.querySelectorAll('.btn-bloquer').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Bloquer cette annonce ?')) return;
        var id  = btn.dataset.id;
        var row = btn.closest('tr');
        db.collection('annonces').doc(id).update({ statut: 'blocked' })
          .then(function () {
            var badge = row && row.querySelector('.status-badge');
            if (badge) {
              badge.className = 'status-badge blocked';
              badge.innerHTML = '<i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> Bloquee';
            }
            if (row) row.dataset.status = 'blocked';
            btn.disabled = true;
            btn.style.opacity = '0.5';
            showToast('error', 'Annonce bloquee.');
          })
          .catch(function (err) { console.error(err); showToast('error', 'Erreur lors du blocage.'); });
      });
    });
  }

  /* ══════════════════════════════════════
     5. FILTRES PAR ONGLETS
  ══════════════════════════════════════ */
  function bindFilterTabs() {
    var filterBtns = document.querySelectorAll('.filter-tab');
    var modRows    = document.querySelectorAll('.mod-row');

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) {
          b.style.background = 'var(--white)';
          b.style.color      = 'var(--gray)';
        });
        btn.style.background = 'var(--black)';
        btn.style.color      = 'var(--white)';

        var filter = btn.dataset.filter;
        modRows.forEach(function (row) {
          row.style.display = (filter === 'all' || row.dataset.status === filter) ? '' : 'none';
        });
      });
    });
  }

  /* ══════════════════════════════════════
     6. ACTIONS SIGNALEMENTS
  ══════════════════════════════════════ */
  function bindSignalementActions(card, id) {
    var btnResoudre = card.querySelector('.btn-resoudre');
    var btnArchiver = card.querySelector('.btn-archiver');

    if (btnResoudre) {
      btnResoudre.addEventListener('click', function () {
        db.collection('signalements').doc(id).update({ statut: 'resolu' })
          .then(function () {
            var badge = card.querySelector('.status-badge');
            if (badge) { badge.className = 'status-badge resolved'; badge.textContent = 'Resolu'; }
            btnResoudre.disabled = true;
            btnResoudre.style.opacity = '0.5';
            showToast('success', 'Signalement marque comme resolu.');
          })
          .catch(function (err) { console.error(err); });
      });
    }

    if (btnArchiver) {
      btnArchiver.addEventListener('click', function () {
        db.collection('signalements').doc(id).update({ statut: 'archive' })
          .then(function () {
            card.style.opacity    = '0';
            card.style.transition = 'opacity 0.3s';
            setTimeout(function () { card.remove(); }, 300);
            showToast('success', 'Signalement archive.');
          })
          .catch(function (err) { console.error(err); });
      });
    }
  }

  /* ══════════════════════════════════════
     UTILITAIRES
  ══════════════════════════════════════ */
  function buildModerationRow(id, a, withQuartier) {
    var statut =
      a.statut === 'active'  ? '<span class="status-badge active"><i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> Active</span>'  :
      a.statut === 'blocked' ? '<span class="status-badge blocked"><i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> Bloquee</span>' :
                               '<span class="status-badge pending"><i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> En attente</span>';
    var quartierCol = withQuartier ? '<td>' + (a.quartier || '') + '</td>' : '';
    var actions =
      a.statut !== 'active'  ? '<button class="btn-approve btn-approuver" data-id="' + id + '"><i class="fa-solid fa-check"></i> Approuver</button>' : '' +
      a.statut !== 'blocked' ? '<button class="btn-block btn-bloquer" data-id="' + id + '"><i class="fa-solid fa-ban"></i> Bloquer</button>'   : '';

    return '<td class="td-title">' + (a.titre || '') + '</td>' +
      '<td>' + (a.bailleurNom || 'Bailleur') + '</td>' +
      quartierCol +
      '<td class="td-price">' + (a.prix || '--') + ' $</td>' +
      '<td>' + statut + '</td>' +
      '<td class="td-actions">' + actions + '</td>';
  }

  function buildSignalementCard(s) {
    var card = document.createElement('div');
    card.className = 'signalement-card';

    var badgeClass = s.statut === 'resolu' ? 'resolved' : 'new';
    var badgeText  = s.statut === 'resolu' ? 'Resolu'   : 'Nouveau';

    var date = s.createdAt && s.createdAt.toDate
      ? s.createdAt.toDate().toLocaleDateString('fr-FR')
      : '';

    card.innerHTML =
      '<div class="signalement-header">' +
        '<div class="signalement-title">' + (s.titre || 'Signalement') + '</div>' +
        '<span class="status-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>' +
      '<div class="signalement-meta">' +
        '<span><i class="fa-solid fa-house"></i> ' + (s.annonceTitre || '') + '</span>' +
        '<span><i class="fa-solid fa-user"></i> ' + (s.auteur || 'Anonyme') + '</span>' +
        '<span><i class="fa-solid fa-clock"></i> ' + date + '</span>' +
      '</div>' +
      '<div class="signalement-body">' + (s.message || '') + '</div>' +
      '<div class="signalement-actions">' +
        (s.statut !== 'resolu' ? '<button class="btn-approve btn-resoudre"><i class="fa-solid fa-check"></i> Marquer resolu</button>' : '') +
        '<button class="btn-block btn-archiver"><i class="fa-solid fa-box-archive"></i> Archiver</button>' +
      '</div>';

    bindSignalementActions(card, s.id);
    return card;
  }

  function setStatCard(index, value) {
    var cards = document.querySelectorAll('.stat-card-body strong');
    if (cards[index]) cards[index].textContent = value;
  }

  function showToast(type, text) {
    var existing = document.querySelector('.sl-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.innerHTML = '<i class="fa-solid fa-' + (type === 'success' ? 'circle-check' : 'circle-xmark') + '"></i> ' + text;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '28px', right: '28px',
      background: type === 'success' ? '#1a7a42' : '#c0392b',
      color: '#fff', padding: '14px 20px', borderRadius: '8px',
      fontSize: '0.875rem', fontWeight: '500', fontFamily: 'Inter, sans-serif',
      display: 'flex', alignItems: 'center', gap: '10px',
      zIndex: '9999', boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      transition: 'opacity 0.3s'
    });
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
  }

})();
