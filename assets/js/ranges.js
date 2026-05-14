/* ranges.js — Range data extrait du PDF Ranges.pdf */

const _R = 'AKQJT98765432';
const _RI = Object.fromEntries([..._R].map((r, i) => [r, i]));

/** Normalise deux cartes en string canonique ('Ah','Kd' → 'AKo') */
export function normalizeHand(c1, c2) {
  if (!c1 || !c2 || c1.length < 2 || c2.length < 2) return null;
  const r1 = c1[0], r2 = c2[0], s1 = c1[1], s2 = c2[1];
  if (r1 === r2) return r1 + r2;
  const [hi, lo, hs, ls] = _RI[r1] < _RI[r2] ? [r1,r2,s1,s2] : [r2,r1,s2,s1];
  return hi + lo + (hs === ls ? 's' : 'o');
}

// ── Open ranges (page 2 du PDF) ───────────────────────────────────────────

// BTN référence (~40%) — toutes les cellules colorées non-vertes
const _BTN_OPEN = new Set(['22','33','44','54s','55','64s','65s','66','75s','76s','77',
  '85s','86s','87s','88','95s','96s','97s','98o','98s','99',
  'A2o','A2s','A3o','A3s','A4o','A4s','A5o','A5s','A6o','A6s','A7o','A7s',
  'A8o','A8s','A9o','A9s','AA','AJo','AJs','AKo','AKs','AQo','AQs','ATo','ATs',
  'J4s','J5s','J6s','J7s','J8o','J8s','J9o','J9s','JJ','JTo','JTs',
  'K2s','K3s','K4s','K5s','K6s','K7o','K7s','K8o','K8s','K9o','K9s',
  'KJo','KJs','KK','KQo','KQs','KTo','KTs',
  'Q2s','Q3s','Q4s','Q5s','Q6s','Q7s','Q8o','Q8s','Q9o','Q9s','QJo','QJs','QQ','QTo','QTs',
  'T5s','T6s','T7s','T8o','T8s','T9o','T9s','TT']);

// CO (~26%) — BTN sans les mains les plus larges
const _CO_OPEN = new Set([..._BTN_OPEN].filter(h =>
  !['22','75s','98o','A2o','A3o','A4o','A5o','A6o',
    'J5s','J6s','J8o','J9o','K2s','K7o','K8o',
    'Q3s','Q4s','Q5s','Q8o','Q9o','T5s','T6s','T8o'].includes(h)));

// HJ (~22%) — CO sans les mains larges suivantes
const _HJ_OPEN = new Set([..._CO_OPEN].filter(h =>
  !['33','54s','64s','86s','A7o','A8o','J4s','J7s','K3s','K4s','Q7s','T7s'].includes(h)));

// EP/LJ (~19%) — HJ sans les mains borderline
const _EP_OPEN = new Set([..._HJ_OPEN].filter(h =>
  !['55','65s','85s','95s','96s','K5s','K9o','Q2s','Q6s','T9o',
    '44','76s','K6s','K7s'].includes(h)));

// Losification BTN (mains ajoutées en spot favorable)
const _OPEN_LOSIF = new Set(['J3s','J2s','T4s','94s','84s','74s','63s','53s','43s',
  'J7o','T7o','97o','87o','86o','76o','Q7o','K6o','Q6o','K5o','K4o']);

// SB open en BvB (page 8 — Early game)
const _SB_OPEN = new Set(['AA','KK','QQ','JJ','TT','99',
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  'AKo','AQo','AJo','ATo',
  'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
  'KQo','KJo','KTo','K9o','K8o','K7o','K6o','K5o','K4o',
  'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s',
  'QJo','QTo','Q9o','Q8o',
  'JTs','J9s','J8s','J7s','J6s','JTo','J9o',
  'T9s','T8s','T7s','T6s','T9o','T8o',
  '98s','97s','96s','87s','86s','85s','76s','75s','74s',
  '65s','64s','63s','54s','53s','52s','43s','42s']);

// ── Réponse à un open (Call/3-bet) ────────────────────────────────────────

// 3-bet value (commun à toutes les positions)
const _3BET_VALUE = new Set(['AA','KK','QQ','JJ','AKs','AKo']);

// BTN face à un open (page 3)
const _BTN_3BET_BLUFF = new Set(['A4s','Q9s','J9s','87s','76s']);
const _BTN_CALL = new Set(['ATs','AQs','AQo','AJo','AJs','A5s','A6s','A7s','A8s','A9s',
  'KQs','KJs','KTs','K9s','KQo','KJo','K8s',
  'QJs','QTs','QJo','JTs','T9s','T8s',
  'TT','99','88','77','66','55','44','98s']);

// CO face à un open (page 4)
const _CO_3BET_BLUFF = new Set(['J9s','98s']);
const _CO_CALL = new Set(['AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A3s',
  'KQs','KJs','KTs','KQo',
  'QJs','QTs','JTs','TT','99','88','77','66','55','AQo','T9s']);

// HJ face à un open (page 5)
const _HJ_3BET_BLUFF = new Set([]);
const _HJ_CALL = new Set(['AQs','AJs','ATs','A9s','A8s','A7s',
  'KQs','KJs','KTs','KQo',
  'QJs','QTs','JTs','TT','99','88','77','66','55','AQo']);

// SB face à un open BTN (page 6)
const _SB_3BET_BLUFF = new Set(['A6s','TT','QTs','QJs','KTs','KQo','AJo','JTs','T9s','77','66']);
const _SB_CALL = new Set(['AQs','AJs','ATs','A9s','A8s','A7s',
  'KQs','KJs','K8s','K9s','J9s','J8s','T8s','T9s',
  '99','88','87s','98s','AQo','KJo','KTo','QJo','55','Q9s']);

// ── Défense BB (page 7) ───────────────────────────────────────────────────

// Call dans n'importe quel spot (mains fortes)
const _BB_ALWAYS = new Set(['42s','53s','63s','64s','74s','75s','85s','86s','87s',
  '95s','96s','97s','98s',
  'A2s','A3s','A4o','A4s','A5o','A5s','A6o','A6s','A7o','A7s',
  'A8o','A8s','A9o','A9s','AA','AJo','AJs','AKo','AKs','AQo','AQs','ATo','ATs',
  'J6s','J7s','J8s','J9s','JJ','JTo','JTs',
  'K2s','K3s','K4s','K5s','K6s','K7s','K8s','K9s',
  'KJo','KJs','KK','KQo','KQs','KTo','KTs',
  'Q5s','Q6s','Q7s','Q8s','Q9s','QJo','QJs','QQ','QTo','QTs',
  'T6s','T7s','T8s','T9s','TT']);

// Call en spot mitigé ou rêvé
const _BB_MITIGE = new Set(['52s','62s','72s','73s','83s','84s','88','94s','99',
  'J2s','J3s','J4s','J5s','J9o','K8o','K9o',
  'Q2s','Q3s','Q4s','Q9o','T3s','T4s','T5s','T9o']);

// Call uniquement en spot rêvé
const _BB_REVE = new Set(['54s','55','65s','66','76s','77','82s','87o','92s','93s',
  '98o','J8o','K4o','K5o','K6o','K7o','Q6o','Q7o','Q8o','T2s','T8o']);

// ── Fonctions d'analyse ───────────────────────────────────────────────────

function _openRange(pos) {
  switch (pos) {
    case 'BU': return _BTN_OPEN;
    case 'CO': return _CO_OPEN;
    case 'HJ': return _HJ_OPEN;
    case 'SB': return _SB_OPEN;
    default:   return _EP_OPEN; // UTG, UTG+1, UTG+2, MP, LJ
  }
}

function _analyzeOpen(hand, pos, action) {
  const range = _openRange(pos);
  const posLabel = pos === 'BU' ? 'BTN' : pos;
  const inRef   = range.has(hand);
  const inLosif = _OPEN_LOSIF.has(hand);
  const scenario = `Open premier à parler (${posLabel})`;

  if (action === 'raise' || action === 'allin') {
    if (inRef) return {
      ok: true, note: `Open ✓ — range ${posLabel}`, scenario,
      conseil: `${hand} est dans le range d'open ${posLabel}. L'open raise est l'action optimale : cette main génère une EV positive depuis cette position et donne l'initiative pour la suite. Continuez à ouvrir systématiquement les mains de votre range — la cohérence de fréquence est clé.`
    };
    if (inLosif) return {
      ok: true, note: `Open ✓ — range élargi (spot +)`, scenario,
      conseil: `${hand} est dans le range étendu (spot favorable). Avec un avantage positionnel maximal ou face à des adversaires passifs, cette main devient rentable à ouvrir. Réservez-la aux situations idéales : BTN dernier à parler, table avec peu de 3-betteurs, ou stack adapté.`
    };
    return {
      ok: false, note: `Open ✗ — hors range ${posLabel}`, scenario,
      conseil: `${hand} est hors range d'open depuis ${posLabel}. Cette main n'a pas assez d'équité et de playabilité pour un open profitable ici. Ouvrir des mains hors range nuit à votre image et offre à vos adversaires des situations d'exploitation. Préférez un fold et attendez une main dans votre range.`
    };
  }
  if (action === 'fold') {
    if (inRef) return {
      ok: false, note: `Fold ✗ — main dans le range ${posLabel}`, scenario,
      conseil: `${hand} est dans le range d'open ${posLabel}. Vous auriez dû open raise : abandonner les blinds gratuitement avec une main profitable est une erreur de fréquence. Identifiez pourquoi vous avez foldé (peur des relances ? manque de confiance ?) et travaillez votre range d'ouverture depuis cette position.`
    };
    if (inLosif) return {
      ok: null, note: `Fold ✓/⚠ — valide sauf en spot rêvé`, scenario,
      conseil: `${hand} est dans le range étendu (spot favorable). Le fold est acceptable ici mais en situation idéale — à la BTN face à des adversaires passifs — cette main devient profitable à ouvrir. Gardez-la dans votre arsenal pour les spots à haute EV uniquement.`
    };
    return {
      ok: true, note: `Fold ✓`, scenario,
      conseil: `${hand} est hors range d'open depuis ${posLabel}. Le fold est la décision correcte. Cette main n'a pas assez de potentiel postflop ni d'équité crue pour justifier une ouverture depuis cette position. Attendez une meilleure main.`
    };
  }
  return null;
}

