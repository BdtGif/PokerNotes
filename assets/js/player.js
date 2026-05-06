/* player.js — Initialisation des joueurs et prévisualisation des blinds */

import { state, POSITIONS } from './state.js';
import { getEffectiveAnte } from './utils.js';

/**
 * Reconstruit la liste des joueurs pour une nouvelle main
 * et réinitialise toutes les variables de jeu.
 */
export function rebuildPlayers() {
  const positions = POSITIONS[state.numPlayers];
  state.players = positions.map((pos, idx) => ({
    idx, pos,
    inHand: false,
    stack: null, stackKnown: false,
    cards: [],
    folded: false, allin: false,
    totalBet: 0, currentBet: 0,
    handValueLabel: null, handScore: null, result: null,
    postedBlind: null
  }));
  state.heroIdx = null;
  state.board = [];
  state.pot = 0;
  state.currentBet = 0;
  state.betRound = null;
  state.raiseShownFor = null;
  state.allinShownFor = null;
  state.winners = [];
  state.finalPotForDisplay = 0;
  state.step = 'setup';
  state.streets = null;
  postBlindsForPreview();
}

/**
 * Simule le versement des blinds/antes pour la prévisualisation
 * (écran de configuration, avant validation).
 */
export function postBlindsForPreview() {
  state.players.forEach(p => { p.postedBlind = null; p.currentBet = 0; });
  state.pot = 0;

  if (state.numPlayers === 2) {
    const bu = state.players.find(p => p.pos === 'BU');
    const bb = state.players.find(p => p.pos === 'BB');
    if (bu) { bu.postedBlind = 'sb'; bu.currentBet = state.sb; state.pot += state.sb; }
    if (bb) { bb.postedBlind = 'bb'; bb.currentBet = state.bb; state.pot += state.bb; }
  } else {
    const sb = state.players.find(p => p.pos === 'SB');
    const bb = state.players.find(p => p.pos === 'BB');
    if (sb) { sb.postedBlind = 'sb'; sb.currentBet = state.sb; state.pot += state.sb; }
    if (bb) { bb.postedBlind = 'bb'; bb.currentBet = state.bb; state.pot += state.bb; }
  }

  if (state.anteEnabled) {
    const ante = getEffectiveAnte();
    // BB/Ante : une seule ante pour la table payée par la BB
    if (state.bbAnteMode) { state.pot += ante; }
    else { state.pot += ante * state.numPlayers; }
  }
}
