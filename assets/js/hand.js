/* hand.js — Logique métier : actions, streets, pot, showdown, résultat
 *
 * NOTE dépendance circulaire : hand.js ↔ ui.js
 * hand.js appelle render/promptCardSelection/promptShowdown de ui.js.
 * ui.js appelle doAction/goBackOneAction/buildActionQueue/finishHand de hand.js.
 * Les imports ES6 sont des "live bindings" : les fonctions sont définies
 * avant d'être appelées (runtime), donc la circularité est sans danger.
 */

import { state } from './state.js';
import { getActivePlayers, showToast } from './utils.js';
import { saveHand, buildHandRecord } from './storage.js';
import { showTourneyConfirmModal } from './history.js';
import { evaluateHand } from './evaluator.js';
import { rebuildPlayers, postBlindsForPreview } from './player.js';
// Imports circulaires (safe en ES6 — utilisés uniquement dans les corps de fonctions)
import { render, promptCardSelection, promptShowdown } from './ui.js';

function _recordStreetAction(street, entry) {
  if (state.streets && state.streets[street]) state.streets[street].actions.push(entry);
}

function _clearStreetFrom(fromStreet) {
  if (!state.streets) return;
  const order = ['preflop', 'flop', 'turn', 'river'];
  for (let i = order.indexOf(fromStreet); i < order.length; i++) {
    state.streets[order[i]] = { actions: [], potEnd: 0 };
  }
}

/* ================================================================
   MISES
   ================================================================ */

/**
 * Déduit une mise du stack d'un joueur et l'ajoute au pot.
 * @param {Object} player
 * @param {number} amount
 */
export function postBet(player, amount) {
  if (player.stackKnown && player.stack !== null) {
    const actual = Math.min(amount, player.stack);
    player.stack -= actual;
    player.currentBet += actual;
    player.totalBet += actual;
    state.pot += actual;
    if (player.stack === 0) player.allin = true;
  } else {
    player.currentBet += amount;
    player.totalBet += amount;
    state.pot += amount;
  }
}

/**
 * Construit la file d'action pour une street donnée (ordre clockwise).
 * @param {string} street 'preflop'|'flop'|'turn'|'river'
 * @returns {number[]} Indices des joueurs qui doivent agir
 */
export function buildActionQueue(street) {
  const inHand = state.players.filter(p => p.inHand && !p.folded && !p.allin);
  if (inHand.length === 0) return [];
  const n = state.numPlayers;
  let startIdx;
  if (street === 'preflop') {
    startIdx = n === 2
      ? state.players.findIndex(p => p.pos === 'BU')
      : (state.players.findIndex(p => p.pos === 'BB') + 1) % n;
  } else {
    startIdx = (state.players.findIndex(p => p.pos === 'BU') + 1) % n;
  }
  const queue = [];
  for (let i = 0; i < n; i++) {
    const idx = (startIdx + i) % n;
    const p = state.players[idx];
    if (p.inHand && !p.folded && !p.allin) queue.push(idx);
  }
  return queue;
}

/* ================================================================
   DÉMARRAGE DU PRÉFLOP
   ================================================================ */