function _analyzeVsRaise(hand, heroPos, action, raiserPos) {
  const is3bv  = _3BET_VALUE.has(hand);
  let bluffSet, callSet;
  switch (heroPos) {
    case 'BU': bluffSet = _BTN_3BET_BLUFF; callSet = _BTN_CALL; break;
    case 'CO': bluffSet = _CO_3BET_BLUFF;  callSet = _CO_CALL;  break;
    case 'HJ': bluffSet = _HJ_3BET_BLUFF;  callSet = _HJ_CALL;  break;
    case 'SB': bluffSet = _SB_3BET_BLUFF;  callSet = _SB_CALL;  break;
    default:   bluffSet = new Set();        callSet = new Set();
  }
  const is3bb  = bluffSet.has(hand);
  const isCall = callSet.has(hand);
  const posLabel    = heroPos === 'BU' ? 'BTN' : heroPos;
  const raiserLabel = raiserPos === 'BU' ? 'BTN' : raiserPos;
  const scenario = `Face à un open ${raiserLabel} depuis ${posLabel}`;

  if (action === 'raise' || action === 'allin') {
    if (is3bv) return {
      ok: true, note: '3-bet value ✓', scenario,
      conseil: `${hand} est une main top 4% (range 3-bet value : AA, KK, QQ, JJ, AKs/o). Le 3-bet est obligatoire : vous construisez le pot avec la meilleure main et vous forcez l'adversaire à une décision difficile immédiatement. Ne slowplayez pas ces mains — le call perd de la valeur en permettant aux mains dominées de réaliser leur équité gratuitement.`
    };
    if (is3bb) return {
      ok: true, note: '3-bet bluff ✓', scenario,
      conseil: `${hand} est dans le range de 3-bet bluff depuis ${posLabel}. Cette main est idéale comme bluff : elle combine connectivité ou bloqueurs avec un bon potentiel postflop. Le 3-bet crée de la pression, donne l'initiative et peut décrocher le pot immédiatement face aux mains marginales de l'openeur.`
    };
    if (isCall) return {
      ok: false, note: '3-bet ✗ — call recommandé', scenario,
      conseil: `${hand} est dans le range de call depuis ${posLabel}, pas de 3-bet. Le 3-bet ici est trop thin : vous n'avez pas assez de valeur pour jouer un gros pot 3-bet ni les caractéristiques d'un bon bluff. Préférez le call — cette main réalise bien son équité passivement et vous évitez d'être 4-betté et obligé de folder.`
    };
    return {
      ok: false, note: '3-bet ✗ — fold recommandé', scenario,
      conseil: `${hand} est hors range de jeu depuis ${posLabel} face à un open ${raiserLabel}. Le 3-bet serait une erreur : sans valeur ni potentiel de bluff, vous créez un gros pot avec une main désavantagée. La décision optimale est le fold.`
    };
  }
  if (action === 'call') {
    if (is3bv) return {
      ok: false, note: 'Call ✗ — 3-bet value recommandé', scenario,
      conseil: `${hand} (top 4%) doit toujours être 3-bettée pour sa valeur. Le call ici est une erreur de sizing : vous permettez à des mains comme AQ, KQ, JJ de voir un flop à size réduit avec une chance de vous battre. Le 3-bet construit un gros pot avec l'avantage dès le départ.`
    };
    if (is3bb) return {
      ok: false, note: 'Call ✗ — 3-bet bluff recommandé', scenario,
      conseil: `${hand} est dans le range de 3-bet bluff depuis ${posLabel}. Le call n'exploite pas le potentiel de cette main — ses caractéristiques (bloqueurs ou connectivité) en font un excellent bluff, pas un cold-call passif. Un 3-bet ici ajoute de la pression et peut décrocher le pot sans même aller au flop.`
    };
    if (isCall) return {
      ok: true, note: 'Call ✓', scenario,
      conseil: `${hand} est dans le range de call depuis ${posLabel}. Le call est l'action optimale : cette main n'est pas assez forte pour 3-better (risque d'être dominée ou de jouer un gros pot OOP) mais a assez de potentiel postflop pour justifier l'investissement. Jouez de manière réactive et exploitez votre position.`
    };
    return {
      ok: false, note: 'Call ✗ — fold recommandé', scenario,
      conseil: `${hand} est hors range de call depuis ${posLabel} face à un open ${raiserLabel}. Le call perd de l'EV : vous n'avez pas assez de potentiel postflop pour justifier l'investissement contre un range d'open défini. Le fold préserve votre stack pour de meilleures situations.`
    };
  }
  if (action === 'fold') {
    if (is3bv || is3bb || isCall) return {
      ok: false, note: 'Fold ✗ — main jouable (call ou 3-bet)', scenario,
      conseil: `${hand} est une main jouable depuis ${posLabel} : ${is3bv ? 'top 4% — 3-bet value obligatoire' : is3bb ? '3-bet bluff recommandé' : 'call recommandé face à cet open'}. Le fold abandonne de l'EV positive. Revoyez cette situation et identifiez ce qui vous a bloqué — peur du stack-off ou incertitude sur votre range ?`
    };
    return {
      ok: true, note: 'Fold ✓', scenario,
      conseil: `${hand} est hors range de défense depuis ${posLabel} face à un open ${raiserLabel}. Le fold est correct : sans potentiel de call ni de 3-bet profitable, vous évitez les situations désavantageuses avec une main faible face au range d'open de l'adversaire.`
    };
  }
  return null;
}

const _EARLY_POS = new Set(['UTG','UTG+1','UTG+2','MP','LJ']);

function _analyzeBBDefense(hand, action, raiserPos) {
  const isAlways = _BB_ALWAYS.has(hand);
  const isMitige = _BB_MITIGE.has(hand);
  const isReve   = _BB_REVE.has(hand);
  const raiserLabel = raiserPos === 'BU' ? 'BTN' : raiserPos;
  const spotLabel = _EARLY_POS.has(raiserPos) ? 'rêvé (EP)' : raiserPos === 'BU' ? 'mitigé (BTN)' : 'mitigé';
  const scenario = `Défense BB face à un open ${raiserLabel}`;

  if (action === 'call' || action === 'check') {
    if (isAlways) return {
      ok: true, note: 'Défense BB ✓ — main forte', scenario,
      conseil: `${hand} est dans le range de défense systématique du BB, quelle que soit la position de l'openeur. Défendre est l'action optimale : vous bénéficiez du size des blinds déjà investies et cette main a assez d'équité ou de potentiel postflop pour compenser le désavantage positionnel. Continuez à défendre ces mains systématiquement.`
    };
    if (isMitige) return {
      ok: null, note: `Défense BB ⚠ — spot ${spotLabel} recommandé`, scenario,
      conseil: `${hand} est dans le range de défense mitigée du BB. Face à un open ${raiserLabel}, la défense est acceptable mais borderline. Ces mains défendent mieux face aux opens larges (BTN, CO) où l'adversaire a beaucoup de bluffs. Face à EP dont le range est plus tight, le fold devient plus justifié car vous serez souvent dominé.`
    };
    if (isReve) return {
      ok: null, note: 'Défense BB ⚠ — spot rêvé uniquement', scenario,
      conseil: `${hand} ne défend que dans les meilleurs spots : face à un open BTN très large ou un CO passif. Face à ${raiserLabel}, le call est marginal — cette main a peu d'équité contre un range tight et risque d'être souvent dominée. Envisagez un fold face aux positions early et réservez cette défense aux situations idéales.`
    };
    return {
      ok: false, note: 'Défense BB ✗ — fold recommandé', scenario,
      conseil: `${hand} est hors range de défense BB même avec le size des blinds. Face à ${raiserLabel}, cette main n'a pas assez d'équité pour compenser le désavantage positionnel. Le fold préserve votre stack et évite les situations où vous jouez OOP avec une main faible contre un range défini.`
    };
  }
  if (action === 'fold') {
    if (isAlways) return {
      ok: false, note: 'Fold ✗ — main forte, défense recommandée', scenario,
      conseil: `${hand} est dans le range de défense systématique du BB — vous auriez dû défendre. Le BB est la seule position avec un investissement forcé qui rend la défense correcte avec un grand nombre de mains. Ici le fold abandonne de l'EV : vous payez déjà 0.5 bb pour un pot où votre main est rentable à jouer.`
    };
    if (isMitige && !_EARLY_POS.has(raiserPos)) return {
      ok: null, note: 'Fold ⚠ — acceptable en spot cata', scenario,
      conseil: `${hand} est une main borderline en défense BB. Le fold face à ${raiserLabel} est acceptable mais pas optimal : face à un range large (BTN/CO), cette main avait de l'EV positive en défendant. Analysez le profil de l'openeur — face à un joueur loose, la défense était probablement la bonne décision.`
    };
    return {
      ok: true, note: 'Fold ✓', scenario,
      conseil: `${hand} est hors range de défense BB face à ${raiserLabel}. Le fold est la décision correcte. Malgré le size des blinds, cette main n'a pas assez d'équité ou de potentiel postflop pour compenser le désavantage positionnel permanent que vous aurez tout au long de la main.`
    };
  }
  if (action === 'raise') {
    if (_3BET_VALUE.has(hand)) return {
      ok: true, note: '3-bet value ✓ depuis BB', scenario,
      conseil: `${hand} (top 4%) doit être 3-bettée même depuis le BB. Le 3-bet construit le pot avec la meilleure main et transforme le désavantage positionnel en avantage d'initiative. Ne slowplayez pas les mains premium — laissez l'adversaire prendre sa décision avec une information incomplète dès le préflop.`
    };
    return {
      ok: null, note: '3-bet depuis BB', scenario,
      conseil: `Un 3-bet depuis le BB avec ${hand} est une ligne non standard. Le range de 3-bet BB se concentre sur les mains top 4% (AA, KK, QQ, JJ, AKs/o). Les autres mains jouables préfèrent généralement appeler (si dans le range de défense) ou folder (si trop faibles), sauf profil très exploitable de l'adversaire.`
    };
  }
  return null;
}

