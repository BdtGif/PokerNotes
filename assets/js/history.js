/* history.js — Modal historique, export/import JSON */

import { $, fmtChips, cardLabel } from './utils.js';
import { state } from './state.js';
import { loadAllHands, saveAllHands, deleteHand } from './storage.js';
import { showModal, closeModal } from './ui.js';

function fmtHistAmt(n, bb) {
  if (state.stackUnit === 'bb' && bb) return (n / bb).toFixed(1) + ' bb';
  return fmtChips(n);
}

/** @param {Object} hand @returns {string} */
export function handResultSummary(hand) {
  if (!hand.winners || hand.winners.length === 0) return 'Main incomplète';
  if (hand.winners.length > 1)
    return 'Égalité : ' + hand.winners.map(w => w.pos).join(' / ');
  const w = hand.winners[0];
  const wp = (hand.players || []).find(p => p.pos === w.pos);
  const label = wp && wp.handValueLabel ? ' — ' + wp.handValueLabel : '';
  return w.pos + ' gagne' + label + ' (' + fmtHistAmt(w.share, hand.bb) + ')';
}

/** @param {string} card @returns {string} */
export function histCardHtml(card) {
  const l = cardLabel(card);
  return `<div class="history-card ${l.cssClass}">${l.rank}</div>`;
}

function _fmtAction(a, bb) {
  switch (a.action) {
    case 'fold':  return `<span class="hs-fold">${a.pos} fold</span>`;
    case 'check': return `${a.pos} chk`;
    case 'call':  return `${a.pos} call ${fmtHistAmt(a.amount, bb)}`;
    case 'raise': return `${a.pos} raise ${fmtHistAmt(a.amount, bb)}`;
    case 'allin': return `${a.pos} shove ${fmtHistAmt(a.amount, bb)}`;
    default:      return `${a.pos} ${a.action}`;
  }
}

function _handStreetsHtml(hand) {
  if (!hand.streets) return '';
  const defs = [
    { key: 'preflop', label: 'PF' },
    { key: 'flop',    label: 'Flop' },
    { key: 'turn',    label: 'Turn' },
    { key: 'river',   label: 'River' }
  ];
  const parts = [];
  for (const { key, label } of defs) {
    const st = hand.streets[key];
    if (!st) continue;
    const hasActions = st.actions && st.actions.length > 0;
    const hasCards   = st.cards && st.cards.length > 0;
    if (!hasActions && !hasCards) continue;
    let row = `<div class="hs-street">`;
    row += `<span class="hs-label">${label}</span>`;
    if (hasCards) row += `<span class="hs-cards">${st.cards.map(histCardHtml).join('')}</span>`;
    if (hasActions) row += `<span class="hs-actions">${st.actions.map(a => _fmtAction(a, hand.bb)).join(' · ')}</span>`;
    row += `</div>`;
    parts.push(row);
  }
  return parts.length ? `<div class="hs-streets">${parts.join('')}</div>` : '';
}

