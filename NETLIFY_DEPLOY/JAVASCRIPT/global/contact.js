/* ============================================================
   SMART LOCATION — contact.js
   Rôle : validation et soumission du formulaire de contact
   ============================================================ */

(function () {

  var form    = document.querySelector('.contact-form');
  var msgEl   = document.querySelector('.contact-message');
  var submitBtn = form ? form.querySelector('.btn-submit-contact') : null;

  function validateEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function showMessage(type, text) {
    if (!msgEl) return;
    msgEl.className = 'contact-message ' + type;
    msgEl.textContent = text;
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var prenom  = form.prenom.value.trim();
      var nom     = form.nom.value.trim();
      var email   = form.email.value.trim();
      var sujet   = form.sujet.value;
      var message = form.message.value.trim();

      if (!prenom || !nom) { showMessage('error', 'Veuillez entrer votre prenom et nom.'); return; }
      if (!validateEmail(email)) { showMessage('error', 'Adresse email invalide.'); return; }
      if (!sujet)   { showMessage('error', 'Veuillez selectionner un sujet.'); return; }
      if (!message) { showMessage('error', 'Le message ne peut pas etre vide.'); return; }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Envoi en cours...';

      // TODO : remplacer par un appel Firebase / EmailJS
      setTimeout(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Envoyer le message';
        showMessage('success', 'Message envoye avec succes ! Nous vous repondrons dans les plus brefs delais.');
        form.reset();
      }, 1500);
    });
  }

})();
