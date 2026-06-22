/* ============================================================
   SMART LOCATION — chef.js
   Rôle : logique des pages chef de quartier
   - Modération : approuver / bloquer les annonces
   - Signalements : marquer comme résolu / archiver
   - Toast notifications
   ============================================================ */

(function () {

  /* ══════════════════════════════════════
     1. MODERATION DES ANNONCES
  ══════════════════════════════════════ */
  document.querySelectorAll('.btn-approuver').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id  = btn.dataset.id;
      var row = btn.closest('tr');
      if (!row) return;

      var badge = row.querySelector('.status-badge');
      if (badge) {
        badge.className = 'status-badge active';
        badge.innerHTML = '<i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> Active';
      }

      btn.disabled = true;
      btn.style.opacity = '0.5';
      showToast('success', 'Annonce approuvee et publiee.');

      // TODO : Firebase Firestore — mettre à jour le champ statut du document
    });
  });

  document.querySelectorAll('.btn-bloquer').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id  = btn.dataset.id;
      var row = btn.closest('tr');
      if (!row) return;

      if (!confirm('Bloquer cette annonce ? Elle sera masquee des locataires.')) return;

      var badge = row.querySelector('.status-badge');
      if (badge) {
        badge.className = 'status-badge blocked';
        badge.innerHTML = '<i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> Bloquee';
      }

      btn.disabled = true;
      btn.style.opacity = '0.5';
      showToast('error', 'Annonce bloquee avec succes.');

      // TODO : Firebase Firestore — mettre à jour le champ statut
    });
  });

  /* ══════════════════════════════════════
     2. GESTION DES SIGNALEMENTS
  ══════════════════════════════════════ */
  document.querySelectorAll('.btn-resoudre').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.signalement-card');
      if (!card) return;

      var badge = card.querySelector('.status-badge');
      if (badge) {
        badge.className = 'status-badge resolved';
        badge.textContent = 'Resolu';
      }

      btn.disabled = true;
      btn.style.opacity = '0.5';
      showToast('success', 'Signalement marque comme resolu.');

      // TODO : Firebase Firestore — mettre à jour le statut du signalement
    });
  });

  document.querySelectorAll('.btn-archiver').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.signalement-card');
      if (!card) return;

      card.style.transition = 'opacity 0.3s';
      card.style.opacity = '0';
      setTimeout(function () { card.remove(); }, 300);
      showToast('success', 'Signalement archive.');

      // TODO : Firebase Firestore — archiver le signalement
    });
  });

  /* ══════════════════════════════════════
     3. FILTRES PAGE MODERATION
  ══════════════════════════════════════ */
  var filterBtns = document.querySelectorAll('.filter-tab');
  var modRows    = document.querySelectorAll('.mod-row');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var filter = btn.dataset.filter;
      modRows.forEach(function (row) {
        if (filter === 'all') {
          row.style.display = '';
        } else {
          row.style.display = row.dataset.status === filter ? '' : 'none';
        }
      });
    });
  });

  /* ══════════════════════════════════════
     4. TOAST NOTIFICATION
  ══════════════════════════════════════ */
  function showToast(type, text) {
    var existing = document.querySelector('.sl-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'sl-toast';
    toast.innerHTML =
      '<i class="fa-solid fa-' + (type === 'success' ? 'circle-check' : 'circle-xmark') + '"></i> ' + text;

    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '28px',
      right: '28px',
      background: type === 'success' ? '#1a7a42' : '#c0392b',
      color: '#fff',
      padding: '14px 20px',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '500',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      zIndex: '9999',
      boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      transition: 'opacity 0.3s',
    });

    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
  }

})();
