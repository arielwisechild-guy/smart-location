/* ============================================================
   SMART LOCATION — auth.js
   Rôle : authentification Firebase réelle
   - Inscription avec rôle sauvegardé dans Firestore
   - Connexion avec redirection vers le bon dashboard
   - Toggle mot de passe, validation des champs
   Développé par : Ariel Wise Child & Mr. Google — © 2026
   ============================================================ */

(function () {

  /* ══════════════════════════════════════
     1. TOGGLE MOT DE PASSE
  ══════════════════════════════════════ */
  document.querySelectorAll('.toggle-pwd').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input    = btn.closest('.input-wrap').querySelector('input');
      if (!input)  return;
      var isHidden = input.type === 'password';
      input.type   = isHidden ? 'text' : 'password';
      btn.querySelector('i').classList.toggle('fa-eye',       !isHidden);
      btn.querySelector('i').classList.toggle('fa-eye-slash',  isHidden);
    });
  });

  /* ══════════════════════════════════════
     2. SELECTEUR DE ROLE (inscription)
  ══════════════════════════════════════ */
  var roleOptions        = document.querySelectorAll('.role-option');
  var roleFieldsSections = document.querySelectorAll('.role-fields');

  function activateRole(role) {
    roleOptions.forEach(function (opt) {
      var isActive = opt.dataset.role === role;
      opt.classList.toggle('active', isActive);
      var radio = opt.querySelector('input[type="radio"]');
      if (radio) radio.checked = isActive;
    });
    roleFieldsSections.forEach(function (section) {
      section.classList.toggle('visible', section.dataset.role === role);
    });
  }

  roleOptions.forEach(function (opt) {
    opt.addEventListener('click', function () { activateRole(opt.dataset.role); });
  });

  var urlParams = new URLSearchParams(window.location.search);
  var urlRole   = urlParams.get('role');
  if (urlRole && document.querySelector('.role-option[data-role="' + urlRole + '"]')) {
    activateRole(urlRole);
  } else if (roleOptions.length > 0) {
    activateRole(roleOptions[0].dataset.role);
  }

  /* ══════════════════════════════════════
     3. VALIDATION DES CHAMPS
  ══════════════════════════════════════ */
  function showFieldError(input, message) {
    input.classList.add('error');
    var errorEl = input.closest('.form-group') && input.closest('.form-group').querySelector('.form-error');
    if (errorEl) { errorEl.textContent = message; errorEl.classList.add('visible'); }
  }

  function clearFieldError(input) {
    input.classList.remove('error');
    var errorEl = input.closest('.form-group') && input.closest('.form-group').querySelector('.form-error');
    if (errorEl) errorEl.classList.remove('visible');
  }

  function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function validatePhone(v) { return /^(08|09)\d{8}$/.test(v.replace(/\s/g, '')); }

  function validateField(field) {
    var value = field.value.trim();
    var name  = field.name || field.id || '';
    if (field.required && value === '')                        { showFieldError(field, 'Ce champ est obligatoire.');           return false; }
    if (name === 'email'    && value && !validateEmail(value)) { showFieldError(field, 'Email invalide.');                    return false; }
    if (name === 'phone'    && value && !validatePhone(value)) { showFieldError(field, 'Numero invalide (ex: 0812345678).'); return false; }
    if (name === 'password' && value && value.length < 6)      { showFieldError(field, 'Minimum 6 caracteres.');             return false; }
    if (name === 'confirm_password') {
      var pwd = document.querySelector('input[name="password"]');
      if (pwd && value !== pwd.value) { showFieldError(field, 'Les mots de passe ne correspondent pas.'); return false; }
    }
    clearFieldError(field);
    return true;
  }

  document.querySelectorAll('.auth-form input, .auth-form select').forEach(function (field) {
    field.addEventListener('blur',  function () { validateField(field); });
    field.addEventListener('input', function () { if (field.classList.contains('error')) clearFieldError(field); });
  });

  /* ══════════════════════════════════════
     4. REDIRECTION PAR ROLE
  ══════════════════════════════════════ */
  function redirectByRole(role) {
    var routes = {
      bailleur:  '../../HTML/bailleur/dashboard.html',
      locataire: '../../HTML/locataire/dashboard.html',
      chef:      '../../HTML/chef-quartier/dashboard.html'
    };
    window.location.href = routes[role] || '../../index.html';
  }

  /* ══════════════════════════════════════
     5. CONNEXION
  ══════════════════════════════════════ */
  var connexionForm = document.querySelector('.auth-form[data-action="connexion"]');
  if (connexionForm) {
    connexionForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email    = connexionForm.querySelector('[name="email"]').value.trim();
      var password = connexionForm.querySelector('[name="password"]').value;
      var btn      = connexionForm.querySelector('.btn-submit');
      var msgEl    = document.querySelector('.auth-message');

      btn.disabled  = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Connexion...';

      auth.signInWithEmailAndPassword(email, password)
        .then(function (userCredential) {
          return db.collection('users').doc(userCredential.user.uid).get();
        })
        .then(function (doc) {
          if (doc.exists) {
            redirectByRole(doc.data().role);
          } else {
            showMessage(msgEl, 'error', 'Profil introuvable. Contactez le support.');
            btn.disabled  = false;
            btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Se connecter';
          }
        })
        .catch(function (error) {
          btn.disabled  = false;
          btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Se connecter';
          showMessage(msgEl, 'error', getErrorMessage(error.code));
        });
    });
  }

  /* ══════════════════════════════════════
     6. INSCRIPTION
  ══════════════════════════════════════ */
  var inscriptionForm = document.querySelector('.auth-form[data-action="inscription"]');
  if (inscriptionForm) {
    inscriptionForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var fields   = inscriptionForm.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), select');
      var allValid = true;
      fields.forEach(function (field) {
        if (field.offsetParent !== null && !validateField(field)) allValid = false;
      });

      var cgu   = inscriptionForm.querySelector('input[name="cgu"]');
      var msgEl = document.querySelector('.auth-message');

      if (cgu && !cgu.checked) {
        showMessage(msgEl, 'error', 'Veuillez accepter les conditions generales.');
        return;
      }
      if (!allValid) {
        showMessage(msgEl, 'error', 'Corrigez les erreurs avant de continuer.');
        return;
      }

      var prenom   = inscriptionForm.querySelector('[name="prenom"]').value.trim();
      var nom      = inscriptionForm.querySelector('[name="nom"]').value.trim();
      var email    = inscriptionForm.querySelector('[name="email"]').value.trim();
      var phone    = inscriptionForm.querySelector('[name="phone"]').value.trim();
      var password = inscriptionForm.querySelector('[name="password"]').value;
      var roleEl   = inscriptionForm.querySelector('input[name="role"]:checked');
      var role     = roleEl ? roleEl.value : 'locataire';

      var communeEl  = inscriptionForm.querySelector('[name="commune_' + role + '"]');
      var commune    = communeEl  ? communeEl.value  : '';
      var quartierEl = inscriptionForm.querySelector('[name="quartier_chef"]');
      var quartier   = quartierEl ? quartierEl.value : '';

      var btn = inscriptionForm.querySelector('.btn-submit');
      btn.disabled  = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creation du compte...';

      auth.createUserWithEmailAndPassword(email, password)
        .then(function (userCredential) {
          var uid = userCredential.user.uid;
          userCredential.user.updateProfile({ displayName: prenom + ' ' + nom });
          return db.collection('users').doc(uid).set({
            uid:       uid,
            prenom:    prenom,
            nom:       nom,
            email:     email,
            phone:     phone,
            role:      role,
            commune:   commune,
            quartier:  quartier,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        })
        .then(function () {
          redirectByRole(role);
        })
        .catch(function (error) {
          btn.disabled  = false;
          btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Creer mon compte';
          showMessage(msgEl, 'error', getErrorMessage(error.code));
        });
    });
  }

  /* ══════════════════════════════════════
     7. DECONNEXION
  ══════════════════════════════════════ */
  document.querySelectorAll('.sidebar-link.danger').forEach(function (lien) {
    lien.addEventListener('click', function (e) {
      e.preventDefault();
      auth.signOut().then(function () {
        window.location.href = '../../HTML/Authentification/connexion.html';
      });
    });
  });

  /* ══════════════════════════════════════
     8. PROTECTION DASHBOARDS
  ══════════════════════════════════════ */
  if (document.querySelector('.dashboard-page')) {
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        window.location.href = '../../HTML/Authentification/connexion.html';
      }
    });
  }

  /* ══════════════════════════════════════
     UTILITAIRES
  ══════════════════════════════════════ */
  function showMessage(el, type, text) {
    if (!el) return;
    el.className   = 'auth-message ' + type;
    el.textContent = text;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function getErrorMessage(code) {
    var messages = {
      'auth/user-not-found':         'Aucun compte trouve avec cet email.',
      'auth/wrong-password':         'Mot de passe incorrect.',
      'auth/invalid-credential':     'Email ou mot de passe incorrect.',
      'auth/email-already-in-use':   'Cet email est deja utilise.',
      'auth/weak-password':          'Mot de passe trop faible (minimum 6 caracteres).',
      'auth/invalid-email':          'Adresse email invalide.',
      'auth/too-many-requests':      'Trop de tentatives. Reessayez dans quelques minutes.',
      'auth/network-request-failed': 'Erreur reseau. Verifiez votre connexion internet.'
    };
    return messages[code] || 'Une erreur est survenue. Reessayez.';
  }

})();