/**
 * Analyse l'action préflop de Hero et retourne un verdict.
 * @param {Object} hand — enregistrement de main issu de storage.js
 * @returns {{ handStr, heroPos, heroAction, result } | null}
 */
export function analyzeHandPreflop(hand) {
  const hero = hand.players?.[hand.heroIdx];
  if (hand.heroIdx == null || !hero) return null;
  if (!hero.cards || hero.cards.length < 2 || !hero.cards[0] || !hero.cards[1]) return null;

  const handStr = normalizeHand(hero.cards[0], hero.cards[1]);
  if (!handStr) return null;

  const heroPos    = hero.pos;
  const pfActions  = hand.streets?.preflop?.actions || [];

  const heroActIdx = pfActions.findIndex(a => a.pos === heroPos);
  if (heroActIdx === -1) return { handStr, heroPos, heroAction: null, result: null };

  const heroAction  = pfActions[heroActIdx];
  const actsBefore  = pfActions.slice(0, heroActIdx);
  const raiseBefore = [...actsBefore].reverse().find(a => a.action === 'raise' || a.action === 'allin');

  let result;
  if (!raiseBefore) {
    result = _analyzeOpen(handStr, heroPos, heroAction.action);
  } else if (heroPos === 'BB') {
    result = _analyzeBBDefense(handStr, heroAction.action, raiseBefore.pos);
  } else {
    result = _analyzeVsRaise(handStr, heroPos, heroAction.action, raiseBefore.pos);
  }

  return { handStr, heroPos, heroAction: heroAction.action, result };
}

// ── Classification de board (Sizing-Cbet.pdf) ────────────────────────────────

const _RV = Object.fromEntries([...'AKQJT98765432'].map((r, i) => [r, 14 - i]));
// A=14, K=13, Q=12, J=11, T=10, 9=9, 8=8, 7=7, 6=6, 5=5, 4=4, 3=3, 2=2

/**
 * Classifie un flop en 3 catégories selon le PDF Sizing-Cbet.pdf (BTN vs BB).
 * @param {string[]} cards — tableau de 3 cartes ex. ['Ah','Kd','7s']
 * @returns {{ category: string, label: string, desc: string, sizing: Object } | null}
 *   sizing: { earlyGame, midLate, shallow } — pourcentages pot recommandés
 */
export function classifyFlop(cards) {
  if (!cards || cards.length < 3) return null;

  const ranks = cards.slice(0, 3).map(c => _RV[c[0]] || 0);
  const suits  = cards.slice(0, 3).map(c => c[1]);

  ranks.sort((a, b) => b - a); // décroissant: [hi, mid, lo]
  const [hi, mid, lo] = ranks;

  // Flush draw
  const suitCounts = suits.reduce((a, s) => { a[s] = (a[s] || 0) + 1; return a; }, {});
  const maxSuit    = Math.max(...Object.values(suitCounts));
  const isMonotone = maxSuit === 3;
  const isTwoTone  = maxSuit === 2;
  const isRainbow  = maxSuit === 1;

  // Board pairé
  const isPaired = new Set(ranks).size < 3;

  // Connectivité : gap minimal entre deux cartes adjacentes triées
  const gap1 = hi - mid;
  const gap2 = mid - lo;
  const minGap = Math.min(gap1, gap2);

  // Catégorie de hauteur
  const isAKHigh  = hi >= 13;          // A ou K en haut
  const isMedHigh = hi >= 8 && hi <= 12; // Q J T 9 8
  const isLow     = hi <= 7;            // 7 et moins

  // ── Extra Dry : A/K high, arc-en-ciel, sans draw (gap > 3 entre toutes paires)
  if (isAKHigh && isRainbow && minGap > 3 && !isPaired) {
    return {
      category: 'extra-dry',
      label: 'Extra Dry',
      desc: 'A/K high, rainbow, sans draw',
      sizing: { earlyGame: 33, midLate: 25, shallow: 20 }
    };
  }

  // ── Drawy : low, monotone, medium connecté ou board pairé bas
  if (isLow || isMonotone || (isMedHigh && minGap <= 2) || (isPaired && lo <= 9 && !isAKHigh)) {
    const why = isLow      ? '7-high ou moins — board très connecté'
              : isMonotone ? 'board monotone — flush draw complet'
              : isMedHigh  ? 'medium high avec draws importants'
              :               'board pairé bas — nombreuses opportunités de check-raise BB';
    return {
      category: 'drawy',
      label: 'Drawy',
      desc: why,
      sizing: { earlyGame: 66, midLate: 50, shallow: 33 }
    };
  }

  // ── Dry : tout le reste (A/K avec flush draw, Q-8 sans draw significatif)
  const why = isAKHigh ? 'A/K high avec draw possible' : 'medium high sans draw significatif';
  return {
    category: 'dry',
    label: 'Dry',
    desc: why,
    sizing: { earlyGame: 50, midLate: 33, shallow: 25 }
  };
}

/**
 * Analyse l'action postflop de Hero sur une street donnée.
 * @param {string}   streetKey      — 'flop' | 'turn' | 'river'
 * @param {Object}   heroAction     — {pos, action, amount}
 * @param {number}   potBeforeHero  — pot juste avant l'action de Hero
 * @param {Array}    streetActions  — toutes les actions de la street
 * @param {string[]} [boardCards]   — cartes du board de la street (pour flop)
 * @returns {{ verdict: string, conseil: string } | null}
 */
