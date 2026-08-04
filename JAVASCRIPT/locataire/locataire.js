/* ============================================================
   SMART LOCATION — locataire.js (Version Supabase)
   Rôle : Logique Supabase des pages locataire
   - Vérification session + profil (nom, prénom, photo)
   - Dashboard & annonces récentes depuis Supabase
   - Recherche avancée multi-critères
   - Gestion des favoris (localStorage)
   - Upload de photo de profil & Déconnexion
   Développé par : Ariel Wise Child — © 2026
   ============================================================ */

(function () {
  var favoris = JSON.parse(localStorage.getItem('sl_favoris') || '[]');

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.supabaseClient) {
      console.error('Client Supabase introuvable.');
      return;
    }

    /* ══════════════════════════════════════
       0. VÉRIFIER LA SESSION SUPABASE
    ══════════════════════════════════════ */
    window.supabaseClient.auth.getSession().then(function (result) {
      var session = result.data ? result.data.session : null;

      if (!session) {
        window.location.href = '../Authentification/connexion.html';
        return;
      }

      var userAuth = session.user;
      var userId = userAuth.id;

      /* Chargement du profil locataire (Nom, Prénom, Photo) */
      window.supabaseClient
        .from('profiles')
        .select('nom, prenom, role, avatar_url')
        .eq('id', userId)
        .maybeSingle()
        .then(function (res) {
          var profile = res.data;

          var nameEl = document.getElementById('sidebar-user-name');
          var roleEl = document.getElementById('sidebar-user-role');
          var avatarImg = document.getElementById('user-avatar-img');

          var prenom = (profile && profile.prenom) || (userAuth.user_metadata && userAuth.user_metadata.prenom) || '';
          var nom = (profile && profile.nom) || (userAuth.user_metadata && userAuth.user_metadata.nom) || '';
          var fullName = (prenom + ' ' + nom).trim();

          if (nameEl) {
            nameEl.textContent = fullName.length > 0 ? fullName : 'Locataire';
          }

          if (roleEl) {
            var role = (profile && profile.role) || (userAuth.user_metadata && userAuth.user_metadata.role) || 'LOCATAIRE';
            roleEl.textContent = role.toUpperCase();
          }

          if (avatarImg && profile && profile.avatar_url) {
            avatarImg.src = profile.avatar_url;
          }
        })
        .catch(function (err) {
          console.error('Erreur profil :', err);
          var nameEl = document.getElementById('sidebar-user-name');
          if (nameEl) nameEl.textContent = 'Locataire';
        });

      /* Initialiser les fonctions selon la page active */
      var page = window.location.pathname;
      if (page.includes('dashboard')) initDashboard();
      if (page.includes('recherche')) initRecherche();
      if (page.includes('favoris')) initFavoris();
    });

    /* ══════════════════════════════════════
       GESTION UPLOAD PHOTO DE PROFIL
    ══════════════════════════════════════ */
    var avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
      avatarInput.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;

        window.supabaseClient.auth.getSession().then(function (result) {
          var session = result.data ? result.data.session : null;
          if (!session) return;

          var userId = session.user.id;
          var fileExt = file.name.split('.').pop();
          var filePath = 'avatars/' + userId + '.' + fileExt;

          window.supabaseClient.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true })
            .then(function (uploadRes) {
              if (uploadRes.error) throw uploadRes.error;

              var publicUrlData = window.supabaseClient.storage
                .from('avatars')
                .getPublicUrl(filePath);

              var publicUrl = publicUrlData.data.publicUrl;

              return window.supabaseClient
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId)
                .then(function () {
                  var avatarImg = document.getElementById('user-avatar-img');
                  if (avatarImg) avatarImg.src = publicUrl;
                });
            })
            .catch(function (err) {
              console.error('Erreur upload photo :', err);
              alert('Impossible de mettre à jour la photo.');
            });
        });
      });
    }

    /* ══════════════════════════════════════
       GESTION DÉCONNEXION
    ══════════════════════════════════════ */
    var logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.supabaseClient.auth.signOut().then(function () {
          window.location.href = '../Authentification/connexion.html';
        });
      });
    }
  });

  /* ══════════════════════════════════════
     1. DASHBOARD — Annonces récentes (Supabase)
  ══════════════════════════════════════ */
  function initDashboard() {
    var grid = document.querySelector('.listings-grid');
    if (!grid) return;

    window.supabaseClient
      .from('annonces')
      .select('*')
      .eq('statut', 'active')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(function (res) {
        grid.innerHTML = '';
        if (res.error) throw res.error;
        if (res.data) {
          res.data.forEach(function (annonce) {
            grid.appendChild(buildCard(annonce.id, annonce));
          });
        }
      })
      .catch(function (err) {
        console.error('Dashboard locataire:', err);
      });
  }

  /* ══════════════════════════════════════
     2. RECHERCHE AVANCÉE (Supabase)
  ══════════════════════════════════════ */
  function initRecherche() {
    var grid = document.querySelector('.listings-grid');
    var countEl = document.querySelector('.results-count');
    var btnSearch = document.querySelector('.btn-search');
    var btnReset = document.querySelector('.btn-reset');

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
      q: getVal('[name="q"]'),
      commune: getVal('[name="commune"]'),
      type: getVal('[name="type"]'),
      prixMin: parseInt(getVal('[name="prix_min"]')) || 0,
      prixMax: parseInt(getVal('[name="prix_max"]')) || Infinity,
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

    window.supabaseClient
      .from('annonces')
      .select('*')
      .eq('statut', 'active')
      .then(function (res) {
        if (res.error) throw res.error;

        var results = [];
        var data = res.data || [];

        data.forEach(function (a) {
          if (f.commune && a.commune !== f.commune) return;
          if (f.type && a.type !== f.type) return;
          if (f.prixMin && a.prix < f.prixMin) return;
          if (f.prixMax && a.prix > f.prixMax) return;
          if (f.chambres && parseInt(a.chambres) < f.chambres) return;
          if (
            f.q &&
            !(
              (a.titre || '').toLowerCase().includes(f.q.toLowerCase()) ||
              (a.commune || '').toLowerCase().includes(f.q.toLowerCase()) ||
              (a.quartier || '').toLowerCase().includes(f.q.toLowerCase())
            )
          )
            return;

          results.push(a);
        });

        grid.innerHTML = '';

        if (countEl) {
          countEl.innerHTML =
            '<strong>' +
            results.length +
            '</strong> annonce' +
            (results.length !== 1 ? 's' : '') +
            ' trouvée' +
            (results.length !== 1 ? 's' : '');
        }

        if (results.length === 0) {
          grid.innerHTML =
            '<div class="empty-state" style="grid-column:1/-1">' +
            '<i class="fa-solid fa-house-circle-xmark"></i>' +
            '<h3>Aucun résultat</h3>' +
            '<p>Modifiez vos filtres pour élargir la recherche.</p></div>';
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
          '<p>Vérifiez votre connexion et réessayez.</p></div>';
      });
  }

  /* ══════════════════════════════════════
     3. FAVORIS (Supabase)
  ══════════════════════════════════════ */
  function initFavoris() {
    var grid = document.querySelector('.favoris-grid');
    if (!grid || favoris.length === 0) {
      if (grid)
        grid.innerHTML =
          '<div class="empty-state" style="grid-column:1/-1">' +
          '<i class="fa-regular fa-heart"></i>' +
          '<h3>Aucun favori sauvegardé</h3>' +
          '<p>Parcourez les annonces et cliquez sur le cœur pour sauvegarder.</p>' +
          '<a href="recherche.html" class="btn-call" style="display:inline-flex;width:auto;margin-top:4px;">Voir les annonces</a>' +
          '</div>';
      return;
    }

    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);">' +
      '<i class="fa-solid fa-circle-notch fa-spin" style="font-size:1.5rem;display:block;margin-bottom:12px;"></i>' +
      'Chargement...</div>';

    window.supabaseClient
      .from('annonces')
      .select('*')
      .in('id', favoris)
      .then(function (res) {
        grid.innerHTML = '';
        if (res.error) throw res.error;

        var docs = res.data || [];
        docs.forEach(function (doc) {
          var card = buildCard(doc.id, doc, true);
          grid.appendChild(card);
        });

        if (grid.children.length === 0) {
          grid.innerHTML =
            '<div class="empty-state" style="grid-column:1/-1">' +
            '<i class="fa-regular fa-heart"></i>' +
            '<h3>Aucun favori disponible</h3>' +
            '<p>Certaines annonces ont peut-être été supprimées.</p></div>';
        }
      })
      .catch(function (err) {
        console.error('Favoris:', err);
      });
  }

  /* ══════════════════════════════════════
     4. CONSTRUCTION D'UNE CARTE
  ══════════════════════════════════════ */
  function buildCard(id, a, isFavPage) {
    var isFav = favoris.includes(id);
    var photo =
      a.photos && a.photos.length > 0
        ? '<img src="' + a.photos[0] + '" alt="' + (a.titre || '') + '"/>'
        : '<div class="listing-img-placeholder"><i class="fa-solid fa-house"></i></div>';

    var card = document.createElement('div');
    card.className = 'listing-card';
    card.innerHTML =
      '<div class="listing-img">' +
      photo +
      (a.verifie ? '<span class="listing-badge verified">Vérifié</span>' : '<span class="listing-badge">Disponible</span>') +
      '<button class="listing-fav' +
      (isFav ? ' active' : '') +
      '" data-id="' +
      id +
      '" title="Sauvegarder">' +
      '<i class="fa-' +
      (isFav ? 'solid' : 'regular') +
      ' fa-heart"></i>' +
      '</button>' +
      '</div>' +
      '<div class="listing-body">' +
      '<div class="listing-price">' +
      (a.prix || '--') +
      ' $ <span>/ mois</span></div>' +
      '<div class="listing-title">' +
      (a.titre || '') +
      '</div>' +
      '<div class="listing-location"><i class="fa-solid fa-location-dot"></i> ' +
      (a.commune || '') +
      ', ' +
      (a.quartier || '') +
      '</div>' +
      '<div class="listing-meta">' +
      '<div class="meta-item"><i class="fa-solid fa-bed"></i> ' +
      (a.chambres || '--') +
      ' ch.</div>' +
      '<div class="meta-item"><i class="fa-solid fa-bath"></i> ' +
      (a.sdb || '--') +
      ' SDB</div>' +
      '</div>' +
      '<a href="tel:' +
      (a.telephone || '') +
      '" class="btn-call"><i class="fa-solid fa-phone"></i> Appeler le bailleur</a>' +
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
        setTimeout(function () {
          cardToRemove.remove();
        }, 300);
      }
    }
    localStorage.setItem('sl_favoris', JSON.stringify(favoris));
  }
})();