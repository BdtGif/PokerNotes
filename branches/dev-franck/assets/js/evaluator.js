/* evaluator.js — Évaluation des mains Hold'em 7 cartes (fonctions pures) */

import { RANK_VAL, HAND_RANK_LABELS } from './state.js';

/**
 * Évalue la meilleure main de 5 cartes parmi les 7 données.
 * @param {string[]} cards ex: ['Ah','Kd','2s','Tc','Jh','Qd','9c']
 * @returns {{score:number, cat:number, label:string}|null}
 */
export function evaluateHand(cards) {
  if (cards.length < 5) return null;
  const combos = combinations(cards, 5);
  let best = null;
  for (const c of combos) {
    const s = scoreFiveCard(c);
    if (!best || s.score > best.score) best = s;
  }
  return best;
}

function combinations(arr, k) {
  const result = [];
  const helper = (start, combo) => {
    if (combo.length === k) { result.push([...combo]); return; }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]); helper(i + 1, combo); combo.pop();
    }
  };
  helper(0, []); return result;
}

function scoreFiveCard(cards) {
  const ranks = cards.map(c => RANK_VAL[c[0]]).sort((a,b) => b - a);
  const suits = cards.map(c => c[1]);
  const isFlush = suits.every(s => s === suits[0]);
  const uniq = [...new Set(ranks)];
  let isStraight = false, straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) { isStraight = true; straightHigh = uniq[0]; }
    if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) {
      isStraight = true; straightHigh = 5;
    }
  }
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r]||0) + 1);
  const countVals = Object.values(counts).sort((a,b) => b - a);
  const groupedRanks = Object.entries(counts)
    .map(([r,c]) => ({ r: parseInt(r), c }))
    .sort((a,b) => b.c - a.c || b.r - a.r);

  let cat = 0, tieBreak = [];
  if (isStraight && isFlush && straightHigh === 14) { cat = 9; tieBreak = [14]; }
  else if (isStraight && isFlush)          { cat = 8; tieBreak = [straightHigh]; }
  else if (countVals[0] === 4)             { cat = 7; tieBreak = [groupedRanks[0].r, groupedRanks[1].r]; }
  else if (countVals[0] === 3 && countVals[1] === 2) { cat = 6; tieBreak = [groupedRanks[0].r, groupedRanks[1].r]; }
  else if (isFlush)                        { cat = 5; tieBreak = ranks; }
  else if (isStraight)                     { cat = 4; tieBreak = [straightHigh]; }
  else if (countVals[0] === 3) {
    cat = 3;
    tieBreak = [groupedRanks[0].r, ...ranks.filter(r => r !== groupedRanks[0].r)];
  }
  else if (countVals[0] === 2 && countVals[1] === 2) {
    cat = 2;
    const pairs = [groupedRanks[0].r, groupedRanks[1].r].sort((a,b) => b - a);
    tieBreak = [...pairs, groupedRanks[2].r];
  }
  else if (countVals[0] === 2) {
    cat = 1;
    tieBreak = [groupedRanks[0].r, ...ranks.filter(r => r !== groupedRanks[0].r)];
  }
  else { cat = 0; tieBreak = ranks; }

  let score = cat * 1e10, mult = 1e8;
  for (const t of tieBreak) { score += t * mult; mult /= 100; }
  return { score, cat, label: HAND_RANK_LABELS[cat] };
}