export function analyzePostflopAction(streetKey, heroAction, potBeforeHero, streetActions, boardCards) {
  const action   = heroAction.action;
  const amount   = heroAction.amount || 0;
  const heroIdx  = streetActions.indexOf(heroAction);
  const actsBefore = streetActions.slice(0, heroIdx);
  const hasBetBefore = actsBefore.some(a => a.action === 'raise' || a.action === 'allin');
  const lbl = streetKey === 'flop' ? 'Flop' : streetKey === 'turn' ? 'Turn' : 'River';

  if (action === 'raise' || action === 'allin') {
    const isBet = !hasBetBefore;
    const v = isBet ? 'Mise' : 'Relance';

    if (action === 'allin') {
      return {
        verdict: 'All-in',
        conseil: `Shove au ${lbl}. Cette ligne représente soit une main très forte (value), soit un bluff total. Pour être équilibré, votre range d'all-in doit combiner des nuts et des bluffs sélectionnés. Vérifiez que votre main justifie cette pression extrême selon le board et le profil de votre adversaire.`
      };
    }

    const ratio = potBeforeHero > 0 ? amount / potBeforeHero : 0;
    const pct   = Math.round(ratio * 100);

    // ── C-bet flop : classification board + sizing recommandé (BTN vs BB, Early Game) ──
    if (streetKey === 'flop' && isBet && boardCards?.length >= 3) {
      const flop = classifyFlop(boardCards);
      if (flop) {
        const rec   = flop.sizing.earlyGame;
        const delta = pct - rec;
        let verdict, conseil;

        if (Math.abs(delta) <= 10) {
          verdict = `C-bet ✓ ${pct}% — board ${flop.label}`;
          conseil = `Votre c-bet de ${pct}% est aligné avec le sizing recommandé (~${rec}%) pour un board ${flop.label} (${flop.desc}). ${flop.category === 'extra-dry' ? `Sur un board extra dry, vous bénéficiez d'un fort avantage de range — une petite mise suffit à extraire de la valeur car l'adversaire défend avec beaucoup de mains dominées. Misez avec un range large.` : flop.category === 'dry' ? `Sur un board dry, une mise ~${rec}% équilibre votre range value/bluff tout en protégeant vos mains contre les draws potentiels. Sélectionnez vos bluffs avec des backdoor draws.` : `Sur un board drawy, une mise plus grosse de ~${rec}% est indispensable — votre adversaire a de nombreux draws et doit payer suffisamment cher pour ne pas avoir un appel profitable.`}`;
        } else if (delta < -10) {
          verdict = `C-bet trop petite (${pct}% vs ~${rec}% rec.) — board ${flop.label}`;
          conseil = `Sur un board ${flop.label} (${flop.desc}), le sizing recommandé est ~${rec}% du pot. Votre mise de ${pct}% est trop petite : ${flop.category === 'drawy' ? `les boards drawy nécessitent une mise plus grosse — donner un bon size aux draws adverses rend leurs calls trop profitables. Visez ~${rec}% pour qu'ils paient correctement leur équité.` : flop.category === 'dry' ? `sur ce board dry, une mise plus petite laisse de la valeur sur la table et donne à l'adversaire un excellent size pour flotter avec des mains marginales. Préférez ~${rec}%.` : `même sur un board extra dry, allez à ${rec}% pour extraire de la valeur — votre adversaire doit payer pour ses mains dominées.`}`;
        } else {
          verdict = `C-bet trop grande (${pct}% vs ~${rec}% rec.) — board ${flop.label}`;
          conseil = `Sur un board ${flop.label} (${flop.desc}), le sizing recommandé est ~${rec}% du pot. Votre mise de ${pct}% est trop grande : ${flop.category === 'extra-dry' ? `sur les boards extra dry, une grosse mise réduit votre fréquence de c-bet — vous ne pouvez pas la justifier avec assez de bluffs. Préférez ${rec}% pour c-beter avec un range plus large et extraire de la valeur de manière moins risquée.` : `cette taille met trop de pression avec votre range complet — l'adversaire va folder les mains marginales mais défendre avec ses mains fortes, réduisant votre EV globale. Visez ~${rec}% pour un range de c-bet plus équilibré.`}`;
        }

        return { boardInfo: flop, verdict, conseil };
      }
    }

    // ── 2-barrel turn : sizing recommandé selon texture (Multibarrel.pdf) ──
    if (streetKey === 'turn' && isBet && boardCards?.length >= 3) {
      const flop = classifyFlop(boardCards);
      if (flop) {
        if (flop.category === 'drawy') {
          if (ratio < 0.65) return {
            verdict: `2-barrel trop petite (${pct}% vs 80-100%+ rec.) — turn drawy`,
            conseil: `Sur un board drawy (${flop.desc}), NE JAMAIS 2-barrel avec une petite mise au turn. Les draws sont indifférents à vos petites mises : ils appellent correctement et réalisent leur équité sans payer le size fort. Visez 80-100%+ pot pour rendre leurs calls non-profitables et protéger vos mains fortes.`
          };
          if (ratio >= 0.80) return {
            verdict: `2-barrel ✓ ${pct}% — turn drawy`,
            conseil: `Excellent sizing au turn drawy (80-100%+ recommandé). Cette taille met la pression maximale sur les draws — ils ne peuvent plus appeler profitablement. C'est aussi le moment de prendre de la valeur avec vos mains fortes car de nombreuses cartes de river peuvent bloquer l'action.`
          };
          return {
            verdict: `2-barrel ${pct}% — turn drawy (borderline)`,
            conseil: `Sur un board drawy, visez 80-100%+ au turn. Votre mise de ${pct}% est dans la zone grise — les draws avec le meilleur pot odds peuvent encore appeler marginalement. Montez votre sizing pour maximiser la pression et extrayez toute la valeur avant une river qui peut compléter les draws.`
          };
        } else {
          if (ratio >= 0.45 && ratio <= 0.80) return {
            verdict: `2-barrel ✓ ${pct}% — turn sec`,
            conseil: `Bon sizing au turn sec (50-75% recommandé). Cette taille extrait de la valeur de manière équilibrée, met la pression sur les mains moyennes et laisse de la room pour barrel river. Continuez avec vos mains fortes et quelques bluffs sélectionnés avec des backdoor draws.`
          };
          if (ratio < 0.45) return {
            verdict: `2-barrel trop petite (${pct}% vs 50-75% rec.) — turn sec`,
            conseil: `Sur un board sec au turn, visez 50-75% pot. Votre mise de ${pct}% laisse de la valeur sur la table et donne à l'adversaire un excellent size pour défendre ses mains moyennes et flotter. Augmentez votre sizing pour rendre leurs calls moins profitables.`
          };
          return {
            verdict: `2-barrel oversize (${pct}%) — turn sec`,
            conseil: `Mise plus grosse que le standard (50-75%) au turn sec. Cela peut être un overbet stratégique justifié avec les nuts ou dans un spot très polarisé. Attention : sur un board sec, l'adversaire arrive au river avec un range très fort si il call — préparez votre ligne river en conséquence.`
          };
        }
      }
    }

    // ── River barrel : standard 50%+ + conseil sur les blockers ──
    if (streetKey === 'river' && isBet) {
      const heroPos = heroAction.pos;
      const isEP = new Set(['UTG','UTG+1','UTG+2','MP','LJ']).has(heroPos);
      const posLbl = heroPos === 'BU' ? 'BTN' : heroPos;
      const blockerTip = isEP
        ? `Depuis ${posLbl}, les mid pair blockers sont précieux au bluff river — votre adversaire fold plus facilement ses top pairs face à une range EP tight.`
        : `BTN vs BB, l'adversaire call tous les top pairs même mal kickés — privilégiez les top pair blockers dans votre range de bluff river (ex : Ax sur un board Axx).`;

      if (ratio >= 0.45) return {
        verdict: `River barrel ✓ ${pct}%`,
        conseil: `Sizing correct au river (50%+ recommandé). Pour équilibrer votre range : misez avec vos nuts ET vos natural bluffs (draws manqués sans showdown value, avec des blockers sur les mains fortes de l'adversaire). ${blockerTip} Évitez les bluffs sans blockers — l'adversaire sera souvent en position de call.`
      };
      return {
        verdict: `River trop petite (${pct}% vs 50%+ rec.)`,
        conseil: `Le standard river est 50%+. Une mise de ${pct}% est défendable uniquement contre un adversaire très passif/faible, ou en pot 3-bet spécifique. En règle générale, vous perdez de la valeur avec vos bonnes mains et vos bluffs sont moins crédibles. ${blockerTip}`
      };
    }

    // ── Générique (relance postflop, ou pas de classification board) ──
    let verdict, conseil;
    if (ratio <= 0.29) {
      verdict = `${v} petite (${pct}% pot)`;
      conseil = `${v} petite à ${pct}% du pot. Adapté aux blocker bets, protection sur boards secs ou thin value. Donne un bon size à l'adversaire — assurez-vous d'avoir une raison stratégique précise. Avec des mains moyennes, une petite mise peut signaler de la faiblesse et provoquer des floats ou re-raises.`;
    } else if (ratio <= 0.45) {
      verdict = `${v} ~1/3 pot (${pct}%)`;
      conseil = `Sizing standard à 1/3 pot. Adapté pour un range large et polarisé. Donne un size raisonnable à l'adversaire tout en récupérant de la valeur avec un mix équilibré de value hands et de bluffs.`;
    } else if (ratio <= 0.59) {
      verdict = `${v} ~1/2 pot (${pct}%)`;
      conseil = `Mise 1/2 pot : taille équilibrée, bonne par défaut sur la plupart des boards. Elle protège vos mains fortes contre les draws et extrait de la valeur sans surexposer votre range.`;
    } else if (ratio <= 0.79) {
      verdict = `${v} 2/3 pot (${pct}%)`;
      conseil = `Mise 2/3 pot : taille agressive qui met la pression sur les mains moyennes et les draws marginaux. Adaptée aux boards texturés ou pour protéger une main forte avec un range polarisé.`;
    } else if (ratio <= 1.05) {
      verdict = `${v} pot (${pct}%)`;
      conseil = `Mise plein pot : sizing très agressif représentant une main forte. L'adversaire n'a besoin que de ~25% d'équité pour justifier un call — assurez-vous d'avoir une main premium ou un range de bluff crédible.`;
    } else {
      verdict = `Overbet (${pct}% pot)`;
      conseil = `Overbet : ligne rare pour une range ultra-polarisée (nuts ou bluff). À utiliser uniquement sur des boards qui avantagent clairement votre range. Assurez-vous que votre ratio value/bluff est équilibré à cette taille extrême.`;
    }
    return { verdict, conseil };
  }

  if (action === 'call') {
    if (!potBeforeHero || !amount) return { verdict: 'Call', conseil: 'Call enregistré sans montant précis.' };
    const potOdds  = amount / (potBeforeHero + amount);
    const pctNeed  = Math.round(potOdds * 100);
    let verdict, conseil;

    if (pctNeed <= 20) {
      verdict = `Call — excellent size (${pctNeed}% éq. req.)`;
      conseil = `Très bon size : seulement ${pctNeed}% d'équité nécessaire pour un call rentable. À ce size, presque toute main avec de la showdown value ou du potentiel de draw justifie de continuer. Défendez large dans ces situations — l'adversaire doit vous convaincre que l'intégralité de votre range est battue pour que le fold soit correct.`;
    } else if (pctNeed <= 33) {
      verdict = `Call — bon size (${pctNeed}% éq. req.)`;
      conseil = `Bon size : ${pctNeed}% d'équité requise. Avec une paire, un draw fort ou une main à potentiel, ce call est clairement justifié. Estimez votre équité contre le range de l'adversaire — si vous avez ${pctNeed}%+ d'équité, appeler génère de l'EV positive.`;
    } else if (pctNeed <= 45) {
      verdict = `Call — size élevé (${pctNeed}% éq. req.)`;
      conseil = `size cher : ${pctNeed}% d'équité requise. Seules les mains fortes (top pair top kicker+, draws premium avec backdoor equity) justifient ce call. Évaluez vos implied odds — si vous pouvez extraire de la valeur quand vous frappez, le call devient plus rentable. Sinon, envisagez le fold.`;
    } else {
      verdict = `Call — size très élevé (${pctNeed}% éq. req.)`;
      conseil = `size très élevé : ${pctNeed}% d'équité nécessaire. Ce call ne se justifie qu'avec une main très forte ou des implied odds exceptionnels. Dans la majorité des situations, un fold (main faible) ou un re-raise (main forte) sont plus appropriés qu'un call passif à ce size.`;
    }

    return { verdict, conseil };
  }

  if (action === 'check') {
    return {
      verdict: 'Check',
      conseil: `Check au ${lbl}. Jeu passif qui contrôle le pot, masque la force de votre main et peut préparer un check-raise. Le check est optimal pour les mains moyennes (pot control), les mains très fortes en position (trap) ou quand vous n'avez pas assez d'équité pour miser profitablement. Ayez un plan clair pour la prochaine rue.`
    };
  }

  if (action === 'fold') {
    const lastBet = [...actsBefore].reverse().find(a => a.action === 'raise' || a.action === 'allin');
    if (lastBet?.amount > 0 && potBeforeHero > 0) {
      const potOdds = lastBet.amount / (potBeforeHero + lastBet.amount);
      const pctNeed = Math.round(potOdds * 100);
      let conseil;
      if (pctNeed <= 25) {
        conseil = `Fold face à une mise nécessitant seulement ${pctNeed}% d'équité. Vous aviez un excellent size pour continuer — le fold n'est justifié qu'avec une main sans aucune équité ni draw. Analysez si vous aviez des outs ou de la showdown value avant de folder à ce size aussi favorable.`;
      } else if (pctNeed <= 40) {
        conseil = `Fold face à une mise nécessitant ${pctNeed}% d'équité. size modéré : le fold est correct si votre main est sans équité contre le range de l'adversaire. Évaluez vos outs et implied odds avant de folder — avec un draw ou une paire faible, continuer aurait pu être rentable.`;
      } else {
        conseil = `Fold face à une mise nécessitant ${pctNeed}% d'équité. size élevé : le fold avec une main sans potentiel est souvent la bonne décision ici. Vous avez bien géré la situation en ne surpayant pas face à une agression forte avec une main sans equity suffisante.`;
      }
      return { verdict: `Fold (${pctNeed}% éq. req.)`, conseil };
    }
    return {
      verdict: 'Fold',
      conseil: `Fold au ${lbl}. Vous avez abandonné la main sur cette rue. Analysez si votre main avait encore de l'équité ou du potentiel postflop pour continuer. Un fold face à une forte agression avec une main sans outs est généralement correct — identifiez si vous étiez dans cette situation.`
    };
  }

  return null;
}