export function showHistoryModal() {
  const hands = loadAllHands().slice().reverse();
  const count = hands.length;

  const listHtml = count === 0
    ? '<div class="history-empty">Aucune main sauvegardée.<br>Jouez une main pour commencer.</div>'
    : hands.map(hand => {
        const d = new Date(hand.date);
        const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const inHandCount = (hand.players || []).filter(p => p.inHand).length;
        const anteTag = hand.anteEnabled
          ? (hand.bbAnteMode ? ' · BB/Ante' : ` · Ante ${hand.ante}`) : '';
        const summary = handResultSummary(hand);

        const heroPlayer = (hand.players || []).find(p => p.inHand && p.cards && p.cards.length === 2);
        const heroHtml = heroPlayer ? heroPlayer.cards.map(histCardHtml).join('') : '';
        const boardHtml = (hand.board || []).map(histCardHtml).join('');
        const cardsRow = heroHtml || boardHtml ? `
          <div class="history-cards-row">
            ${heroHtml ? `<div class="history-card-group">${heroHtml}</div>` : ''}
            ${boardHtml ? `<div class="history-card-group history-board-group">${boardHtml}</div>` : ''}
          </div>` : '';

        const outcomeClass = !hand.winners || hand.winners.length === 0
          ? 'history-item--incomplete'
          : hand.winners.length > 1 ? 'history-item--tie' : 'history-item--win';
        return `<div class="history-item ${outcomeClass}">
          <div class="history-item-header">
            <div class="history-meta">
              <span class="history-date">${dateStr} ${timeStr}</span>
              <span class="history-blinds">${hand.sb}/${hand.bb}${anteTag} · ${inHandCount} joueurs</span>
            </div>
            <button class="history-delete-btn" data-id="${hand.id}">✕</button>
          </div>
          <div class="history-summary">${summary}</div>
          ${_handStreetsHtml(hand)}
          ${cardsRow}
        </div>`;
      }).join('');

  const html = `
    <div class="modal-title">Historique (${count})</div>
    <div class="history-toolbar">
      <button class="btn btn-secondary hist-btn" id="hist-export"${count === 0 ? ' disabled' : ''}>↓ Exporter JSON</button>
      <label class="btn btn-secondary hist-btn history-import-label">
        ↑ Importer JSON
        <input type="file" id="hist-import-input" accept=".json,application/json" style="display:none">
      </label>
    </div>
    <div class="history-list">${listHtml}</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="hist-close">Fermer</button>
      ${count > 0 ? '<button class="btn" style="background:#4b1c1c;color:#fca5a5;border:1px solid #7f1d1d;flex:0.7;" id="hist-clear">Tout effacer</button>' : ''}
    </div>`;

  showModal(html, {
    onMount: () => {
      $('hist-close').addEventListener('click', closeModal);

      const expBtn = $('hist-export');
      if (expBtn) expBtn.addEventListener('click', exportHistory);

      const impInput = $('hist-import-input');
      if (impInput) impInput.addEventListener('change', e => {
        if (e.target.files[0]) handleImportFile(e.target.files[0]);
      });

      const clrBtn = $('hist-clear');
      if (clrBtn) clrBtn.addEventListener('click', () => {
        showModal(`
          <div class="modal-title">Tout effacer ?</div>
          <div class="modal-subtitle">L'historique sera définitivement supprimé.</div>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="clr-cancel">Annuler</button>
            <button class="btn" style="background:#b91c1c;color:white;" id="clr-confirm">Effacer tout</button>
          </div>`, {
          onMount: () => {
            $('clr-cancel').addEventListener('click', () => { closeModal(); showHistoryModal(); });
            $('clr-confirm').addEventListener('click', () => { saveAllHands([]); closeModal(); showHistoryModal(); });
          }
        });
      });

      document.querySelectorAll('.history-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => { deleteHand(btn.dataset.id); showHistoryModal(); });
      });
    }
  });
}

export function exportHistory() {
  const hands = loadAllHands();
  if (hands.length === 0) return;
  const dateStr = new Date().toISOString().split('T')[0];
  const payload = JSON.stringify({ version: '10.2', exportDate: new Date().toISOString(), hands }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `poker_hands_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      const incoming = Array.isArray(parsed) ? parsed : (parsed.hands || []);
      if (!Array.isArray(incoming) || incoming.length === 0)
        throw new Error('Aucune main trouvée dans ce fichier.');
      const existingMap = new Map(loadAllHands().map(h => [h.id, h]));
      let added = 0, replaced = 0;
      for (const hand of incoming) {
        if (!hand.id || !hand.date) continue;
        existingMap.has(hand.id) ? replaced++ : added++;
        existingMap.set(hand.id, hand);
      }
      saveAllHands([...existingMap.values()]);
      closeModal();
      showModal(`
        <div class="modal-title">Import terminé</div>
        <div class="modal-subtitle">${added} main(s) ajoutée(s)${replaced ? ', ' + replaced + ' remplacée(s)' : ''}.</div>
        <div class="modal-actions"><button class="btn btn-primary" id="imp-ok">OK</button></div>`, {
        onMount: () => { $('imp-ok').addEventListener('click', () => { closeModal(); showHistoryModal(); }); }
      });
    } catch (err) {
      closeModal();
      showModal(`
        <div class="modal-title">Erreur d'import</div>
        <div class="modal-subtitle">${err.message}</div>
        <div class="modal-actions"><button class="btn btn-secondary" id="imp-err-ok">Retour</button></div>`, {
        onMount: () => { $('imp-err-ok').addEventListener('click', () => { closeModal(); showHistoryModal(); }); }
      });
    }
  };
  reader.readAsText(file);
}
