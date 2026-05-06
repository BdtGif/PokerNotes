/* storage.js — Persistance des mains dans localStorage */

import { state } from './state.js';
import { showToast } from './utils.js';

export const STORAGE_KEY = 'pokernotes_hands';

/** @returns {string} Identifiant unique pour une main */
export function generateId() {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/** @returns {Object[]} Toutes les mains sauvegardées */
export function loadAllHands() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch (_) { return []; }
}

/** @param {Object[]} hands */
export function saveAllHands(hands) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(hands)); }
  catch (_) { showToast('Stockage insuffisant', 3000); }
}

/**
 * Sauvegarde ou met à jour une main (par ID).
 * @param {Object} hand
 */
export function saveHand(hand) {
  const hands = loadAllHands();
  const idx = hands.findIndex(h => h.id === hand.id);
  if (idx >= 0) hands[idx] = hand; else hands.push(hand);
  saveAllHands(hands);
}

/** @param {string} id */
export function deleteHand(id) {
  saveAllHands(loadAllHands().filter(h => h.id !== id));
}

/**
 * Construit l'enregistrement d'une main à partir de l'état courant.
 * @returns {Object}
 */
export function buildHandRecord() {
  return {
    id: generateId(),
    date: new Date().toISOString(),
    sb: state.sb, bb: state.bb,
    ante: state.ante, anteEnabled: state.anteEnabled, bbAnteMode: state.bbAnteMode,
    numPlayers: state.numPlayers,
    players: state.players.map(p => ({
      pos: p.pos, inHand: p.inHand,
      stack: p.stack, stackKnown: p.stackKnown,
      cards: [...p.cards], result: p.result,
      handValueLabel: p.handValueLabel,
      folded: p.folded, allin: p.allin, totalBet: p.totalBet
    })),
    board: [...state.board],
    pot: state.finalPotForDisplay || state.pot,
    winners: state.winners.map(w => ({ ...w }))
  };
}