// ── Analyse de la ligne de jeu multibarrel (Multibarrel.pdf) ─────────────────

/**
 * Évalue la ligne de jeu Hero sur l'ensemble des streets (BBB, BBX, XBB…).
 * @param {Object} hand — enregistrement de main issu de storage.js
 * @returns {{ pattern: string, verdict: string, conseil: string } | null}
 */
export function analyzeMultibarrelLine(hand) {
  const hero = hand.heroIdx != null ? hand.players?.[hand.heroIdx] : null;
  if (!hero) return null;

  const flopInfo   = classifyFlop(hand.streets?.flop?.cards || []);
  const isDrawy    = flopInfo?.category === 'drawy';
  const boardLabel = flopInfo ? flopInfo.label : '';

  const streetKeys = ['flop', 'turn', 'river'];
  const codes = [];

  for (const key of streetKeys) {
    const st = hand.streets?.[key];
    if (!st?.actions?.length) break;
    const act = st.actions.find(a => a.pos === hero.pos);
    if (!act) break;
    if (act.action === 'fold') { codes.push('F'); break; }
    codes.push(act.action === 'check' ? 'X' : 'B');
  }

  if (codes.length < 2) return null;
  const pattern = codes.join('');
  const _c = (v, t) => ({ pattern, verdict: v, conseil: t });

  switch (pattern) {
    case 'BBB': return _c('Ligne BBB — Triple barrel',
      `Triple barrel : vous avez misé les 3 streets. Cette ligne représente une main très forte (value) ou un bluff total bien construit. Pour être équilibré, combinez les nuts ET des natural bluffs (draws manqués avec blockers, mains sans showdown value). ${isDrawy ? `Sur ce board ${boardLabel}, les draws manqués au river sont des bluffs naturels idéaux pour la 3ème balle.` : `Sur ce board ${boardLabel} sec, le triple-barrel est crédible — peu de mains complètent en river.`}`);
    case 'BBX': return _c('Ligne BBX — 2 streets, check river',
      `Bonne ligne pour les mains à 2 streets de valeur. Le check river contrôle le pot avec les mains intermédiaires et peut induire un bluff adverse. Recommandé contre les profils passifs. ${isDrawy ? `Sur un board drawy, anticipez les draws qui complètent en river et préparez un plan (call ou fold face au bet adverse).` : ``}`);
    case 'XBB': return _c('Ligne XBB — Check flop, 2 streets turn/river',
      `Ligne efficace contre les adversaires agressifs. Le check flop garde votre range large et non-cappée, puis vous prenez l'initiative au turn/river. Permet d'induire les overbluffs adverses au flop. Idéal contre les profils aggros qui bluffent les checks.`);
    case 'BXB': return _c('Ligne BXB — Attention !',
      `Ligne risquée contre les bons joueurs. Le check turn arrive au river avec une range cappée — l'adversaire sait que vous n'avez pas les mains très fortes. Vous laissez aussi les draws s'améliorer gratuitement. À réserver aux fish totalement passifs ou en pot 3-bet pour un check-raise turn spécifique.`);
    case 'BBF': return _c('Ligne BBF — 2 barrels puis fold river',
      `2 barrels puis abandon au river. Si vous avez foldé face à une mise correctement pricée sans équité résiduelle, le fold peut être justifié. Si vous avez abandonné avec une main pouvant gagner ou face à une mise défendable, c'est une erreur de consistance de ligne.`);
    case 'BXF': return _c('Ligne BXF — Bet flop, check turn, fold river',
      `Pot control au turn puis abandon au river. Analysez votre main au river : aviez-vous encore de l'équité ? Le check turn peut avoir signalé de la faiblesse et induit un bluff river — évaluez si votre fold était correct selon le pot odds offert.`);
    case 'XBF': return _c('Ligne XBF — Delayed c-bet, fold river',
      `Delayed c-bet au turn puis abandon au river. Évaluez si votre barrel turn était justifié et si votre fold river était correct selon le pot odds adverse.`);
    case 'BB': return _c('Ligne BB — Flop + Turn',
      `2 barrels. ${isDrawy ? `Sur un board drawy, planifiez votre river action AVANT de barrel le turn — si un draw complète, avez-vous assez de mains fortes pour continuer de manière crédible ?` : `Sur un board sec, le 2-barrel est cohérent. Planifiez : check river avec les mains intermédiaires, bet avec les nuts et vos natural bluffs.`}`);
    case 'XB': return _c('Ligne XB — Delayed c-bet turn',
      `Delayed c-bet efficace, surtout sur les boards drawy pour voir si l'adversaire a connecté avant de prendre l'initiative. Gardez un range équilibré en checkant aussi quelques mains fortes au flop pour ne pas être lisible.`);
    default: return null;
  }
}

// ── Évaluation main Hero vs board (made hand + tirages) ─────────────────────

/**
 * Évalue la force de la main de Hero sur le board courant.
 * Détecte: made hand (set, top paire, overpair, double paire, quinte, couleur, full…)
 * et tirages (flush draw, OESD, ventral). Combine en un tier global.
 * @param {string[]} heroCards — ex: ['As', '3s']
 * @param {string[]} board — cartes du board cumulées jusqu'à la street courante (3 à 5)
 * @returns {{tier:'monster'|'strong'|'medium'|'draw'|'weak-draw'|'weak'|'air', madeDesc:string, draws:string[], desc:string, flushDraw:boolean, oesd:boolean, gutshot:boolean} | null}
 */
