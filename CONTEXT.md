# SMART LOCATION — Contexte du projet
Développé par : Ariel Wise Child & Mr. Google — © 2026

## Description
Plateforme web de location immobilière à Kinshasa, RDC.
Objectif : éliminer les commissionnaires (courtiers) qui font payer des frais illégaux.
La loi congolaise de 2015 limite la caution à 3 mois maximum.

## Stack technique
- HTML5, CSS3, JavaScript vanilla (zéro framework)
- Firebase Auth + Firestore (authentification et base de données)
- Supabase Storage (upload photos — gratuit)
- Font Awesome 6.5 (icônes via CDN)
- Google Fonts : Playfair Display + Inter

## Conventions STRICTES — ne jamais enfreindre
- Zéro `<style>` inline dans les HTML
- Zéro JavaScript inline dans les HTML
- Tout CSS dans des fichiers séparés liés via `<link>`
- Tout JS dans des fichiers séparés liés via `<script src="">`
- Dossier JS : `JAVASCRIPT/` (jamais `JAVA/` ou `js/`)
- Dossier Auth : `Authentification/` (orthographe française)
- Copyright : toujours 2026
- Développeurs : toujours "Ariel Wise Child & Mr. Google"

## Structure des dossiers
```
SMART-LOCATION/
├── index.html
├── CONTEXT.md
├── CSS/
│   ├── Authentification/
│   │   └── auth.css
│   ├── global/
│   │   ├── style.css        ← variables, reset, boutons
│   │   ├── navbar.css       ← navbar fixe + menu mobile
│   │   ├── footer.css       ← footer
│   │   ├── home.css         ← styles page d'accueil
│   │   ├── annonces.css     ← styles page annonces
│   │   └── pages.css        ← contact + a-propos
│   ├── bailleur/
│   │   └── bailleur.css
│   ├── locataire/
│   │   └── locataire.css
│   └── chef-quartier/
│       └── chef.css
├── HTML/
│   ├── Authentification/
│   │   ├── connexion.html   ← data-action="connexion"
│   │   └── inscription.html ← data-action="inscription"
│   ├── global/
│   │   ├── annonces.html
│   │   ├── contact.html
│   │   └── a-propos.html
│   ├── bailleur/
│   │   ├── dashboard.html
│   │   ├── publier.html
│   │   └── mes-annonces.html
│   ├── locataire/
│   │   ├── dashboard.html
│   │   ├── recherche.html
│   │   └── favoris.html
│   └── chef-quartier/
│       ├── dashboard.html
│       ├── moderation.html
│       └── signalements.html
└── JAVASCRIPT/
    ├── Authentification/
    │   └── auth.js          ← inscription + connexion Firebase
    ├── global/
    │   ├── firebase-init.js ← initialisation Firebase
    │   ├── navbar.js        ← burger menu mobile
    │   ├── main.js          ← logique page accueil
    │   ├── annonces.js      ← lecture annonces Firestore
    │   └── contact.js       ← formulaire contact
    ├── bailleur/
    │   └── bailleur.js      ← publication + Supabase Storage
    ├── locataire/
    │   └── locataire.js     ← recherche + favoris
    └── chef-quartier/
        └── chef.js          ← modération + signalements
```

## Firebase (projet : smart-location-82598)
- Auth : Email/Mot de passe activé
- Firestore : collections `users`, `annonces`, `signalements`
- SDK : compat (pas module/import)
- Initialisation : `JAVASCRIPT/global/firebase-init.js`

## Supabase (projet : smart_location)
- URL : https://czcnnfxyosmrvvbupfxu.supabase.co
- Bucket : `photos` (public)
- Usage : upload photos des annonces uniquement

## Ordre des scripts dans chaque HTML
```html
<!-- SDK Firebase -->
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js"></script>
<!-- Firebase init -->
<script src="../../JAVASCRIPT/global/firebase-init.js"></script>
<!-- Scripts page -->
<script src="../../JAVASCRIPT/global/navbar.js"></script>
<script src="../../JAVASCRIPT/[dossier]/[fichier].js"></script>
```

## Les 3 rôles utilisateurs
- **Bailleur** : publie des annonces, gère ses biens
- **Locataire** : cherche, sauvegarde favoris, appelle bailleurs
- **Chef de quartier** : valide/bloque annonces, gère signalements

## Design
- Couleurs : noir (#0a0a0a), blanc (#ffffff), or (#c8a96e)
- Typographie : Playfair Display (titres) + Inter (corps)
- Principe : zéro emoji, design épuré et professionnel

## Ce qui reste à faire
- Assistant IA intégré (Claude API)
- Google Maps pour localisation GPS des annonces
- Déploiement GitHub Pages ou Netlify