/** Lance la phase préflop : poste les antes et les blinds réels. */
export function startPreflop() {
  state.pot = 0;
  state.players.forEach(p => { p.postedBlind = null; p.currentBet = 0; p.totalBet = 0; });

  // Antes
  if (state.anteEnabled) {
    const ante = _effectiveAnte();
    if (state.bbAnteMode) {
      const bbPlayer = state.players.find(p => p.pos === 'BB' && p.inHand);
      if (bbPlayer) {
        if (bbPlayer.stackKnown && bbPlayer.stack !== null) {
          const a = Math.min(ante, bbPlayer.stack);
          bbPlayer.stack -= a; bbPlayer.totalBet += a; state.pot += a;
          if (bbPlayer.stack === 0) bbPlayer.allin = true;
        } else { bbPlayer.totalBet += ante; state.pot += ante; }
      }
    } else {
      state.players.filter(p => p.inHand).forEach(p => {
        if (p.stackKnown && p.stack !== null) {
          const a = Math.min(ante, p.stack);
          p.stack -= a; p.totalBet += a; state.pot += a;
          if (p.stack === 0) p.allin = true;
        } else { p.totalBet += ante; state.pot += ante; }
      });
    }
  }

  // Blinds
  const inHand = state.players.filter(p => p.inHand);
  if (state.numPlayers === 2) {
    const bu = inHand.find(p => p.pos === 'BU');
    const bb = inHand.find(p => p.pos === 'BB');
    if (bu) postBet(bu, state.sb);
    if (bb) postBet(bb, state.bb);
  } else {
    const sb = inHand.find(p => p.pos === 'SB');
    const bb = inHand.find(p => p.pos === 'BB');
    if (sb) postBet(sb, state.sb);
    if (bb) postBet(bb, state.bb);
  }
  state.currentBet = state.bb;

  const queue = buildActionQueue('preflop');
  state.betRound = { street: 'preflop', queue, qIndex: 0, lastRaiserIdx: null, lastRaiseSize: state.bb, history: [] };
  state.step = 'preflop';
  state.streets = {
    preflop: { actions: [], potEnd: 0 },
    flop:    { actions: [], potEnd: 0 },
    turn:    { actions: [], potEnd: 0 },
    river:   { actions: [], potEnd: 0 }
  };
  render();
}

function _effectiveAnte() {
  if (!state.anteEnabled) return 0;
  if (state.bbAnteMode) return state.bb;
  return state.ante || 0;
}

/* ================================================================
   ACTIONS
   ================================================================ */

/**
 * Traite une action d'un joueur (fold/check/call/raise/allin).
 * @param {Object} player
 * @param {string} action
 * @param {number|null} [totalBet]
 */
