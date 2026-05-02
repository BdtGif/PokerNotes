# PokerNotes

> Suivi de main de poker en direct — application web statique, sans build, déployée sur GitHub Pages.

PokerNotes est un *tracker* léger qui permet, autour d'une vraie table, de
saisir une main au fil de l'eau : positions, blinds, antes, mises, relances,
all-ins, side-pots, et showdown. Tout fonctionne dans le navigateur, sans
serveur ni dépendance externe.

## Démo

Déploiement automatique sur GitHub Pages à chaque push sur `main` :

- Production : https://bdtgif.github.io/PokerNotes/

## Fonctionnalités

- Table 2 à 10 joueurs avec positions automatiques (BU, SB, BB, UTG, …).
- Blinds et antes (mode classique ou *BB-ante*).
- Saisie des actions par street (préflop, flop, turn, river).
- Gestion des all-ins et calcul des side-pots.
- Évaluation 7-cartes de Hold'em pour le showdown.
- Bascule d'unité jeton ↔ BB.
- UI tactile pensée pour mobile (Android/iOS), avec gestion du clavier
  virtuel pour ne pas casser la saisie en cours.

## Structure du projet

```
.
├── index.html              # Squelette HTML
├── assets/
│   ├── css/styles.css      # Styles
│   └── js/app.js           # Logique applicative (état, rendu, actions)
├── .github/workflows/
│   └── deploy-pages.yml    # Déploiement GitHub Pages
├── .editorconfig
├── .gitignore
├── .nojekyll               # Désactive Jekyll côté Pages
├── LICENSE                 # MIT
└── README.md
```

L'application est délibérément servie en *vanilla* HTML/CSS/JS : aucun
*bundler*, aucune dépendance npm, aucun framework. Le déploiement consiste à
publier le répertoire tel quel.

## Développement local

Aucun outillage requis. Servez le dossier avec n'importe quel serveur
statique :

```bash
# Python 3
python3 -m http.server 8000

# Node (npx)
npx --yes serve .
```

Puis ouvrez http://localhost:8000.

> Ouvrir `index.html` directement (`file://`) fonctionne aussi mais certains
> navigateurs limitent les fonctionnalités locales — préférez un serveur HTTP.

## Déploiement

Le workflow [`deploy-pages.yml`](.github/workflows/deploy-pages.yml) publie
automatiquement le contenu du dépôt sur GitHub Pages à chaque `push` sur
`main`. Aucune étape de build n'est nécessaire.

## Conventions

- Indentation : 2 espaces (voir [`.editorconfig`](.editorconfig)).
- Branches de fonctionnalité : `feat/<sujet>` ou `fix/<sujet>`.
- Commits : style impératif court (`add …`, `fix …`, `refactor …`).

## Licence

[MIT](LICENSE) © Benjamin de Thimé
