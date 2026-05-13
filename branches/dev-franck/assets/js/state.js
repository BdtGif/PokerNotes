/* state.js — Constantes globales et état mutable de l'application */

export const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
export const RANK_VAL = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };
export const SUITS = [
  { sym: '♠', code: 's', color: 'black', name: 'Pique',   cssClass: 'suit-s' },
  { sym: '♥', code: 'h', color: 'red',   name: 'Cœur',    cssClass: 'suit-h' },
  { sym: '♦', code: 'd', color: 'red',   name: 'Carreau', cssClass: 'suit-d' },
  { sym: '♣', code: 'c', color: 'black', name: 'Trèfle',  cssClass: 'suit-c' }
];
export const POSITIONS = {
  2:  ['BU','BB'],
  3:  ['BU','SB','BB'],
  4:  ['BU','SB','BB','CO'],
  5:  ['BU','SB','BB','HJ','CO'],
  6:  ['BU','SB','BB','LJ','HJ','CO'],
  7:  ['BU','SB','BB','UTG','LJ','HJ','CO'],
  8:  ['BU','SB','BB','UTG','UTG+1','LJ','HJ','CO'],
  9:  ['BU','SB','BB','UTG','UTG+1','MP','LJ','HJ','CO'],
  10: ['BU','SB','BB','UTG','UTG+1','UTG+2','MP','LJ','HJ','CO']
};
export const HAND_RANK_LABELS = [
  'High card','Pair','Two pair','Three of a kind','Straight',
  'Flush','Full house','Four of a kind','Straight flush','Royal flush'
];

/** État global de la session en cours. Muté directement par les modules. */
export const state = {
  step: 'setup',
  sb: 25, bb: 50,
  sbManual: false,
  anteEnabled: false,
  ante: 0,
  bbAnteMode: false,
  numPlayers: 6,
  stackUnit: 'bb',
  heroIdx: null,
  players: [],
  board: [],
  pot: 0,
  currentBet: 0,
  betRound: null,
  raiseInput: '',
  allinInput: '',
  raiseShownFor: null,
  allinShownFor: null,
  raiseError: null,
  winners: [],
  finalPotForDisplay: 0,
  streets: null
};