export function doAction(player, action, totalBet = null) {
  const br = state.betRound;
  if (!br) return;

  const _histLen = br.history.length;
  const snapshot = JSON.parse(JSON.stringify({
    players: state.players, pot: state.pot, currentBet: state.currentBet,
    qIndex: br.qIndex, queue: br.queue,
    lastRaiserIdx: br.lastRaiserIdx, lastRaiseSize: br.lastRaiseSize,
    step: state.step, board: state.board
  }));

  if (action === 'fold') {
    player.folded = true;
    br.history.push({ idx: player.idx, action: 'fold', snapshot });
    br.qIndex++;
  } else if (action === 'check') {
    br.history.push({ idx: player.idx, action: 'check', snapshot });
    br.qIndex++;
  } else if (action === 'call') {
    const toCall = state.currentBet - player.currentBet;
    postBet(player, toCall);
    br.history.push({ idx: player.idx, action: 'call', amount: toCall, snapshot });
    br.qIndex++;
  } else if (action === 'raise') {
    const additional = totalBet - player.currentBet;
    if (additional <= 0) return;
    if (player.stackKnown && player.stack !== null) {
      const actual = Math.min(additional, player.stack);
      player.stack -= actual; player.currentBet += actual;
      player.totalBet += actual; state.pot += actual;
      if (player.stack === 0) player.allin = true;
    } else {
      player.currentBet = totalBet;
      player.totalBet += additional;
      state.pot += additional;
    }
    const prevBet = state.currentBet;
    state.currentBet = Math.max(state.currentBet, player.currentBet);
    const raiseSize = state.currentBet - prevBet;
    if (raiseSize > 0) br.lastRaiseSize = raiseSize;
    br.lastRaiserIdx = player.idx;
    br.history.push({ idx: player.idx, action: 'raise', amount: totalBet, snapshot });

    // Rouvrir la file pour les joueurs restants
    const newQueue = [];
    const startPos = (state.players.findIndex(pp => pp.idx === player.idx) + 1) % state.numPlayers;
    for (let i = 0; i < state.numPlayers; i++) {
      const idx = (startPos + i) % state.numPlayers;
      const p = state.players[idx];
      if (p.idx === player.idx) break;
      if (p.inHand && !p.folded && !p.allin) newQueue.push(idx);
    }
    br.queue = newQueue; br.qIndex = 0;
  } else if (action === 'allin') {
    const additional = totalBet - player.currentBet;
    if (additional <= 0) return;
    if (player.stackKnown && player.stack !== null) {
      const actual = Math.min(additional, player.stack);
      player.stack -= actual; player.currentBet += actual;
      player.totalBet += actual; state.pot += actual;
      player.allin = true;
    } else {
      player.currentBet = totalBet;
      player.totalBet += additional;
      state.pot += additional;
      player.allin = true;
    }
    const allinAmount = player.currentBet;
    if (allinAmount > state.currentBet) {
      const prevBet = state.currentBet;
      state.currentBet = allinAmount;
      const raiseSize = allinAmount - prevBet;
      if (raiseSize >= br.lastRaiseSize) br.lastRaiseSize = raiseSize;
      br.lastRaiserIdx = player.idx;
    }
    const newQueue = [];
    const startPos = (state.players.findIndex(pp => pp.idx === player.idx) + 1) % state.numPlayers;
    for (let i = 0; i < state.numPlayers; i++) {
      const idx = (startPos + i) % state.numPlayers;
      const p = state.players[idx];
      if (p.idx === player.idx) break;
      if (!p.inHand || p.folded || p.allin) continue;
      if (p.currentBet >= allinAmount) continue;
      newQueue.push(idx);
    }
    br.queue = newQueue; br.qIndex = 0;
    br.history.push({ idx: player.idx, action: 'allin', amount: totalBet, snapshot });
  }

  if (br.history.length > _histLen) {
    const _h = br.history[br.history.length - 1];
    const _entry = { pos: player.pos, action: _h.action };
    if (_h.amount !== undefined) _entry.amount = _h.amount;
    _recordStreetAction(br.street, _entry);
  }

  applySidePotAdjustment();
  render();

  const active = getActivePlayers();
  if (active.length === 1) {
    state.step = 'result';
    active[0].result = 'win';
    active[0].handValueLabel = 'Gagne sans abattage';
    state.winners = [{ pos: active[0].pos, share: state.pot }];
    state.finalPotForDisplay = state.pot;
    concludeHand();
    return;
  }

  const stillCanAct = active.filter(p => !p.allin);
  if (stillCanAct.length <= 1 && br.queue.length === 0) {
    skipToShowdown();
    return;
  }
  promptNext();
}

/** Ajuste le pot en cas de side-pot (tous-in asymétriques). */
export function applySidePotAdjustment() {
  const active = getActivePlayers();
  const allinPlayers = active.filter(p => p.allin);
  if (allinPlayers.length < 2) return;
  const stillCanAct = active.filter(p => !p.allin);
  if (stillCanAct.length > 0) return;
  const sortedBets = active.map(p => p.currentBet).sort((a,b) => b - a);
  if (sortedBets.length < 2) return;
  const cap = sortedBets[1];
  active.forEach(p => {
    if (p.currentBet > cap) {
      const excess = p.currentBet - cap;
      p.currentBet -= excess; p.totalBet -= excess; state.pot -= excess;
      if (p.stackKnown) p.stack += excess;
      if (p.stackKnown && p.stack > 0) p.allin = false;
    }
  });
}

/** Passe au joueur suivant dans la file ou clôture la street. */
export function promptNext() {
  const br = state.betRound;
  if (!br) return;
  if (br.qIndex >= br.queue.length) { finishStreet(); return; }
  const idx = br.queue[br.qIndex];
  const player = state.players[idx];
  if (player.folded || !player.inHand || player.allin) { br.qIndex++; promptNext(); return; }
  if (br.lastRaiserIdx === player.idx && player.currentBet === state.currentBet) { finishStreet(); return; }
  render();
}

/* ================================================================
   TRANSITIONS DE STREETS
   ================================================================ */

