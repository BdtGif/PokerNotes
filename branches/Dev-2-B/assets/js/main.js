/* main.js — Point d'entrée : bindings DOM et initialisation */

import { state } from './state.js';
import { $ } from './utils.js';
import { rebuildPlayers, postBlindsForPreview } from './player.js';
import { startPreflop, goBackOneAction, handleGlobalBack } from './hand.js';
import { render, showModal, closeModal, bindEnterToValidate } from './ui.js';
import { showHistoryModal } from './history.js';

/* ---------- Player count ---------- */
$('pc-plus').addEventListener('click', () => {
  if (state.numPlayers < 10) {
    state.numPlayers++;
    $('pc-value').textContent = state.numPlayers;
    rebuildPlayers();
    render();
  }
});
$('pc-minus').addEventListener('click', () => {
  if (state.numPlayers > 2) {
    state.numPlayers--;
    $('pc-value').textContent = state.numPlayers;
    rebuildPlayers();
    render();
  }
});

/* ---------- Blinds ---------- */
$('sb-input').addEventListener('input', (e) => {
  state.sb = Math.max(0, parseInt(e.target.value) || 0);
  state.sbManual = true;
  if (state.step === 'setup') postBlindsForPreview();
  render();
});
$('bb-input').addEventListener('input', (e) => {
  state.bb = Math.max(1, parseInt(e.target.value) || 1);
  if (!state.sbManual) {
    state.sb = Math.floor(state.bb / 2);
  }
  if (state.step === 'setup') postBlindsForPreview();
  render();
});
bindEnterToValidate('sb-input', null);
bindEnterToValidate('bb-input', null);

/* ---------- Ante ---------- */
$('ante-toggle').addEventListener('click', () => {
  state.anteEnabled = !state.anteEnabled;
  if (!state.anteEnabled) {
    state.bbAnteMode = false;
    state.ante = 0;
  }
  if (state.step === 'setup') postBlindsForPreview();
  render();
});
$('bbante-toggle').addEventListener('click', () => {
  if (!state.anteEnabled) state.anteEnabled = true;
  state.bbAnteMode = !state.bbAnteMode;
  if (state.step === 'setup') postBlindsForPreview();
  render();
});
$('ante-input').addEventListener('input', (e) => {
  state.ante = Math.max(0, parseInt(e.target.value) || 0);
  if (state.step === 'setup') postBlindsForPreview();
  render();
});

/* ---------- Unit switch ---------- */
$('unit-switch').addEventListener('click', () => {
  state.stackUnit = state.stackUnit === 'chips' ? 'bb' : 'chips';
  render();
});

/* ---------- Validate / Back / Reset ---------- */
$('validate-setup-btn').addEventListener('click', () => {
  if (state.step === 'setup') startPreflop();
  else if (state.step === 'result') {
    rebuildPlayers();
    render();
  }
});

$('back-btn').addEventListener('click', () => {
  if (state.step === 'setup') {
    rebuildPlayers();
    render();
  } else if (state.step.endsWith('-bet') || state.step === 'preflop') {
    goBackOneAction();
  } else {
    handleGlobalBack();
  }
});

$('reset-btn').addEventListener('click', () => {
  const html = `
    <div class="modal-title">Réinitialiser ?</div>
    <div class="modal-subtitle">Démarrer une nouvelle main ?</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="reset-cancel">Annuler</button>
      <button class="btn btn-primary" id="reset-confirm" style="background:#b91c1c;">Réinitialiser</button>
    </div>
  `;
  showModal(html, {
    onMount: () => {
      $('reset-cancel').addEventListener('click', closeModal);
      $('reset-confirm').addEventListener('click', () => {
        closeModal();
        state.heroIdx = null;
        state.board = [];
        state.pot = 0;
        state.currentBet = 0;
        state.betRound = null;
        state.raiseShownFor = null;
        state.allinShownFor = null;
        state.raiseInput = '';
        state.allinInput = '';
        state.winners = [];
        state.finalPotForDisplay = 0;
        state.step = 'setup';
        rebuildPlayers();
        render();
      });
    }
  });
});

/* ---------- History ---------- */
$('history-btn').addEventListener('click', showHistoryModal);

/* ---------- Resize (Android keyboard guard) ---------- */
// V10.1 — debounce resize and skip when a numeric input is focused to avoid
// destroying a focused input mid-typing when the Android keyboard triggers resize.
let _resizeTO = null;
let _lastVPHeight = window.innerHeight;
window.addEventListener('resize', () => {
  const ae = document.activeElement;
  const typing = ae && ae.tagName === 'INPUT' &&
    (ae.id === 'ap-raise-input' || ae.id === 'ap-allin-input' ||
     ae.id === 'sb-input' || ae.id === 'bb-input' || ae.id === 'ante-input');
  const heightDelta = Math.abs(window.innerHeight - _lastVPHeight);
  _lastVPHeight = window.innerHeight;
  if (typing) return;
  if (heightDelta > 0 && document.activeElement && document.activeElement.tagName === 'INPUT') return;
  clearTimeout(_resizeTO);
  _resizeTO = setTimeout(() => render(), 150);
});

/* ---------- Init ---------- */
rebuildPlayers();
render();
