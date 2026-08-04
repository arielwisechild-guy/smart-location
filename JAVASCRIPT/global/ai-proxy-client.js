document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('sendBtn');
  const promptEl = document.getElementById('prompt');
  const resultEl = document.getElementById('result');
  const statusEl = document.getElementById('auth-status');

  function setStatus(text) {
    if (!statusEl) return;
    if (!text) {
      statusEl.style.display = 'none';
      statusEl.textContent = '';
      return;
    }
    statusEl.style.display = 'block';
    statusEl.textContent = text;
  }

  async function getAuthState() {
    if (typeof auth === 'undefined') return null;
    const currentUser = auth.currentUser;
    if (currentUser) return currentUser;
    return new Promise((resolve) => {
      const unsub = auth.onAuthStateChanged((u) => {
        unsub();
        resolve(u);
      });
    });
  }

  async function getIdToken() {
    const user = await getAuthState();
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (err) {
      console.warn('Unable to get ID token', err);
      return null;
    }
  }

  function localGuideResponse(prompt) {
    const normalized = prompt.toLowerCase();
    if (/inscription|s'inscrire|creer mon compte|créer mon compte/.test(normalized)) {
      return 'Pour créer un compte, allez sur la page d\'inscription et suivez les instructions. Choisissez votre rôle, complétez vos informations et validez.';
    }
    if (/connexion|se connecter|login|mot de passe/.test(normalized)) {
      return 'Pour vous connecter, utilisez la page de connexion avec votre email et mot de passe. Si vous avez oublié votre mot de passe, utilisez la page de réinitialisation.';
    }
    if (/publier|annonce|mes annonces/.test(normalized)) {
      return 'Pour publier une annonce, allez sur la page "Publier" dans votre espace bailleur. Renseignez les détails du logement, ajoutez des photos et validez.';
    }
    if (/favoris|recherche|trouver|locataire/.test(normalized)) {
      return 'En tant que locataire, utilisez la page de recherche pour trouver un logement et la page favoris pour sauvegarder vos annonces préférées.';
    }
    if (/chef de quartier|signalement|moderation|modération/.test(normalized)) {
      return 'En tant que chef de quartier, consultez votre tableau de bord pour gérer les signalements et suivre l\'activité du quartier.';
    }
    return 'Je suis un guide du site Smart Location. Posez-moi une question sur l\'utilisation du site, l\'inscription, la connexion ou la gestion des annonces, et je vous répondrai.';
  }

  async function useFallback(prompt, message) {
    setStatus(message);
    resultEl.textContent = localGuideResponse(prompt);
  }

  btn.addEventListener('click', async function () {
    resultEl.textContent = '';
    const prompt = promptEl.value.trim();
    if (!prompt) { resultEl.textContent = 'Entrez un prompt.'; return; }
    btn.disabled = true;
    btn.textContent = 'Envoi...';
    try {
      const currentUser = await getAuthState();
      const idToken = await getIdToken();
      if (currentUser) {
        setStatus('Connecté en tant que ' + (currentUser.email || currentUser.displayName || 'utilisateur') + '.');
      } else {
        setStatus('Vous n\'êtes pas connecté. Je réponds quand même comme guide du site.');
      }
      const userContext = currentUser ? await getUserContext(currentUser) : null;
      const headers = { 'Content-Type': 'application/json' };
      if (idToken) headers.Authorization = 'Bearer ' + idToken;
      const res = await fetch('/.netlify/functions/ai-proxy', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: prompt, userContext: userContext })
      });
      if (!res.ok) {
        const text = await res.text();
        await useFallback(prompt, 'Fonction AI indisponible ou erreur serveur : réponse locale fournie.');
        return;
      }
      const data = await res.json();
      const choice = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || JSON.stringify(data, null, 2);
      resultEl.textContent = choice;
    } catch (e) {
      await useFallback(prompt, 'Impossible de contacter le serveur AI. Réponse locale fournie.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Envoyer';
    }
  });
});
