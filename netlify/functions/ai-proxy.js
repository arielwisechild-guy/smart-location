// Netlify Function: AI proxy (server-side)
// Requirements for production:
// - Set environment variable OPENAI_API_KEY with your OpenAI key
// - Set FIREBASE_SERVICE_ACCOUNT to the JSON string of a Firebase service account
// Optional:
// - Set FREE_AI_ENDPOINT to a free external model endpoint (Hugging Face, open-source inference, etc.)
// This function verifies the Firebase ID token if provided, logs the request to Firestore (if admin available),
// and proxies the request to OpenAI or returns a free fallback assistant response.

const admin = (() => {
  try {
    return require('firebase-admin');
  } catch (e) {
    return null;
  }
})();

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  // Read OpenAI key if present. If absent, the function can still reply with a basic free fall-back assistant.
  const OPENAI_KEY = process.env.OPENAI_API_KEY || null;

  // Parse body
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const messages = body.messages || (body.prompt ? [{ role: 'user', content: body.prompt }] : null);
  if (!messages) return { statusCode: 400, body: 'Missing messages/prompt' };

  // Initialize Firebase Admin if service account provided
  let firebaseApp = null;
  if (admin && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (!admin.apps.length) {
        firebaseApp = admin.initializeApp({ credential: admin.credential.cert(sa) });
      } else {
        firebaseApp = admin.app();
      }
    } catch (e) {
      console.error('Failed to init firebase admin:', e.message || e);
    }
  }

    // Verify Firebase ID token from Authorization header if provided
  let uid = null;
  let idToken = null;
  const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      idToken = parts[1];
    }
  }

  if (firebaseApp && idToken) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (e) {
      console.warn('Token verify failed, continuing anonymously', e.message || e);
    }
  }

  let accountInfo = null;
  if (uid && firebaseApp) {
    try {
      const db = admin.firestore();
      const doc = await db.collection('users').doc(uid).get();
      if (doc.exists) accountInfo = doc.data();
    } catch (e) {
      console.warn('Unable to read user profile for AI context', e.message || e);
    }
  }

  const userContext = body.userContext || null;
  const systemMessages = [
    { role: 'system', content: 'Tu es le guide du site Smart Location. Aide l\'utilisateur à comprendre comment utiliser le site, les pages et les services disponibles.' },
    { role: 'system', content: 'Réponds toujours, même si l\'utilisateur n\'est pas connecté.' },
    { role: 'system', content: 'Si l\'utilisateur n\'est pas connecté, rappelle-lui poliment qu\'il n\'est pas connecté, puis réponds à sa demande avec des conseils utiles.' },
    { role: 'system', content: 'Si l\'utilisateur est connecté, adapte la réponse à son rôle et aux informations de son compte.' }
  ];

  if (uid && accountInfo) {
    systemMessages.push({
      role: 'system',
      content: `L'utilisateur est connecté. Profil détecté : rôle=${accountInfo.role || 'inconnu'}, commune=${accountInfo.commune || 'non définie'}, quartier=${accountInfo.quartier || 'non défini'}. Utilise ces informations pour adapter la réponse.`
    });
  } else if (userContext) {
    const contextDetails = Object.keys(userContext).filter(k => userContext[k]).map(k => `${k}=${userContext[k]}`).join(', ');
    if (contextDetails) {
      systemMessages.push({
        role: 'system',
        content: `Contexte utilisateur anonyme : ${contextDetails}. Utilise ces éléments si cela aide la réponse.`
      });
    }
  }

  const finalMessages = [...systemMessages, ...messages];

  // Log request to Firestore if possible
  let logRef = null;
  try {
    if (firebaseApp) {
      const db = admin.firestore();
      logRef = await db.collection('aiRequests').add({
        uid: uid || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        model: process.env.OPENAI_MODEL || null,
        status: 'pending'
      });
    }
  } catch (e) {
    console.warn('Log create failed', e.message || e);
  }

  async function respondWithFreeAI(messages) {
    const promptText = messages.filter(m => m.role === 'user').map(m => m.content).join('\n\n');
    if (/inscription|s'inscrire|creer mon compte/i.test(promptText)) {
      return 'Pour créer un compte, rendez-vous sur la page d\'inscription. Choisissez votre rôle (locataire, bailleur, chef de quartier), renseignez vos informations et validez. Si vous avez un compte, utilisez la page de connexion.';
    }
    if (/connexion|se connecter|login/i.test(promptText)) {
      return 'Pour vous connecter, allez sur la page de connexion et entrez votre email et votre mot de passe. Si vous avez oublié votre mot de passe, utilisez la page de réinitialisation.';
    }
    if (/annonce|publier|publier une annexe|mes annonces/i.test(promptText)) {
      return 'Pour publier une annonce, allez dans votre tableau de bord bailleur et utilisez la page "Publier". Remplissez les détails du logement, ajoutez des photos et soumettez l\'annonce.';
    }
    if (/favoris|recherche|trouver|locataire/i.test(promptText)) {
      return 'En tant que locataire, utilisez la page de recherche pour trouver des logements et la page favoris pour enregistrer ceux qui vous intéressent.';
    }
    if (/chef de quartier|signalement|moderation/i.test(promptText)) {
      return 'Pour un chef de quartier, consultez le tableau de bord du chef de quartier pour gérer les signalements et surveiller l\'activité locale.';
    }
    if (/où|comment|quel(le)|pourquoi/i.test(promptText)) {
      return 'Je suis le guide du site Smart Location. Posez-moi des questions sur les pages, l\'inscription, la connexion, les annonces ou les rôles, et je vous dirai où aller et comment faire.';
    }
    return 'Je suis un assistant gratuit pour Smart Location. Je peux vous expliquer les pages du site, l\'utilisation du compte et comment trouver des informations. Si vous n\'êtes pas connecté, je vous le rappelle poliment, mais je réponds quand même à votre question.';
  }

  if (!OPENAI_KEY) {
    try {
      if (process.env.FREE_AI_ENDPOINT) {
        const promptText = finalMessages.filter(m => m.role === 'user').map(m => m.content).join('\n\n');
        const resp = await fetch(process.env.FREE_AI_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: promptText })
        });
        const data = await resp.json();
        const freeText = typeof data === 'string' ? data : (data && data[0] && data[0].generated_text) || data?.generated_text || JSON.stringify(data);
        return { statusCode: 200, body: JSON.stringify({ choices: [{ message: { role: 'assistant', content: freeText } }] }) };
      }
      const freeText = await respondWithFreeAI(finalMessages);
      return { statusCode: 200, body: JSON.stringify({ choices: [{ message: { role: 'assistant', content: freeText } }] }) };
    } catch (err) {
      console.error('Free AI fallback error', err);
      return { statusCode: 502, body: 'AI provider error' };
    }
  }

  // Call OpenAI
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: finalMessages })
    });

    const data = await resp.json();

    // Update log
    try { if (logRef) await logRef.update({ status: 'sent', response: data, sentAt: admin.firestore.FieldValue.serverTimestamp() }); } catch (e) {}

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    console.error('OpenAI proxy error', err);
    try { if (logRef) await logRef.update({ status: 'failed', error: (err && err.message) || String(err) }); } catch (e) {}
    return { statusCode: 502, body: 'AI provider error' };
  }
};
