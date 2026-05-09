# PokerNotes

> Suivi de main de poker en direct — application web statique, sans build, déployée sur GitHub Pages.

**🔗 Application en ligne : [bdtgif.github.io/PokerNotes](https://bdtgif.github.io/PokerNotes/)**

PokerNotes est un *tracker* léger qui permet, autour d'une vraie table, de
saisir une main au fil de l'eau : positions, blinds, antes, mises, relances,
all-ins, side-pots, et showdown. Tout fonctionne dans le navigateur, sans
serveur ni dépendance externe.

## Démo

Déploiement automatique sur GitHub Pages à chaque push :

- Production (`main`) : [https://bdtgif.github.io/PokerNotes/](https://bdtgif.github.io/PokerNotes/)
- Aperçus de branches : `https://bdtgif.github.io/PokerNotes/branches/<nom-de-branche>/`
  (le nom est utilisé tel quel comme arborescence, p. ex. `feat/foo` →
  `branches/feat/foo/`).

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
│   ├── deploy-pages.yml    # Déclenche le déploiement (appelle scripts/ci/deploy.js)
│   └── cleanup-pages.yml   # Nettoie le sous-dossier d'une branche supprimée
├── scripts/ci/             # Logique CI en Node (testable)
│   ├── paths.js            # Calculs purs : branche → chemin / URL / environnement
│   ├── exec.js             # Wrappers child_process
│   ├── github.js           # Client REST GitHub (deployments, comments)
│   ├── git-pages.js        # Synchro et push de l'arbre gh-pages
│   ├── prepare.js          # Phase 1 : assemble l'arbre gh-pages, crée le deployment
│   ├── finalize.js         # Phase 2 : marque le deployment success/failure, commente la PR
│   └── cleanup.js          # Workflow de suppression de branche
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
automatiquement le contenu du dépôt sur GitHub Pages à chaque `push`, sur
n'importe quelle branche. Aucune étape de build n'est nécessaire.

- `main` est publié à la racine de Pages → `https://bdtgif.github.io/PokerNotes/`.
- Les autres branches sont publiées dans `branches/<nom>/` →
  `https://bdtgif.github.io/PokerNotes/branches/<nom>/`. Le nom de branche
  est utilisé tel quel : une branche `feat/foo` se retrouve dans
  `branches/feat/foo/`.

À chaque push, le workflow :

1. Reconstruit la branche `gh-pages` (contenu de `main` à la racine + branche
   poussée sous `branches/<nom>/`).
2. Publie ce contenu via `actions/upload-pages-artifact` +
   `actions/deploy-pages` dans l'environnement `github-pages`. La source
   Pages reste donc « GitHub Actions », aucun réglage manuel n'est requis.
3. Pour les branches autres que `main`, crée un *GitHub Deployment* dans
   un environnement `preview/<branche>` avec l'URL d'aperçu, visible dans
   l'onglet *Deployments* et la barre latérale des PR.
4. Met à jour un commentaire « collant » sur chaque PR ouverte de la
   branche avec l'URL d'aperçu et le SHA du commit.

Le workflow [`cleanup-pages.yml`](.github/workflows/cleanup-pages.yml)
supprime le sous-dossier correspondant lorsqu'une branche est supprimée
puis re-déploie l'artefact Pages.

L'essentiel de la logique est en JavaScript dans
[`scripts/ci/`](scripts/ci/) : les workflows ne font qu'appeler
`node scripts/ci/prepare.js`, `node scripts/ci/finalize.js` et
`node scripts/ci/cleanup.js`.

## Conventions

- Indentation : 2 espaces (voir [`.editorconfig`](.editorconfig)).
- Branches de fonctionnalité : `feat/<sujet>` ou `fix/<sujet>`.
- Commits : style impératif court (`add …`, `fix …`, `refactor …`).

## Licence

[MIT](LICENSE) © Benjamin de Thimé