/** Clôture la street en cours et passe à la suivante. */
export function finishStreet() {
  const br = state.betRound;
  if (state.streets && br) state.streets[br.street].potEnd = state.pot;
  state.players.forEach(p => { p.currentBet = 0; });
  state.currentBet = 0;

  const active = getActivePlayers();
  if (active.length === 1) {
    state.step = 'result';
    active[0].result = 'win';
    active[0].handValueLabel = 'Gagne sans abattage';
    state.winners = [{ pos: active[0].pos, share: state.pot }];
    state.finalPotForDisplay = state.pot;
    concludeHand();
    return;
  }

  const stillCanAct = active.filter(p => !p.allin);
  if (stillCanAct.length <= 1 && br.street !== 'river') {
    if (br.street === 'preflop') { state.step = 'flop-cards';  render(); promptCardSelection('flop',  true); return; }
    if (br.street === 'flop')   { state.step = 'turn-cards';  render(); promptCardSelection('turn',  true); return; }
    if (br.street === 'turn')   { state.step = 'river-cards'; render(); promptCardSelection('river', true); return; }
  }

  if (br.street === 'preflop') { state.step = 'flop-cards';  render(); promptCardSelection('flop'); }
  else if (br.street === 'flop')   { state.step = 'turn-cards';  render(); promptCardSelection('turn'); }
  else if (br.street === 'turn')   { state.step = 'river-cards'; render(); promptCardSelection('river'); }
  else if (br.street === 'river')  { state.step = 'showdown'; render(); promptShowdown(); }
}

/** Passe directement au showdown (tous en all-in ou un seul actif). */
export function skipToShowdown() {
  const br = state.betRound;
  if (!br) return;
  if (state.streets && br) state.streets[br.street].potEnd = state.pot;
  state.players.forEach(p => { p.currentBet = 0; });
  state.currentBet = 0;
  const street = br.street;
  if (street === 'preflop') { state.step = 'flop-cards';  render(); promptCardSelection('flop',  true); }
  else if (street === 'flop')   { state.step = 'turn-cards';  render(); promptCardSelection('turn',  true); }
  else if (street === 'turn')   { state.step = 'river-cards'; render(); promptCardSelection('river', true); }
  else { state.step = 'showdown'; render(); promptShowdown(); }
}

/* ================================================================
   RETOUR EN ARRIÈRE
   ================================================================ */

/** Annule la dernière action dans la file d'enchères courante. */
export function goBackOneAction() {
  const br = state.betRound;
  state.raiseShownFor = null;
  state.allinShownFor = null;
  if (!br) { handleGlobalBack(); return; }

  if (br.history.length === 0) {
    if (br.street === 'preflop') {
      state.players.forEach(p => { p.currentBet = 0; p.totalBet = 0; p.folded = false; p.allin = false; });
      state.pot = 0; state.currentBet = 0;
      state.betRound = null; state.step = 'setup';
      state.streets = null;
      postBlindsForPreview(); render(); return;
    } else {
      const map = { 'flop': 'flop-cards', 'turn': 'turn-cards', 'river': 'river-cards' };
      if (br.street === 'flop')  state.board = state.board.slice(0, 0);
      if (br.street === 'turn')  state.board = state.board.slice(0, 3);
      if (br.street === 'river') state.board = state.board.slice(0, 4);
      state.players.forEach(p => { p.currentBet = 0; });
      state.currentBet = 0; _clearStreetFrom(br.street); state.betRound = null;
      state.step = map[br.street]; render();
      promptCardSelection(br.street); return;
    }
  }

  if (state.streets && state.streets[br.street]) state.streets[br.street].actions.pop();
  const last = br.history.pop();
  state.players = last.snapshot.players;
  state.pot = last.snapshot.pot;
  state.currentBet = last.snapshot.currentBet;
  br.queue = last.snapshot.queue;
  br.qIndex = last.snapshot.qIndex;
  br.lastRaiserIdx = last.snapshot.lastRaiserIdx;
  if (last.snapshot.lastRaiseSize !== undefined) br.lastRaiseSize = last.snapshot.lastRaiseSize;
  render();
}

