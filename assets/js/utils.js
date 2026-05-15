/* utils.js — Helpers DOM, formatage, cartes et notifications */

import { state, SUITS } from './state.js';

/** @param {string} id @returns {HTMLElement} */
export function $(id) { return document.getElementById(id); }

/** @param {number} n @returns {string} */
export function fmtChips(n) { return Math.round(n).toLocaleString('fr-FR'); }

/** @param {number|null} n @returns {string} */
export function fmtStack(n) {
  if (n === null || n === undefined) return '?';
  if (state.stackUnit === 'bb') return (n / state.bb).toFixed(1) + ' bb';
  return fmtChips(n);
}

/** @param {number} n @returns {string} */
export function fmtAmount(n) {
  if (state.stackUnit === 'bb') return (n / state.bb).toFixed(1) + ' bb';
  return fmtChips(n);
}

/**
 * Retourne les métadonnées d'affichage d'une carte.
 * @param {string} card ex: 'Ah'
 * @returns {{rank:string, sym:string, color:string, cssClass:string}}
 */
export function cardLabel(card) {
  const suit = SUITS.find(s => s.code === card[1]);
  return { rank: card[0], sym: suit.sym, color: suit.color, cssClass: suit.cssClass };
}

/** @param {string} card @returns {string} HTML interne d'une carte */
export function cardInnerHtml(card) {
  const lbl = cardLabel(card);
  return `<span class="card-sym-tl">${lbl.sym}</span><span class="card-rank">${lbl.rank}</span>`;
}

/** @param {string} card @returns {boolean} */
export function isCardUsed(card) {
  if (state.board.includes(card)) return true;
  for (const p of state.players) {
    if (p.cards.includes(card)) return true;
  }
  return false;
}

/** @returns {Object[]} Joueurs encore en jeu (pas foldé) */
export function getActivePlayers() {
  return state.players.filter(p => p.inHand && !p.folded);
}

/** @returns {number} Montant de l'ante effectif */
export function getEffectiveAnte() {
  if (!state.anteEnabled) return 0;
  if (state.bbAnteMode) return state.bb;
  return state.ante || 0;
}

/**
 * Convertit un code pays ISO-2 (FR, US, GB…) en emoji drapeau.
 * @param {string} code @returns {string}
 */
export function countryCodeToFlag(code) {
  if (!code || code.length !== 2) return '';
  const base = 0x1F1A5;
  const c = code.toUpperCase();
  return String.fromCodePoint(base + c.charCodeAt(0), base + c.charCodeAt(1));
}

/**
 * Renvoie le label court d'un réseau SharkScope.
 * Ex: "PokerStars(FR-ES-PT)" → "PokerStars".
 * @param {string} network @returns {string}
 */
export function networkShortLabel(network) {
  if (!network) return '';
  return network.replace(/\s*\(.*\)\s*$/, '').trim();
}

/**
 * Affiche un toast de notification temporaire.
 * @param {string} msg
 * @param {number} [duration=2000] en millisecondes
 */
export function showToast(msg, duration = 2000) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), duration);
}