function _heroHandStrength(heroCards, board) {
  if (!heroCards || heroCards.length < 2 || !heroCards[0] || !heroCards[1]) return null;
  if (!board || board.length < 3) return null;

  const heroRanks = heroCards.map(c => _RV[c[0]] || 0);
  const heroSuits = heroCards.map(c => c[1]);
  const boardRanks = board.map(c => _RV[c[0]] || 0);
  const allRanks = [...heroRanks, ...boardRanks];
  const allSuits = [...heroSuits, ...board.map(c => c[1])];

  const rankCount = {};
  allRanks.forEach(r => rankCount[r] = (rankCount[r] || 0) + 1);
  const boardRankCount = {};
  boardRanks.forEach(r => boardRankCount[r] = (boardRankCount[r] || 0) + 1);
  const suitCount = {};
  allSuits.forEach(s => suitCount[s] = (suitCount[s] || 0) + 1);

  const topBoardRank = Math.max(...boardRanks);
  const pocketPair = heroRanks[0] === heroRanks[1];
  const counts = Object.values(rankCount).sort((a, b) => b - a);
  const isQuads   = counts[0] === 4;
  const isFull    = counts[0] === 3 && counts[1] === 2;
  const isTrips   = counts[0] === 3 && !isFull;
  const isTwoPair = counts[0] === 2 && counts[1] === 2;
  const isPair    = counts[0] === 2 && counts[1] !== 2;

  // Couleur faite (5+ de la même couleur, hero participe)
  const flushSuit = Object.entries(suitCount).find(([, c]) => c >= 5)?.[0];
  const hasFlush = !!flushSuit && heroSuits.includes(flushSuit);

  // Quinte (5 rangs consécutifs, hero participe)
  const uniqRanks = new Set(allRanks);
  if (uniqRanks.has(14)) uniqRanks.add(1);
  const heroRankSet = new Set(heroRanks);
  if (heroRankSet.has(14)) heroRankSet.add(1);
  let hasStraight = false;
  for (let top = 14; top >= 5; top--) {
    if ([top, top-1, top-2, top-3, top-4].every(r => uniqRanks.has(r))
        && [top, top-1, top-2, top-3, top-4].some(r => heroRankSet.has(r))) {
      hasStraight = true; break;
    }
  }

  const heroPairsTopBoard = !pocketPair && heroRanks.includes(topBoardRank) && boardRankCount[topBoardRank] === 1;
  const isOverpair = pocketPair && heroRanks[0] > topBoardRank;
  const isSet = pocketPair && boardRankCount[heroRanks[0]] >= 1;
  const isHeroTwoPair = !pocketPair && isTwoPair && heroRanks.every(r => rankCount[r] >= 2) && heroRanks[0] !== heroRanks[1];

  let madeDesc = '', tier = 'air';
  if (isQuads || hasFlush || isFull || hasStraight) {
    madeDesc = isQuads ? 'Carré' : hasFlush ? 'Couleur' : isFull ? 'Full' : 'Quinte';
    tier = 'monster';
  } else if (isSet) {
    madeDesc = 'Set'; tier = 'strong';
  } else if (isHeroTwoPair) {
    madeDesc = 'Double paire'; tier = 'strong';
  } else if (isTrips) {
    madeDesc = 'Brelan'; tier = 'strong';
  } else if (isOverpair) {
    madeDesc = 'Overpair'; tier = 'strong';
  } else if (heroPairsTopBoard) {
    const kicker = heroRanks.find(r => r !== topBoardRank);
    if (kicker >= 12) { madeDesc = 'Top paire (gros kicker)'; tier = 'strong'; }
    else              { madeDesc = 'Top paire'; tier = 'medium'; }
  } else if (isTwoPair) {
    madeDesc = 'Double paire (board)'; tier = 'medium';
  } else if (isPair && pocketPair && heroRanks[0] < topBoardRank) {
    madeDesc = 'Underpair'; tier = 'medium';
  } else if (isPair && heroRanks.some(r => rankCount[r] === 2)) {
    const sortedBoard = [...boardRanks].sort((a, b) => b - a);
    const middleRank = sortedBoard[1];
    if (heroRanks.includes(middleRank) && rankCount[middleRank] === 2) {
      madeDesc = 'Paire moyenne'; tier = 'medium';
    } else {
      madeDesc = 'Paire faible'; tier = 'weak';
    }
  }

  // Sur la river (board = 5 cartes), les tirages sont morts — uniquement la made hand compte
  const isRiver = board.length >= 5;

  // Tirage couleur (exactement 4 de la même couleur, hero participe)
  let flushDraw = false;
  if (!hasFlush && !isRiver) {
    for (const [s, c] of Object.entries(suitCount)) {
      if (c === 4 && heroSuits.includes(s)) { flushDraw = true; break; }
    }
  }

  // Tirage quinte (bilatéral ou ventral, hero participe)
  let oesd = false, gutshot = false;
  if (!hasStraight && !isRiver) {
    for (let top = 14; top >= 5; top--) {
      const win = [top, top-1, top-2, top-3, top-4];
      if (win[4] < 1) break;
      const present = win.map(r => uniqRanks.has(r));
      if (present.filter(Boolean).length !== 4) continue;
      if (!win.some((r, i) => present[i] && heroRankSet.has(r))) continue;
      const missingIdx = present.indexOf(false);
      if (missingIdx === 0)       { if (top - 5 >= 2) oesd = true; else gutshot = true; }
      else if (missingIdx === 4)  { if (top + 1 <= 14) oesd = true; else gutshot = true; }
      else                        { gutshot = true; }
    }
  }

  const draws = [];
  if (flushDraw) draws.push('tirage couleur');
  if (oesd) draws.push('tirage quinte bilatéral');
  else if (gutshot) draws.push('tirage ventral');

  // Combo draw : un made medium + flush draw (ou OESD) devient strong (~50%+ équité)
  if (tier === 'medium' && (flushDraw || oesd))      tier = 'strong';
  else if (tier === 'weak'   && (flushDraw || oesd)) tier = 'draw';
  else if (tier === 'air'    && (flushDraw || oesd)) tier = 'draw';
  else if (tier === 'air'    && gutshot)             tier = 'weak-draw';

  const desc = madeDesc
    ? (draws.length ? `${madeDesc} + ${draws.join(' + ')}` : madeDesc)
    : (draws.length ? draws.join(' + ').replace(/^./, c => c.toUpperCase()) : 'Carte haute, aucun tirage');

  return { tier, madeDesc: madeDesc || 'Carte haute', draws, desc, flushDraw, oesd, gutshot };
}

// ── Contexte adverse postflop (multiway, PFR, check-raise, multibarrel…) ────

/**
 * Calcule des signaux adverses utiles pour modérer la reco postflop.
 * @param {Object} hand
 * @param {string} streetKey — 'flop' | 'turn' | 'river'
 * @returns {{numOpponents:number, isMultiway:boolean, heroIsPFR:boolean, pfAggressorPos:string|null, is3betPot:boolean, oppBarrelsBefore:number, isCheckRaise:boolean, isDonkBet:boolean, lastBetterPos:string|null} | null}
 */
function _getPostflopContext(hand, streetKey) {
  if (!hand?.players || hand.heroIdx == null) return null;
  const heroPos = hand.players[hand.heroIdx]?.pos;
  if (!heroPos) return null;

  // Joueurs ayant fold (cumulé toutes streets)
  const folded = new Set();
  for (const sk of ['preflop', 'flop', 'turn', 'river']) {
    const acts = hand.streets?.[sk]?.actions || [];
    for (const a of acts) if (a.action === 'fold') folded.add(a.pos);
  }
  // Participants postflop = ceux ayant agi sur n'importe quelle street (autres que hero)
  const participants = new Set();
  for (const sk of ['preflop', 'flop', 'turn', 'river']) {
    const acts = hand.streets?.[sk]?.actions || [];
    for (const a of acts) if (a.pos !== heroPos) participants.add(a.pos);
  }
  let numOpponents = 0;
  for (const p of participants) if (!folded.has(p)) numOpponents++;

  // Aggresseur préflop (dernier raise/allin préflop)
  const pfActions = hand.streets?.preflop?.actions || [];
  const pfRaises = pfActions.filter(a => a.action === 'raise' || a.action === 'allin');
  const pfAggressorPos = pfRaises.length ? pfRaises[pfRaises.length - 1].pos : null;
  const heroIsPFR = pfAggressorPos === heroPos;
  const is3betPot = pfRaises.length >= 2;

  // Barrels adverses sur les streets précédentes
  let oppBarrelsBefore = 0;
  for (const sk of ['flop', 'turn', 'river']) {
    if (sk === streetKey) break;
    const acts = hand.streets?.[sk]?.actions || [];
    if (acts.some(a => a.pos !== heroPos && (a.action === 'raise' || a.action === 'allin'))) {
      oppBarrelsBefore++;
    }
  }

  // Check-raise sur la street courante : un villain check, hero raise, puis un villain raise
  const stActs = hand.streets?.[streetKey]?.actions || [];
  let isCheckRaise = false;
  let villainChecked = false, heroRaisedIdx = -1;
  for (let i = 0; i < stActs.length; i++) {
    const a = stActs[i];
    if (a.pos !== heroPos && a.action === 'check') villainChecked = true;
    else if (villainChecked && a.pos === heroPos && (a.action === 'raise' || a.action === 'allin')) {
      heroRaisedIdx = i; break;
    }
  }
  if (heroRaisedIdx >= 0) {
    isCheckRaise = stActs.slice(heroRaisedIdx + 1)
      .some(x => x.pos !== heroPos && (x.action === 'raise' || x.action === 'allin'));
  }

  // Donk bet : hero PFR + un villain mise avant l'action de hero sur cette street
  const heroIdxInActs = stActs.findIndex(a => a.pos === heroPos);
  const firstBet = stActs.find(a => a.action === 'raise' || a.action === 'allin');
  const isDonkBet = !!(heroIsPFR && firstBet && firstBet.pos !== heroPos
    && (heroIdxInActs < 0 || stActs.indexOf(firstBet) < heroIdxInActs));

  // Position du dernier betteur (que hero doit caller) sur cette street
  const actsBeforeHero = heroIdxInActs >= 0 ? stActs.slice(0, heroIdxInActs) : stActs;
  const lastBetBefore = [...actsBeforeHero].reverse().find(a => a.action === 'raise' || a.action === 'allin');

  return {
    numOpponents,
    isMultiway: numOpponents >= 2,
    heroIsPFR,
    pfAggressorPos,
    is3betPot,
    oppBarrelsBefore,
    isCheckRaise,
    isDonkBet,
    lastBetterPos: lastBetBefore?.pos || null
  };
}

/** Construit le board cumulé jusqu'à la street demandée (3 cartes flop, +1 turn, +1 river). */
function _buildBoardUpToStreet(hand, streetKey) {
  const board = [];
  if (hand.streets?.flop?.cards) board.push(...hand.streets.flop.cards);
  if ((streetKey === 'turn' || streetKey === 'river') && hand.streets?.turn?.cards) board.push(...hand.streets.turn.cards);
  if (streetKey === 'river' && hand.streets?.river?.cards) board.push(...hand.streets.river.cards);
  return board;
}

// ── Move optimal (calcul indépendant de l'action Hero) ───────────────────────

/**
 * Calcule le move optimal pour un spot donné, indépendamment de l'action Hero.
 * @param {Object} hand — enregistrement de main
 * @param {string} streetKey — 'preflop' | 'flop' | 'turn' | 'river'
 * @returns {{ label: string, detail: string, actionType: 'raise'|'call'|'fold'|'check' } | null}
 */