/** Gère le bouton "← Retour" global (hors d'un tour de mises). */
export function handleGlobalBack() {
  if (state.step === 'setup') { rebuildPlayers(); render(); return; }

  if (state.step === 'showdown' || state.step === 'result') {
    state.players.forEach(p => {
      p.currentBet = 0; p.handValueLabel = null; p.handScore = null; p.result = null;
    });
    state.currentBet = 0; state.winners = [];
    state.step = 'river-bet';
    state.betRound = { street: 'river', queue: buildActionQueue('river'), qIndex: 0, lastRaiserIdx: null, lastRaiseSize: state.bb, history: [] };
    _clearStreetFrom('river');
    render(); return;
  }

  if (state.step.endsWith('-cards')) {
    const prevMap = { 'flop-cards': 'preflop', 'turn-cards': 'flop-bet', 'river-cards': 'turn-bet' };
    if (state.step === 'flop-cards') {
      state.players.forEach(p => { p.currentBet = 0; });
      state.currentBet = 0; state.step = 'preflop';
      state.betRound = { street: 'preflop', queue: buildActionQueue('preflop'), qIndex: 0, lastRaiserIdx: null, lastRaiseSize: state.bb, history: [] };
      _clearStreetFrom('preflop');
      const bb = state.players.find(p => p.pos === 'BB' && p.inHand);
      const buIdx = state.players.findIndex(p => p.pos === 'BU' && p.inHand);
      if (state.numPlayers === 2 && buIdx >= 0) state.players[buIdx].currentBet = state.sb;
      if (bb) bb.currentBet = state.bb;
      render(); return;
    }
    state.step = prevMap[state.step];
    if (state.step === 'flop-bet') state.board = state.board.slice(0, 3);
    if (state.step === 'turn-bet') state.board = state.board.slice(0, 4);
    const street = state.step.replace('-bet', '');
    state.players.forEach(p => { p.currentBet = 0; });
    state.currentBet = 0;
    state.betRound = { street, queue: buildActionQueue(street), qIndex: 0, lastRaiserIdx: null, lastRaiseSize: state.bb, history: [] };
    _clearStreetFrom(street);
    render();
  }
}

/* ================================================================
   FIN DE MAIN
   ================================================================ */

/**
 * Sauvegarde la main terminée et déclenche le rendu final.
 * Appelé après chaque chemin menant à state.step === 'result'.
 */
export function concludeHand() {
  render();
  showTourneyConfirmModal(
    () => {
      saveHand(buildHandRecord());
      showToast('Hand saved');
    },
    () => { showToast('Hand not saved'); }
  );
}

/**
 * Évalue les mains au showdown, détermine le(s) gagnant(s)
 * et affiche l'écran de résultat.
 */
export function finishHand() {
  state.step = 'result';
  const active = getActivePlayers();
  const evaluated = [];

  for (const p of active) {
    if (p.cards.length === 2) {
      const ev = evaluateHand([...p.cards, ...state.board]);
      p.handScore = ev.score;
      p.handValueLabel = ev.label;
      evaluated.push(p);
    } else {
      p.handScore = null; p.result = 'lose'; p.handValueLabel = null;
    }
  }

  let winnersList = [];
  if (evaluated.length === 1) {
    evaluated[0].result = 'win'; winnersList = [evaluated[0]];
  } else if (evaluated.length > 1) {
    const best = Math.max(...evaluated.map(p => p.handScore));
    const winners = evaluated.filter(p => p.handScore === best);
    if (winners.length === 1) {
      winners[0].result = 'win';
      evaluated.filter(p => p !== winners[0]).forEach(p => p.result = 'lose');
      winnersList = winners;
    } else {
      winners.forEach(p => p.result = 'tie');
      evaluated.filter(p => !winners.includes(p)).forEach(p => p.result = 'lose');
      winnersList = winners;
    }
  }

  state.finalPotForDisplay = state.pot;
  state.winners = winnersList.length > 0
    ? winnersList.map(p => ({ pos: p.pos, share: state.pot / winnersList.length }))
    : [];

  concludeHand();
}
