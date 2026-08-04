document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('chat-toggle');
  const panel = document.getElementById('chat-panel');
  const msgs = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');

  if (!toggle || !panel || !msgs || !input || !send) return;

  toggle.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  function append(role, text) {
    const el = document.createElement('div');
    el.style.padding = '8px';
    el.style.borderRadius = '8px';
    el.style.margin = '6px 0';
    el.style.whiteSpace = 'pre-wrap';
    el.style.fontSize = '14px';
    el.style.background = role === 'user' ? '#e7f1ff' : '#f6f6f6';
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
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
      return 'Pour publier une annonce, allez dans votre espace bailleur et utilisez la page "Publier". Renseignez les détails du logement, ajoutez des photos et validez.';
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
    append('assistant', message);
    append('assistant', localGuideResponse(prompt));
  }

  send.addEventListener('click', async () => {
    const prompt = input.value.trim();
    if (!prompt) return;
    append('user', prompt);
    input.value = '';
    send.disabled = true;
    try {
      const currentUser = await getAuthState();
      const idToken = await getIdToken();
      const userContext = currentUser ? await getUserContext(currentUser) : null;
      const headers = { 'Content-Type': 'application/json' };
      if (idToken) headers.Authorization = 'Bearer ' + idToken;
      const res = await fetch('/.netlify/functions/ai-proxy', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, userContext })
      });
      if (!res.ok) {
        const t = await res.text();
        await useFallback(prompt, 'Impossible de contacter le serveur AI : réponse locale fournie.');
        return;
      }
      const data = await res.json();
      const choice = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || (data && data.result) || JSON.stringify(data);
      append('assistant', choice);
    } catch (e) {
      await useFallback(prompt, 'Impossible de contacter le serveur AI : réponse locale fournie.');
    } finally {
      send.disabled = false;
    }
  });
});
