SMART LOCATION — Déploiement Firebase

But
Permettre à d'autres personnes d'utiliser le site en ligne (inscription, publication d'annonces).

Pré-requis
- Avoir un compte Firebase (console.firebase.google.com)
- Node.js + npm installés pour utiliser `firebase-tools` (optionnel si vous utilisez Netlify/GitHub Pages)

Étapes rapides (Firebase Hosting)

1) Installer Firebase CLI
```bash
npm install -g firebase-tools
```

2) Se connecter et initialiser le projet
```bash
firebase login
firebase init hosting
# Choisir "Use an existing project" ou créer un nouveau
# Public directory: HTML
# Ne pas configurer SPA rewrites si vous servez plusieurs pages statiques
```

3) Remplacer la config Firebase
- Ouvrez `JAVASCRIPT/global/firebase-init.js` et collez la configuration fournie par la console Firebase (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).

4) Appliquer règles de sécurité
- Dans la console Firebase -> Firestore -> Rules, copiez le contenu de `firestore.rules`.
- Dans la console Firebase -> Storage -> Rules, copiez `storage.rules`.

5) Déployer
```bash
firebase deploy --only hosting
```

Alternatives
- Netlify / GitHub Pages: déposez le dossier `HTML` sur le service. Assurez-vous que `JAVASCRIPT/global/firebase-init.js` contient la config Firebase valide.

Notes
- Assurez-vous d'activer Authentication (Email/Password) dans la console Firebase.
- Testez l'inscription et la publication en local (Live Server) avant de déployer.
