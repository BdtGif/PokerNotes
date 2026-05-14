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
      conseil: `${hand} (top 4%) doit toujours être 3-bettée pour sa valeur. Le call ici est une erreur de sizing : vous permettez à des mains comme AQ, KQ, JJ de voir un flop à prix réduit avec une chance de vous battre. Le 3-bet construit un gros pot avec l'avantage dès le départ.`
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
      conseil: `${hand} est dans le range de défense systématique du BB, quelle que soit la position de l'openeur. Défendre est l'action optimale : vous bénéficiez du prix des blinds déjà investies et cette main a assez d'équité ou de potentiel postflop pour compenser le désavantage positionnel. Continuez à défendre ces mains systématiquement.`
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
      conseil: `${hand} est hors range de défense BB même avec le prix des blinds. Face à ${raiserLabel}, cette main n'a pas assez d'équité pour compenser le désavantage positionnel. Le fold préserve votre stack et évite les situations où vous jouez OOP avec une main faible contre un range défini.`
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
      conseil: `${hand} est hors range de défense BB face à ${raiserLabel}. Le fold est la décision correcte. Malgré le prix des blinds, cette main n'a pas assez d'équité ou de potentiel postflop pour compenser le désavantage positionnel permanent que vous aurez tout au long de la main.`
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
          conseil = `Sur un board ${flop.label} (${flop.desc}), le sizing recommandé est ~${rec}% du pot. Votre mise de ${pct}% est trop petite : ${flop.category === 'drawy' ? `les boards drawy nécessitent une mise plus grosse — donner un bon prix aux draws adverses rend leurs calls trop profitables. Visez ~${rec}% pour qu'ils paient correctement leur équité.` : flop.category === 'dry' ? `sur ce board dry, une mise plus petite laisse de la valeur sur la table et donne à l'adversaire un excellent prix pour flotter avec des mains marginales. Préférez ~${rec}%.` : `même sur un board extra dry, allez à ${rec}% pour extraire de la valeur — votre adversaire doit payer pour ses mains dominées.`}`;
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
            conseil: `Sur un board drawy (${flop.desc}), NE JAMAIS 2-barrel avec une petite mise au turn. Les draws sont indifférents à vos petites mises : ils appellent correctement et réalisent leur équité sans payer le prix fort. Visez 80-100%+ pot pour rendre leurs calls non-profitables et protéger vos mains fortes.`
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
            conseil: `Sur un board sec au turn, visez 50-75% pot. Votre mise de ${pct}% laisse de la valeur sur la table et donne à l'adversaire un excellent prix pour défendre ses mains moyennes et flotter. Augmentez votre sizing pour rendre leurs calls moins profitables.`
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
      conseil = `${v} petite à ${pct}% du pot. Adapté aux blocker bets, protection sur boards secs ou thin value. Donne un bon prix à l'adversaire — assurez-vous d'avoir une raison stratégique précise. Avec des mains moyennes, une petite mise peut signaler de la faiblesse et provoquer des floats ou re-raises.`;
    } else if (ratio <= 0.45) {
      verdict = `${v} ~1/3 pot (${pct}%)`;
      conseil = `Sizing standard à 1/3 pot. Adapté pour un range large et polarisé. Donne un prix raisonnable à l'adversaire tout en récupérant de la valeur avec un mix équilibré de value hands et de bluffs.`;
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
      verdict = `Call — excellent prix (${pctNeed}% éq. req.)`;
      conseil = `Très bon prix : seulement ${pctNeed}% d'équité nécessaire pour un call rentable. À ce prix, presque toute main avec de la showdown value ou du potentiel de draw justifie de continuer. Défendez large dans ces situations — l'adversaire doit vous convaincre que l'intégralité de votre range est battue pour que le fold soit correct.`;
    } else if (pctNeed <= 33) {
      verdict = `Call — bon prix (${pctNeed}% éq. req.)`;
      conseil = `Bon prix : ${pctNeed}% d'équité requise. Avec une paire, un draw fort ou une main à potentiel, ce call est clairement justifié. Estimez votre équité contre le range de l'adversaire — si vous avez ${pctNeed}%+ d'équité, appeler génère de l'EV positive.`;
    } else if (pctNeed <= 45) {
      verdict = `Call — prix élevé (${pctNeed}% éq. req.)`;
      conseil = `Prix cher : ${pctNeed}% d'équité requise. Seules les mains fortes (top pair top kicker+, draws premium avec backdoor equity) justifient ce call. Évaluez vos implied odds — si vous pouvez extraire de la valeur quand vous frappez, le call devient plus rentable. Sinon, envisagez le fold.`;
    } else {
      verdict = `Call — prix très élevé (${pctNeed}% éq. req.)`;
      conseil = `Prix très élevé : ${pctNeed}% d'équité nécessaire. Ce call ne se justifie qu'avec une main très forte ou des implied odds exceptionnels. Dans la majorité des situations, un fold (main faible) ou un re-raise (main forte) sont plus appropriés qu'un call passif à ce prix.`;
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
        conseil = `Fold face à une mise nécessitant seulement ${pctNeed}% d'équité. Vous aviez un excellent prix pour continuer — le fold n'est justifié qu'avec une main sans aucune équité ni draw. Analysez si vous aviez des outs ou de la showdown value avant de folder à ce prix aussi favorable.`;
      } else if (pctNeed <= 40) {
        conseil = `Fold face à une mise nécessitant ${pctNeed}% d'équité. Prix modéré : le fold est correct si votre main est sans équité contre le range de l'adversaire. Évaluez vos outs et implied odds avant de folder — avec un draw ou une paire faible, continuer aurait pu être rentable.`;
      } else {
        conseil = `Fold face à une mise nécessitant ${pctNeed}% d'équité. Prix élevé : le fold avec une main sans potentiel est souvent la bonne décision ici. Vous avez bien géré la situation en ne surpayant pas face à une agression forte avec une main sans equity suffisante.`;
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