export function computeOptimalMove(hand, streetKey) {
  const hero = hand.heroIdx != null ? hand.players?.[hand.heroIdx] : null;
  if (!hero) return null;

  // ── PRÉFLOP ──────────────────────────────────────────────────────────────
  if (streetKey === 'preflop') {
    const hasCards = hero.cards?.length >= 2 && hero.cards[0] && hero.cards[1];
    if (!hasCards) return null;
    const handStr = normalizeHand(hero.cards[0], hero.cards[1]);
    if (!handStr) return null;

    const heroPos    = hero.pos;
    const posLabel   = heroPos === 'BU' ? 'BTN' : heroPos;
    const pfActions  = hand.streets?.preflop?.actions || [];
    const heroActIdx = pfActions.findIndex(a => a.pos === heroPos);
    if (heroActIdx === -1) return null;

    const actsBefore  = pfActions.slice(0, heroActIdx);
    const raiseBefore = [...actsBefore].reverse().find(a => a.action === 'raise' || a.action === 'allin');

    // Open spot (pas de raise avant)
    if (!raiseBefore) {
      const range = _openRange(heroPos);
      const freq  = heroPos === 'BU' ? 40 : heroPos === 'CO' ? 26 : heroPos === 'HJ' ? 22 : 19;
      if (range.has(handStr)) return {
        label: 'Open raise', actionType: 'raise',
        detail: `${handStr} est dans le range d'open ${posLabel} (~${freq}%). Open raise est l'action optimale depuis cette position.`
      };
      if (_OPEN_LOSIF.has(handStr)) return {
        label: 'Open raise (spot +)', actionType: 'raise',
        detail: `${handStr} est dans le range étendu — optimal en BTN ou spot très favorable uniquement. Fold depuis les positions early.`
      };
      return {
        label: 'Fold', actionType: 'fold',
        detail: `${handStr} est hors range d'open depuis ${posLabel}. Attendez une main dans votre range.`
      };
    }

    const raiserLabel = raiseBefore.pos === 'BU' ? 'BTN' : raiseBefore.pos;

    // BB face à un open
    if (heroPos === 'BB') {
      if (_3BET_VALUE.has(handStr)) return {
        label: '3-bet value', actionType: 'raise',
        detail: `${handStr} (top 4%) — 3-bet obligatoire depuis le BB. Construisez le pot avec la meilleure main face à l'open ${raiserLabel}.`
      };
      if (_BB_ALWAYS.has(handStr)) return {
        label: 'Call', actionType: 'call',
        detail: `${handStr} est dans le range de défense systématique du BB quelle que soit la position de l'openeur.`
      };
      if (_BB_MITIGE.has(handStr)) {
        if (_EARLY_POS.has(raiseBefore.pos)) return {
          label: 'Fold', actionType: 'fold',
          detail: `${handStr} est borderline en BB. Face à un open EP (range tight), le fold est recommandé — vous serez souvent dominé.`
        };
        return {
          label: 'Call (mitigé)', actionType: 'call',
          detail: `${handStr} en défense mitigée BB. Face à ${raiserLabel} (range plus large), le call est acceptable.`
        };
      }
      if (_BB_REVE.has(handStr)) return {
        label: 'Fold', actionType: 'fold',
        detail: `${handStr} ne défend qu'en spot rêvé (open BTN très large). Face à ${raiserLabel}, fold recommandé.`
      };
      return {
        label: 'Fold', actionType: 'fold',
        detail: `${handStr} est hors range de défense BB face à ${raiserLabel}.`
      };
    }

    // Hors BB face à un open
    if (_3BET_VALUE.has(handStr)) return {
      label: '3-bet value', actionType: 'raise',
      detail: `${handStr} (top 4%) — 3-bet obligatoire depuis ${posLabel}. Ne slowplayez pas face à l'open ${raiserLabel}.`
    };
    let bluffSet, callSet;
    switch (heroPos) {
      case 'BU': bluffSet = _BTN_3BET_BLUFF; callSet = _BTN_CALL; break;
      case 'CO': bluffSet = _CO_3BET_BLUFF;  callSet = _CO_CALL;  break;
      case 'HJ': bluffSet = _HJ_3BET_BLUFF;  callSet = _HJ_CALL;  break;
      case 'SB': bluffSet = _SB_3BET_BLUFF;  callSet = _SB_CALL;  break;
      default:   bluffSet = new Set();        callSet = new Set();
    }
    if (bluffSet.has(handStr)) return {
      label: '3-bet bluff', actionType: 'raise',
      detail: `${handStr} est dans le range de 3-bet bluff depuis ${posLabel} face à l'open ${raiserLabel}.`
    };
    if (callSet.has(handStr)) return {
      label: 'Call', actionType: 'call',
      detail: `${handStr} est dans le range de call depuis ${posLabel} face à l'open ${raiserLabel}.`
    };
    return {
      label: 'Fold', actionType: 'fold',
      detail: `${handStr} est hors range de jeu depuis ${posLabel} face à un open ${raiserLabel}.`
    };
  }

  // ── POSTFLOP ─────────────────────────────────────────────────────────────
  const st = hand.streets?.[streetKey];
  if (!st?.actions?.length) return null;

  const heroAct = st.actions.find(a => a.pos === hero.pos);
  if (!heroAct) return null;

  const heroActIdx = st.actions.indexOf(heroAct);
  const actsBefore = st.actions.slice(0, heroActIdx);
  const hasBetBefore = actsBefore.some(a => a.action === 'raise' || a.action === 'allin');
  const flopCards = hand.streets?.flop?.cards;
  const flop = classifyFlop(flopCards || []);

  const ctx = _getPostflopContext(hand, streetKey);
  const board = _buildBoardUpToStreet(hand, streetKey);
  const hs = _heroHandStrength(hero.cards, board);

  // Hero est le premier à agir (aggressor ou check)
  if (!hasBetBefore) {
    const drawy   = flop?.category === 'drawy';
    const extraDry = flop?.category === 'extra-dry';
    const isMW    = !!ctx?.isMultiway;
    const isPFR   = ctx?.heroIsPFR ?? true;

    // Sizing baseline (% pot) selon la street et la texture
    let baseSize;
    if (streetKey === 'flop' && flop) baseSize = flop.sizing.earlyGame;
    else if (streetKey === 'turn')    baseSize = drawy ? 85 : 60;
    else                              baseSize = 60; // river

    const mwLabel = isMW ? ` (${ctx.numOpponents} adv.)` : '';
    const pfrNote = isPFR ? '' : ' Sans initiative préflop, leader avec range faible est rarement profitable — préférez un check pour laisser l\'agresseur c-bet, puis check-raise ou call selon votre main.';

    // Pas de cartes connues : reco de sizing générique (comportement legacy)
    if (!hs) {
      if (streetKey === 'flop' && flop) return {
        label: `C-bet ~${baseSize}% pot`, actionType: 'raise',
        detail: `Board ${flop.label} (${flop.desc}) — sizing optimal : ~${baseSize}% du pot.${mwLabel}`
      };
      if (streetKey === 'turn') return {
        label: `Bet ~${baseSize}% pot`, actionType: 'raise',
        detail: `Turn ${drawy ? 'drawy — sizing grand (80-100%) pour les draws.' : 'sec — sizing standard 50-75%.'}${mwLabel}`
      };
      return {
        label: 'Bet ≥50% pot', actionType: 'raise',
        detail: `River standard : bet 50%+ avec value et bluffs crédibles (blockers).${mwLabel}`
      };
    }

    // Si un villain a l'initiative préflop (PFR), default = check pour laisser PFR c-bet
    const villainHasInitiative = ctx?.pfAggressorPos != null && !isPFR;
    if (villainHasInitiative && hs.tier !== 'monster') {
      const planNote = (hs.tier === 'strong') ? ' Plan : check-raise pour la value, ou check-call selon la dynamique.'
        : (hs.tier === 'medium') ? ' Plan : check-call à un size raisonnable, check-fold face à une pression forte.'
        : (hs.tier === 'draw') ? ' Plan : check-call si le size est correct (pot odds + implied odds), sinon check-fold.'
        : ' Plan : check-fold sauf opportunité claire de bluff catch.';
      return {
        label: `Check — laisser le PFR c-bet`, actionType: 'check',
        detail: `${hs.desc}. ${ctx.pfAggressorPos === 'BU' ? 'BTN' : ctx.pfAggressorPos} a l'initiative préflop : check par défaut.${planNote}`
      };
    }
    // Cas monster OOP vs PFR : lead pour la valeur/protection sur board drawy, check (pour check-raise) sinon
    if (villainHasInitiative && hs.tier === 'monster') {
      if (drawy) return {
        label: `Lead value ~${baseSize}% — ${hs.madeDesc}`, actionType: 'raise',
        detail: `${hs.desc}. ${ctx.pfAggressorPos === 'BU' ? 'BTN' : ctx.pfAggressorPos} a l'initiative préflop, mais sur board drawy votre main monstre justifie un lead pour la valeur et la protection (ne pas laisser un check arrière gratuit aux tirages).`
      };
      return {
        label: `Check (plan check-raise) — ${hs.madeDesc}`, actionType: 'check',
        detail: `${hs.desc}. Check pour laisser le PFR c-bet et déclencher un check-raise pour la valeur — construit le pot et déguise la force de votre main.`
      };
    }

    // Monster / strong → value bet (hero a l'initiative)
    if (hs.tier === 'monster' || hs.tier === 'strong') {
      const size = isMW && drawy ? Math.min(100, baseSize + 15) : baseSize;
      return {
        label: `Bet value ~${size}% — ${hs.madeDesc}`, actionType: 'raise',
        detail: `${hs.desc}. Misez pour la valeur${drawy ? ' et la protection (board drawy)' : ''}.${isMW ? ` Multiway${mwLabel} : sizing un peu plus gros pour ne pas donner de size aux tirages.` : ''}${flop ? ` Board ${flop.label}.` : ''}`
      };
    }

    // Medium → bet pour value/protection, sauf multiway drawy
    if (hs.tier === 'medium') {
      if (isMW && drawy) return {
        label: 'Check — pot control', actionType: 'check',
        detail: `${hs.desc}. Multiway${mwLabel} sur board drawy : check pour contrôler le pot, éviter la check-raise et garder votre range non-cappé. Vous pourrez call un bet adverse raisonnable.`
      };
      return {
        label: `Bet value ~${baseSize}% — ${hs.madeDesc}`, actionType: 'raise',
        detail: `${hs.desc}. Value/protection bet pour extraire des mains pires (draws, paires faibles).${isMW ? ` Multiway${mwLabel} : sizing modéré pour rester équilibré.` : ''}${flop ? ` Board ${flop.label}.` : ''}`
      };
    }

    // Draw → semi-bluff HU, check multiway
    if (hs.tier === 'draw') {
      if (isMW || !isPFR) return {
        label: 'Check — réaliser l\'équité', actionType: 'check',
        detail: `${hs.desc}.${isMW ? ` Multiway${mwLabel} : les semi-bluffs perdent leur fold equity, préférez réaliser l'équité à pas cher.` : ''}${!isPFR ? pfrNote : ''}`
      };
      const size = drawy ? Math.max(60, baseSize) : Math.min(50, baseSize);
      return {
        label: `Semi-bluff ~${size}% — ${hs.draws.join(' + ')}`, actionType: 'raise',
        detail: `${hs.desc}. Heads-up + initiative préflop : semi-bluff profitable (fold equity + équité directe quand call). ${drawy ? `Board drawy : sizing un peu plus grand.` : `Sizing petit pour ne pas se faire raise et garder le bluff peu coûteux.`}${flop ? ` Board ${flop.label}.` : ''}`
      };
    }

    // Weak / weak-draw → check pour le showdown value
    if (hs.tier === 'weak' || hs.tier === 'weak-draw') return {
      label: 'Check — showdown value', actionType: 'check',
      detail: `${hs.desc}. Misez et vous vous faites raise ou call par mieux. Check pour conserver le showdown value et bluff-catch à bon size.${isMW ? ` Multiway${mwLabel} renforce le choix du check.` : ''}`
    };

    // Air → c-bet bluff seulement si PFR + HU + board ${flop?.label || ''} dry, sinon check
    if (isPFR && !isMW && (extraDry || (flop?.category === 'dry')) && streetKey === 'flop') {
      const size = Math.min(extraDry ? 33 : 50, baseSize);
      return {
        label: `C-bet bluff ~${size}% — ${flop.label}`, actionType: 'raise',
        detail: `${hs.desc}. PFR + heads-up + board ${flop.label} : c-bet bluff exploitable car l'adversaire n'a souvent rien sur cette texture (avantage de range PFR). Sizing petit (${size}%) pour minimiser le risque.`
      };
    }
    return {
      label: 'Check — pas de spot de bluff', actionType: 'check',
      detail: `${hs.desc}. ${isMW ? `Multiway${mwLabel} : c-bet bluff peu profitable (trop de joueurs pour generer du fold equity).` : !isPFR ? 'Sans initiative préflop, leader avec air manque de crédibilité — préférez check/fold ou check/bluff catch.' : drawy ? 'Board drawy : votre range PFR n\'a pas l\'avantage net, c-bet bluff peu profitable.' : 'River avec air : check, ou bluff sélectif avec des blockers spécifiques uniquement.'}`
    };
  }

  // Hero face à une mise — pot odds + force de main hero + contexte adverse
  const lastBet = [...actsBefore].reverse().find(a => a.action === 'raise' || a.action === 'allin');
  if (lastBet?.amount > 0) {
    const prevStreetKey = { flop: 'preflop', turn: 'flop', river: 'turn' }[streetKey];
    let potBefore = hand.streets?.[prevStreetKey]?.potEnd || 0;
    for (const act of actsBefore) potBefore += act.amount || 0;
    const toCall = lastBet.amount;
    if (potBefore > 0) {
      const pctNeed = Math.round(toCall / (potBefore + toCall) * 100);

      // Notes contextuelles (check-raise, multibarrel, multiway, donk)
      const ctxNotes = [];
      let harshSignal = false; // signal "range adverse très forte"
      if (ctx?.isCheckRaise) { ctxNotes.push('check-raise (range très polarisée value/bluff fort)'); harshSignal = true; }
      if (ctx?.oppBarrelsBefore >= 1 && streetKey === 'turn') { ctxNotes.push('2-barrel adverse (range crédibilisé)'); harshSignal = true; }
      if (ctx?.oppBarrelsBefore >= 2 && streetKey === 'river') { ctxNotes.push('3-barrel adverse (range polarisée nuts/bluff)'); harshSignal = true; }
      if (ctx?.isMultiway) { ctxNotes.push(`pot multiway (${ctx.numOpponents} adv. actifs)`); harshSignal = true; }
      if (ctx?.isDonkBet) ctxNotes.push('donk bet (lead inhabituel, souvent polarisé)');
      const ctxStr = ctxNotes.length ? ` Contexte : ${ctxNotes.join(', ')}.` : '';

      if (hs) {
        if (hs.tier === 'monster') return {
          label: `Raise value — ${hs.madeDesc}`, actionType: 'raise',
          detail: `${hs.desc}. Main quasi-imbattable : misez pour la valeur.${ctxStr} Relance recommandée pour construire le pot ; le call est acceptable contre un adversaire en bluff dont vous voulez laisser l'agression continuer.`
        };
        if (hs.tier === 'strong') {
          if (ctx?.isCheckRaise) return {
            label: `Call value — ${hs.madeDesc}${hs.draws.length ? ' + tirage' : ''} (vs C/R)`, actionType: 'call',
            detail: `${hs.desc}.${ctxStr} Face à un check-raise, évitez la sur-relance sans une main monstre — call pour réaliser l'équité et réévaluer la suite.`
          };
          return {
            label: `Call value — ${hs.madeDesc}${hs.draws.length ? ' + tirage' : ''}`, actionType: 'call',
            detail: `${hs.desc}. Main suffisamment forte pour défendre face à cette mise (${pctNeed}% requis).${ctxStr} Call automatique au minimum ; envisagez une relance pour la valeur et la protection${hs.draws.length ? ' — équité combinée (made + tirage) largement au-dessus du size demandé' : ''}.`
          };
        }
        if (hs.tier === 'medium') {
          // Contexte dur (C/R, multibarrel turn/river, multiway) → resserrer
          if (harshSignal && pctNeed > 30) return {
            label: `Fold — ${hs.madeDesc} face à signal fort (${pctNeed}% req.)`, actionType: 'fold',
            detail: `${hs.desc}.${ctxStr} Une main medium ne bat pas le range crédibilisé adverse à ce size (${pctNeed}%). Le fold protège votre stack ; conservez-le pour de meilleurs spots.`
          };
          if (harshSignal) return {
            label: `Call très serré — ${hs.madeDesc} (${pctNeed}% req.)`, actionType: 'call',
            detail: `${hs.desc}.${ctxStr} Le signal adverse est fort mais le size (${pctNeed}%) reste correct — call de prudence sans pot building. Plan : check-fold sur les streets suivantes sauf amélioration nette.`
          };
          if (pctNeed <= 40) return {
            label: `Call — ${hs.madeDesc} (${pctNeed}% éq. req.)`, actionType: 'call',
            detail: `${hs.desc}. size demandé ${pctNeed}% — votre showdown value et équité directe justifient le call.${ctxStr} Évitez les relances spéculatives sans information adverse supplémentaire.`
          };
          return {
            label: `Call serré — ${hs.madeDesc} (${pctNeed}% éq. req.)`, actionType: 'call',
            detail: `${hs.desc}. size élevé (${pctNeed}% requis) mais la main conserve une showdown value réelle.${ctxStr} Call défendable contre un range polarisé/large ; fold contre un profil très tight.`
          };
        }
        if (hs.tier === 'draw') {
          // Multiway → meilleurs implied odds mais aussi plus de joueurs à battre
          if (harshSignal && pctNeed > 30) return {
            label: `Fold — tirage face à signal fort (${pctNeed}% req.)`, actionType: 'fold',
            detail: `${hs.desc}.${ctxStr} L'adversaire représente un range trop fort pour caller un tirage sans implied odds excellentes. Fold sauf stack très profond et plan d'extraction clair.`
          };
          if (pctNeed <= 35) return {
            label: `Call — tirage (${pctNeed}% éq. req.)`, actionType: 'call',
            detail: `${hs.desc}. Pot odds (${pctNeed}%) inférieures à l'équité directe d'un tirage 8-9 outs (~32-35% par river).${ctxStr} Call profitable, accentué par les implied odds.`
          };
          return {
            label: `Call selon implied odds — tirage (${pctNeed}% req.)`, actionType: 'call',
            detail: `${hs.desc}. size au-dessus de l'équité directe (${pctNeed}% requis vs ~32-35%).${ctxStr} Call valide si l'adversaire paiera large quand le tirage rentre, sinon fold.`
          };
        }
        if (hs.tier === 'weak-draw') return {
          label: `Fold (sauf implied odds) — ${pctNeed}% req.`, actionType: 'fold',
          detail: `${hs.desc} (~4 outs ≈ 16% par river). size de ${pctNeed}% trop cher sans implied odds claires.${ctxStr} Fold par défaut ; call uniquement en stack profond face à un adversaire inducible.`
        };
        if (hs.tier === 'weak') return {
          label: `Fold / call serré — ${hs.madeDesc} (${pctNeed}% req.)`, actionType: 'fold',
          detail: `${hs.desc}. Showdown value limitée face à cette mise (${pctNeed}% requis).${ctxStr} Fold par défaut ; call uniquement contre un profil très agressif/large.`
        };
        // air
        return {
          label: `Fold — aucune équité (${pctNeed}% req.)`, actionType: 'fold',
          detail: `${hs.desc}. Sans paire ni tirage, vous n'avez pas l'équité pour défendre (${pctNeed}% requis).${ctxStr} Fold systématique sauf bluff catch très spécifique avec read fort.`
        };
      }

      // Fallback (pas de cartes hero ou pas de board) — pot odds seul
      if (pctNeed <= 25) return {
        label: `Call (éq. ≥${pctNeed}%)`, actionType: 'call',
        detail: `Excellent size : seulement ${pctNeed}% d'équité requise. Défendez large — fold uniquement si vous n'avez aucun out ni showdown value.`
      };
      if (pctNeed <= 40) return {
        label: `Call si éq. ≥${pctNeed}%`, actionType: 'call',
        detail: `size raisonnable (${pctNeed}% requis). Call justifié avec top pair+, draws forts ou implied odds. Fold avec les mains faibles sans potentiel.`
      };
      return {
        label: `Fold / éq. ≥${pctNeed}%`, actionType: 'fold',
        detail: `size élevé (${pctNeed}% requis). Le fold est optimal avec les mains sans potentiel. Continuez uniquement avec des mains très fortes.`
      };
    }
  }

  return null;
}
