/* ============================================================
   SMART LOCATION — Réinitialisation de mot de passe (Supabase)
   ============================================================ */

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

  function getErrorMessage(message) {
    var messages = {
      'Unable to validate email address: invalid format': 'Adresse email invalide.',
      'Email rate limit exceeded': 'Trop de tentatives. Réessayez dans quelques minutes.',
      'For security purposes, you can only request this once every 60 seconds': 'Un email a déjà été envoyé. Attendez une minute avant de réessayer.'
    };
    return messages[message] || (message || 'Impossible d\'envoyer le lien. Réessayez.');
  }

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = (emailInput && emailInput.value || '').trim();
    if (!email) { 
      showMessage('error', 'Veuillez saisir votre adresse email.'); 
      return; 
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Envoi...';

    // Vérification si Supabase est bien chargé
    if (!window.supabaseClient) {
      showMessage('error', 'Supabase n\'est pas correctement initialisé.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-envelope-open-text"></i> Envoyer le lien de réinitialisation';
      return;
    }

    // Envoi de l'email de réinitialisation via Supabase
    // On indique l'adresse de la page où l'utilisateur pourra taper son nouveau mot de passe
    var redirectUrl = window.location.origin + '/HTML/Authentification/nouveau-mot-de-passe.html';

    window.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    })
    .then(function (result) {
      if (result.error) throw result.error;

      showMessage('success', 'Un email de réinitialisation a été envoyé si ce compte existe.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-envelope-open-text"></i> Envoyer le lien de réinitialisation';
    })
    .catch(function (err) {
      console.error('Reset error:', err);
      var text = getErrorMessage(err && err.message ? err.message : '');
      showMessage('error', text);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-envelope-open-text"></i> Envoyer le lien de réinitialisation';
    });
  });
});