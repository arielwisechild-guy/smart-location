/* ============================================================
   SMART LOCATION — bailleur.js
   Rôle : logique Firebase des pages bailleur
   - Chargement du profil connecté
   - Publication d'annonce dans Firestore (photos optionnelles)
   - Chargement et suppression des annonces du bailleur
   Développé par : Ariel Wise Child & Mr. Google — © 2026
   ============================================================ */

(function () {

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
      var data   = doc.data();
      var nameEl = document.querySelector('.sidebar-user-name');
      var roleEl = document.querySelector('.sidebar-user-role');
      if (nameEl) nameEl.textContent = data.prenom + ' ' + data.nom;
      if (roleEl) roleEl.textContent = 'Bailleur';
    });

    var page = window.location.pathname;
    if (page.includes('dashboard'))    initDashboard(user);
    if (page.includes('mes-annonces')) initMesAnnonces(user);
    if (page.includes('publier'))      initPublier(user);
  });

  /* ══════════════════════════════════════
     1. DASHBOARD
  ══════════════════════════════════════ */
  function initDashboard(user) {
    db.collection('annonces')
      .where('uid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
      .then(function (snapshot) {
        var total     = snapshot.size;
        var actives   = 0;
        var verifiees = 0;
        var tbody     = document.querySelector('.annonces-table tbody');
        if (tbody) tbody.innerHTML = '';

        snapshot.forEach(function (doc) {
          var a = doc.data();
          if (a.statut === 'active') actives++;
          if (a.verifie === true)    verifiees++;
          if (tbody) tbody.innerHTML += buildRow(doc.id, a, false);
        });

        setStatCard(0, total);
        setStatCard(2, actives);
        setStatCard(3, verifiees);
        bindDeleteButtons();
      })
      .catch(function (err) { console.error('Dashboard:', err); });
  }

  /* ══════════════════════════════════════
     2. MES ANNONCES
  ══════════════════════════════════════ */
  function initMesAnnonces(user) {
    db.collection('annonces')
      .where('uid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get()
      .then(function (snapshot) {
        var tbody = document.querySelector('.annonces-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (snapshot.empty) {
          tbody.innerHTML =
            '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--gray);">' +
            'Vous n\'avez pas encore d\'annonces. <a href="publier.html">Publier un bien</a></td></tr>';
          return;
        }

        snapshot.forEach(function (doc) {
          tbody.innerHTML += buildRow(doc.id, doc.data(), true);
        });

        bindDeleteButtons();
      })
      .catch(function (err) { console.error('Mes annonces:', err); });
  }

  /* ══════════════════════════════════════
     3. PUBLICATION D'ANNONCE
     (uploads photos vers Supabase Storage si configuré)
  ══════════════════════════════════════ */
  var uploadedFiles  = [];
  var previewDataURLs = [];
  var uploadedPhotoUrls = [];

  function initPublier(user) {

    /* Aperçu photos local (sans upload) */
    var uploadZone  = document.querySelector('.upload-zone');
    var uploadInput = document.querySelector('.upload-zone input[type="file"]');
    var photosGrid  = document.querySelector('.photos-preview');

    if (uploadZone && uploadInput) {
      uploadZone.addEventListener('click', function () { uploadInput.click(); });

      uploadZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--accent)';
      });
      uploadZone.addEventListener('dragleave', function () {
        uploadZone.style.borderColor = '';
      });
      uploadZone.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadZone.style.borderColor = '';
        handleFiles(e.dataTransfer.files);
      });
      uploadInput.addEventListener('change', function () {
        handleFiles(uploadInput.files);
      });
    }

    function handleFiles(files) {
      Array.from(files).forEach(function (file) {
        if (!file.type.startsWith('image/')) return;
        if (uploadedFiles.length >= 6) { showToast('error', 'Maximum 6 photos.'); return; }
        uploadedFiles.push(file);
        var reader = new FileReader();
        reader.onload = function (e) {
          previewDataURLs.push(e.target.result);
          addThumb(e.target.result, uploadedFiles.length - 1);
        };
        reader.readAsDataURL(file);
      });
    }

    function addThumb(src, idx) {
      if (!photosGrid) return;
      var thumb = document.createElement('div');
      thumb.className = 'photo-thumb';
      thumb.innerHTML =
        '<img src="' + src + '" alt="Photo"/>' +
        '<button type="button" class="photo-thumb-remove"><i class="fa-solid fa-xmark"></i></button>';
      thumb.querySelector('.photo-thumb-remove').addEventListener('click', function () {
        uploadedFiles.splice(idx, 1);
        previewDataURLs.splice(idx, 1);
        thumb.remove();
      });
      photosGrid.appendChild(thumb);
    }

    /* Soumission */
    var form       = document.querySelector('.publier-form');
    var publishBtn = document.querySelector('.btn-publish');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var titre    = form.querySelector('[name="titre"]').value.trim();
      var commune  = form.querySelector('[name="commune"]').value;
      var quartier = form.querySelector('[name="quartier"]').value.trim();
      var prix     = parseFloat(form.querySelector('[name="prix"]').value);

      if (!titre || !commune || !quartier || !prix) {
        showToast('error', 'Veuillez remplir tous les champs obligatoires.');
        return;
      }

      publishBtn.disabled  = true;
      publishBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Publication...';

      function finishPublication(photoUrls) {
        db.collection('annonces').add({
          uid:         user.uid,
          titre:       titre,
          commune:     commune,
          quartier:    quartier,
          adresse:     form.querySelector('[name="adresse"]').value.trim(),
          type:        form.querySelector('[name="type"]').value,
          prix:        prix,
          description: form.querySelector('[name="description"]').value.trim(),
          chambres:    form.querySelector('[name="chambres"]').value,
          sdb:         form.querySelector('[name="sdb"]').value,
          caution:     form.querySelector('[name="caution"]').value,
          eau:         form.querySelector('[name="eau"]').value,
          electricite: form.querySelector('[name="electricite"]').value,
          telephone:   form.querySelector('[name="telephone"]').value.trim(),
          whatsapp:    form.querySelector('[name="whatsapp"]').value.trim(),
          photos:      photoUrls || [],
          statut:      'pending',
          verifie:     false,
          vues:        0,
          createdAt:   firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(function () {
          showToast('success', 'Annonce publiee ! En attente de validation du chef de quartier.');
          form.reset();
          if (photosGrid) photosGrid.innerHTML = '';
          uploadedFiles   = [];
          previewDataURLs = [];
          uploadedPhotoUrls = [];
          publishBtn.disabled  = false;
          publishBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publier l\'annonce';
        })
        .catch(function (err) {
          console.error('Publication:', err);
          showToast('error', 'Erreur lors de la publication. Reessayez.');
          publishBtn.disabled  = false;
          publishBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publier l\'annonce';
        });
      }

      if (!uploadedFiles.length) {
        finishPublication([]);
        return;
      }

      if (!window.supabaseClient || window.supabaseConfigStatus !== 'ready') {
        showToast('error', 'Supabase n\'est pas configure. Remplacez l\'URL du projet et la clé anon réelle dans JAVASCRIPT/global/supabase-config.js.');
        publishBtn.disabled  = false;
        publishBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publier l\'annonce';
        return;
      }

      var uploadPromises = uploadedFiles.map(function (file, index) {
        var fileName = 'annonces/' + user.uid + '/' + Date.now() + '-' + index + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        var bucket = 'photos';
        return window.supabaseClient.storage.from(bucket).upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        }).then(function (result) {
          if (result.error) throw result.error;
          return window.supabaseClient.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
        });
      });

      Promise.all(uploadPromises)
        .then(function (urls) {
          uploadedPhotoUrls = urls;
          finishPublication(urls);
        })
        .catch(function (err) {
          console.error('Upload Supabase:', err);
          showToast('error', 'Echec de l\'upload des photos. Verifiez votre bucket Supabase.');
          publishBtn.disabled  = false;
          publishBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publier l\'annonce';
        });
    });
  }

  /* ══════════════════════════════════════
     4. SUPPRESSION
  ══════════════════════════════════════ */
  function bindDeleteButtons() {
    document.querySelectorAll('.btn-delete-annonce').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id  = btn.dataset.id;
        var row = btn.closest('tr');
        if (!id || !confirm('Supprimer cette annonce ? Cette action est irreversible.')) return;
        if (row) row.style.opacity = '0.4';
        db.collection('annonces').doc(id).delete()
          .then(function () {
            if (row) row.remove();
            showToast('success', 'Annonce supprimee.');
          })
          .catch(function (err) {
            console.error('Suppression:', err);
            if (row) row.style.opacity = '1';
            showToast('error', 'Erreur lors de la suppression.');
          });
      });
    });
  }

  /* ══════════════════════════════════════
     UTILITAIRES
  ══════════════════════════════════════ */
  function buildRow(id, a, showVues) {
    var statut =
      a.statut === 'active'  ? '<span class="status-badge active"><i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> Active</span>'   :
      a.statut === 'blocked' ? '<span class="status-badge blocked"><i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> Bloquee</span>'  :
                               '<span class="status-badge pending"><i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> En attente</span>';
    var vuesCol = showVues ? '<td>' + (a.vues || 0) + '</td>' : '';
    return '<tr>' +
      '<td class="td-title">' + (a.titre   || '') + '</td>' +
      '<td>'                  + (a.commune || '') + '</td>' +
      vuesCol +
      '<td class="td-price">' + (a.prix    || '') + ' $</td>' +
      '<td>' + statut + '</td>' +
      '<td class="td-actions">' +
        '<a href="publier.html?id=' + id + '" class="btn-icon" title="Modifier"><i class="fa-solid fa-pen"></i></a>' +
        '<button class="btn-icon delete btn-delete-annonce" data-id="' + id + '" title="Supprimer"><i class="fa-solid fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
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
      zIndex: '9999', boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
    });
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
  }

})();
