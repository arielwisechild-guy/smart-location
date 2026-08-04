document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('reset-form');
  var emailInput = document.getElementById('reset-email');
  var msgEl = document.getElementById('reset-message');

  function showMessage(type, text) {
    if (!msgEl) return;
    msgEl.className = 'auth-message ' + type;
    msgEl.textContent = text;
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function getErrorMessage(code) {
    var messages = {
      'auth/user-not-found': 'Aucun compte trouve avec cet email.',
      'auth/invalid-email': 'Adresse email invalide.',
      'auth/too-many-requests': 'Trop de tentatives. Reessayez plus tard.',
      'auth/network-request-failed': 'Erreur reseau. Verifiez votre connexion.'
    };
    return messages[code] || 'Impossible d\'envoyer le lien. Reessayez.';
  }

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = (emailInput && emailInput.value || '').trim();
    if (!email) { showMessage('error', 'Veuillez saisir votre adresse email.'); return; }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Envoi...';
    // Rate-limit: empêcher plus d'une demande toutes les 5 minutes pour le même email
    var requestsRef = db.collection('passwordResetRequests');
    requestsRef.where('email', '==', email).orderBy('createdAt', 'desc').limit(1).get()
      .then(function (snap) {
        if (!snap.empty) {
          var last = snap.docs[0].data().createdAt;
          if (last && last.toDate) {
            var lastMs = last.toDate().getTime();
            var diff = Date.now() - lastMs;
            var minDelay = 5 * 60 * 1000; // 5 minutes
            if (diff < minDelay) {
              var minutes = Math.ceil((minDelay - diff) / 60000);
              showMessage('error', 'Un lien a déjà été envoyé récemment. Réessayez dans ' + minutes + ' minute(s).');
              btn.disabled = false;
              btn.innerHTML = '<i class="fa-solid fa-envelope-open-text"></i> Envoyer le lien de réinitialisation';
              return Promise.reject({ handled: true });
            }
          }
        }

        // Log request (pending)
        var addRef = requestsRef.doc();
        return addRef.set({
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          userAgent: navigator.userAgent || null,
          status: 'pending'
        }).then(function () { return addRef; });
      })
      .then(function (addRef) {
        if (!addRef) return; // rate-limited case
        return auth.sendPasswordResetEmail(email)
          .then(function () {
            // mark sent
            addRef.update({ status: 'sent', sentAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function () {});
            showMessage('success', 'Un email de réinitialisation a été envoyé si ce compte existe.');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-envelope-open-text"></i> Envoyer le lien de réinitialisation';
          })
          .catch(function (err) {
            console.error('Reset error', err);
            addRef.update({ status: 'failed', errorCode: err && err.code || null, errorMessage: err && err.message || null, failedAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function () {});
            var text = (err && err.code) ? getErrorMessage(err.code) : (err && err.message ? err.message : 'Erreur');
            showMessage('error', text);
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-envelope-open-text"></i> Envoyer le lien de réinitialisation';
          });
      })
      .catch(function (err) {
        if (err && err.handled) return;
        console.error('Reset flow error', err);
        showMessage('error', 'Impossible de traiter votre demande. Reessayez plus tard.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-envelope-open-text"></i> Envoyer le lien de réinitialisation';
      });
  });
});
