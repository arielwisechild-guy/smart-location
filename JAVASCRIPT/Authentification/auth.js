/* ============================================================
   SMART LOCATION — auth.js
   Rôle : authentification Supabase
   - Inscription avec rôle sauvegardé dans une table profiles
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
     4. REDIRECTION PAR ROLE & UTILITAIRES SUPABASE
  ══════════════════════════════════════ */
  function redirectByRole(role) {
    var routes = {
      bailleur:  '../../HTML/bailleur/dashboard.html',
      locataire: '../../HTML/locataire/dashboard.html',
      chef:      '../../HTML/chef-quartier/dashboard.html'
    };
    window.location.href = routes[role] || '../../index.html';
  }

  function ensureSupabaseProfile(user, profileData, password) {
    if (!isSupabaseReady() || !user) return Promise.resolve();

    return window.supabaseClient.auth.getSession().then(function (sessionResult) {
      var session = sessionResult && sessionResult.data && sessionResult.data.session;
      if (session) return session;

      if (!password) return null;

      return window.supabaseClient.auth.signInWithPassword({
        email: profileData.email,
        password: password
      }).then(function (signInResult) {
        if (signInResult.error) throw signInResult.error;
        return signInResult.data.session;
      });
    }).then(function () {
      return window.supabaseClient.from('profiles').upsert(profileData, { onConflict: 'id' }).then(function (res) {
        if (res.error) throw res.error;
        return res;
      });
    });
  }

  function isSupabaseReady() {
    return !!(window.supabaseClient && window.supabaseConfigStatus === 'ready');
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

      if (!isSupabaseReady()) {
        showMessage(msgEl, 'error', 'Supabase n\'est pas prêt. Remplacez l\'URL du projet et la clé anon réelle dans JAVASCRIPT/global/supabase-config.js.');
        btn.disabled  = false;
        btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Se connecter';
        return;
      }

      window.supabaseClient.auth.signInWithPassword({ email: email, password: password })
        .then(function (result) {
          if (result.error) throw result.error;
          return window.supabaseClient.from('profiles').select('role').eq('id', result.data.user.id).single().then(function (res) {
            if (res.error && res.error.code !== 'PGRST116') throw res.error;
            if (res.data && res.data.role) {
              redirectByRole(res.data.role);
            } else {
              redirectByRole('locataire');
            }
          });
        })
        .catch(function (error) {
          console.error('Connexion error:', error);
          btn.disabled  = false;
          btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Se connecter';
          var connMsg = getErrorMessage(error && error.message ? error.message : '');
          showMessage(msgEl, 'error', connMsg);
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
        showMessage(msgEl, 'error', 'Veuillez accepter les conditions générales.');
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
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Création du compte...';

      if (!isSupabaseReady()) {
        btn.disabled  = false;
        btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Créer mon compte';
        showMessage(msgEl, 'error', 'Supabase n\'est pas prêt. Remplacez l\'URL du projet et la clé anon réelle dans JAVASCRIPT/global/supabase-config.js.');
        return;
      }

      window.supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            prenom: prenom,
            nom: nom,
            phone: phone,
            role: role,
            commune: commune,
            quartier: quartier
          }
        }
      })
        .then(function (result) {
          if (result.error) throw result.error;
          return ensureSupabaseProfile(result.data.user, {
            id: result.data.user.id,
            prenom: prenom,
            nom: nom,
            email: email,
            phone: phone,
            role: role,
            commune: commune,
            quartier: quartier
          }, password);
        })
        .then(function () {
          redirectByRole(role);
        })
        .catch(function (error) {
          console.error('Inscription error:', error);
          btn.disabled  = false;
          btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Créer mon compte';

          var insMsg = getErrorMessage(error && error.message ? error.message : '');
          if (error && error.status === 401) {
            insMsg = 'Supabase a refusé la requête. Vérifiez la clé anon et l’activation du provider Email/Password.';
          }
          if (error && error.code === '42501') {
            insMsg = 'Le compte a été créé, mais la création du profil a été refusée par Supabase. Vérifiez les politiques RLS sur la table profiles.';
          }

          showMessage(msgEl, 'error', insMsg);
        });
    });
  }

  /* ══════════════════════════════════════
     7. DECONNEXION
  ══════════════════════════════════════ */
  document.querySelectorAll('.sidebar-link.danger').forEach(function (lien) {
    lien.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.supabaseClient) {
        window.supabaseClient.auth.signOut().then(function () {
          window.location.href = '../../HTML/Authentification/connexion.html';
        });
      } else {
        window.location.href = '../../HTML/Authentification/connexion.html';
      }
    });
  });

  /* ══════════════════════════════════════
     8. PROTECTION DASHBOARDS
  ══════════════════════════════════════ */
  if (document.querySelector('.dashboard-page')) {
    if (window.supabaseClient && window.supabaseClient.auth.onAuthStateChange) {
      window.supabaseClient.auth.onAuthStateChange(function (event, session) {
        if (!session) {
          window.location.href = '../../HTML/Authentification/connexion.html';
        }
      });
    }
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
      'Invalid login credentials': 'Email ou mot de passe incorrect.',
      'User already registered': 'Cet email est déjà utilisé par un autre compte.',
      'Password should be at least 6 characters': 'Mot de passe trop faible (minimum 6 caractères).',
      'Unable to validate email address: invalid format': 'Adresse email invalide.',
      'Email rate limit exceeded': 'Trop de tentatives. Réessayez dans quelques minutes.'
    };
    return messages[code] || (code || 'Une erreur est survenue lors de l\'authentification.');
  }

})();