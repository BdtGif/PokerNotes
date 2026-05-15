/* history.js — Modal historique, export/import JSON */

import { $, fmtChips, cardLabel, showToast } from './utils.js';
import { state } from './state.js';
import {
  loadAllHands, saveAllHands, deleteHand,
  loadPseudo, savePseudo,
  loadTourneyName, saveTourneyName,
  loadTourneyDate, saveTourneyDate
} from './storage.js';
import { showModal, closeModal } from './ui.js';
import { analyzeHandPreflop, analyzePostflopAction, analyzeMultibarrelLine, classifyFlop, normalizeHand, computeOptimalMove } from './ranges.js';

function fmtHistAmt(n, bb) {
  if (state.stackUnit === 'bb' && bb) return (n / bb).toFixed(1) + ' bb';
  return fmtChips(n);
}

/** @param {Object} hand @returns {string} */
export function handResultSummary(hand) {
  if (!hand.winners || hand.winners.length === 0) return 'Main incomplète';

  const heroPlayer = hand.heroIdx !== null && hand.heroIdx !== undefined ? hand.players?.[hand.heroIdx] : null;

  if (hand.winners.length > 1) {
    const winnerNames = hand.winners.map(w => {
      return heroPlayer && heroPlayer.pos === w.pos ? `Hero (${w.pos})` : w.pos;
    });
    return 'Égalité : ' + winnerNames.join(' / ');
  }

  const w = hand.winners[0];
  const wp = (hand.players || []).find(p => p.pos === w.pos);

  // Affiche "Hero (position)" si le gagnant est Hero, sinon juste la position
  const displayName = heroPlayer && heroPlayer.pos === w.pos ? `Hero (${w.pos})` : w.pos;

  const label = wp && wp.handValueLabel ? ' — ' + wp.handValueLabel : '';
  return displayName + ' wins' + label + ' (' + fmtHistAmt(w.share, hand.bb) + ')';
}

/** @param {string} card @returns {string} */
export function histCardHtml(card) {
  const l = cardLabel(card);
  return `<div class="history-card ${l.cssClass}">${l.rank}</div>`;
}

function _fmtAction(a, bb, potBeforeAction, unit = 'chips', hand) {
  const pctPot = potBeforeAction > 0 ? Math.round((a.amount / potBeforeAction) * 100) : 0;
  const amt = unit === 'bb' ? (a.amount / bb).toFixed(1) + ' bb' : fmtChips(Math.round(a.amount));
  // Déterminer si c'est le héros
  const heroPlayer = (hand && hand.players || []).find(p => p.inHand && p.cards && p.cards.length === 2);
  const displayPos = heroPlayer && heroPlayer.pos === a.pos ? `Hero (${a.pos})` : a.pos;
  switch (a.action) {
    case 'fold':  return `<span class="hs-fold">${displayPos} fold</span>`;
    case 'check': return `${displayPos} chk`;
    case 'call':  return `${displayPos} call ${amt}`;
    case 'raise': return `${displayPos} raise ${amt} (${pctPot}%)`;
    case 'allin': return `${displayPos} shove ${amt} (${pctPot}%)`;
    default:      return `${displayPos} ${a.action}`;
  }
}

function _handStreetsHtml(hand, unit = 'chips') {
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
    if (hasActions) {
      let potBefore = key === 'preflop' ? 0 : hand.streets[defs[defs.findIndex(d => d.key === key) - 1]?.key]?.potEnd || 0;
      const actionsHtml = st.actions.map(a => {
        const html = _fmtAction(a, hand.bb, potBefore, unit, hand);
        potBefore += a.amount || 0;
        return html;
      }).join(' · ');
      row += `<span class="hs-actions">${actionsHtml}</span>`;
      const potDisplay = unit === 'bb' ? (st.potEnd / hand.bb).toFixed(1) + ' bb' : fmtChips(Math.round(st.potEnd));
      row += ` <span class="hs-pot-end" style="font-weight:600;color:#fbbf24;">pot ${potDisplay}</span>`;
    }
    row += `</div>`;
    parts.push(row);
  }
  return parts.length ? `<div class="hs-streets">${parts.join('')}</div>` : '';
}

function _actionLabel(action) {
  return { raise:'Open raise', allin:'All-in', call:'Call', fold:'Fold', check:'Check' }[action] || action || '—';
}

function _preflopAnalysisHtml(hand) {
  const hero = hand.heroIdx != null ? hand.players?.[hand.heroIdx] : null;
  const posLabel = p => p === 'BU' ? 'BTN' : (p || '—');

  if (!hero) {
    return `<button class="ha-btn" data-analyse-id="${hand.id}">
      <span class="ha-label">Solver</span>
      <span class="ha-chevron">›</span>
    </button>`;
  }

  const hasCards = hero.cards && hero.cards.length >= 2 && hero.cards[0] && hero.cards[1];
  const pos = posLabel(hero.pos);

  if (!hasCards) {
    return `<button class="ha-btn" data-analyse-id="${hand.id}">
      <span class="ha-label">Solver</span>
      <span class="ha-chevron">›</span>
    </button>`;
  }

  const handStr = normalizeHand(hero.cards[0], hero.cards[1]);
  const a = analyzeHandPreflop(hand);

  if (!a || !a.result) {
    return `<button class="ha-btn" data-analyse-id="${hand.id}">
      <span class="ha-label">Solver</span>
      <span class="ha-chevron">›</span>
    </button>`;
  }

  const okCls = a.result.ok === true ? 'ha-ok' : a.result.ok === false ? 'ha-bad' : 'ha-warn';
  return `<button class="ha-btn" data-analyse-id="${hand.id}">
    <span class="ha-label">Solver</span>
    <span class="ha-chevron">›</span>
  </button>`;
}

function _showAnalysisModal(hand) {
  const hero       = hand.heroIdx != null ? hand.players?.[hand.heroIdx] : null;
  const fmtPos     = p => p === 'BU' ? 'BTN' : (p || '—');
  const pos        = hero ? fmtPos(hero.pos) : '—';
  const hasCards   = hero?.cards?.length >= 2 && hero.cards[0] && hero.cards[1];
  const handStr    = hasCards ? normalizeHand(hero.cards[0], hero.cards[1]) : null;
  const heroCardsHtml = hasCards ? hero.cards.map(histCardHtml).join('') : '';

  const streetDefs = [
    { key: 'preflop', label: 'Préflop' },
    { key: 'flop',    label: 'Flop' },
    { key: 'turn',    label: 'Turn' },
    { key: 'river',   label: 'River' },
  ];

  let streetBlocks = '';
  let prevKey = null;
  let flopCards = null; // conservé pour passer aux analyses turn/river

  for (const { key, label } of streetDefs) {
    const st = hand.streets?.[key];
    const heroAct = st?.actions?.length ? st.actions.find(a => a.pos === hero?.pos) : null;

    if (heroAct) {
      const amt       = heroAct.amount ? ` — ${fmtHistAmt(heroAct.amount, hand.bb)}` : '';
      const actionLbl = `${_actionLabel(heroAct.action)}${amt}`;
      const boardCards = st.cards?.map(histCardHtml).join('') || '';

      let infoRows    = '';
      let conseilText = '';
      let conseilCls  = 'ana-conseil--warn';
      let sectionCls  = 'ana-section--warn';
      let headerBadge = '';

      if (key === 'preflop') {
        const a = analyzeHandPreflop(hand);
        if (a?.result) {
          const okCls = a.result.ok === true ? 'ha-ok' : a.result.ok === false ? 'ha-bad' : 'ha-warn';
          const scenarioTxt = a.result.scenario || '';
          infoRows = `
            ${scenarioTxt ? `<div class="ana-row"><span class="ana-action-lbl">Contexte</span><span class="ana-action-val ana-context">${scenarioTxt}</span></div>` : ''}
            <div class="ana-row"><span class="ana-action-lbl">Action</span><span class="ana-action-val">${actionLbl}</span></div>
            <div class="ana-row"><span class="ana-action-lbl">Verdict</span><span class="ha-verdict ${okCls}">${a.result.note}</span></div>`;
          if (a.result.conseil) {
            conseilText = a.result.conseil;
            conseilCls  = a.result.ok === true ? 'ana-conseil--ok' : a.result.ok === false ? 'ana-conseil--bad' : 'ana-conseil--warn';
            sectionCls  = a.result.ok === true ? 'ana-section--ok' : a.result.ok === false ? 'ana-section--bad' : 'ana-section--warn';
          }
        } else {
          const msg = !hero ? 'Hero non défini' : !hasCards ? 'Cartes non renseignées' : 'Aucune analyse PF disponible';
          infoRows = `<div class="ana-row"><span class="ana-action-lbl">Action</span><span class="ana-action-val">${actionLbl}</span></div>
                      <div class="ana-row"><span class="ha-verdict ha-warn">${msg}</span></div>`;
        }
      } else {
        // Postflop : calcul du pot juste avant l'action Hero
        let potBefore = hand.streets?.[prevKey]?.potEnd || 0;
        for (const act of st.actions) {
          if (act === heroAct) break;
          potBefore += act.amount || 0;
        }
        if (key === 'flop') flopCards = st.cards;
        // Pour turn et river, on passe les cartes du flop pour classifier la texture
        const texCards = key === 'flop' ? st.cards : (flopCards || st.cards);
        const analysis = analyzePostflopAction(key, heroAct, potBefore, st.actions, texCards);

        // Badge de classification (flop uniquement, dans le header de section)
        if (key === 'flop' && st.cards?.length >= 3) {
          const flop = analysis?.boardInfo || classifyFlop(st.cards);
          if (flop) {
            const badgeCls = flop.category === 'extra-dry' ? 'ana-board-badge--dry'
                           : flop.category === 'drawy'     ? 'ana-board-badge--drawy'
                           :                                 'ana-board-badge--mid';
            headerBadge = `<span class="ana-board-badge ${badgeCls}">${flop.label}</span>`;
          }
        }

        infoRows = `<div class="ana-row"><span class="ana-action-lbl">Action</span><span class="ana-action-val">${actionLbl}</span></div>
                    ${analysis ? `<div class="ana-row"><span class="ana-action-lbl">Sizing</span><span class="ha-verdict ha-warn">${analysis.verdict}</span></div>` : ''}`;
        if (analysis?.conseil) conseilText = analysis.conseil;
      }

      const conseilBlock = conseilText
        ? `<div class="ana-conseil ${conseilCls}"><div class="ana-block-title">Conseil</div><p class="ana-conseil-text">${conseilText}</p></div>`
        : '';

      const optMove = computeOptimalMove(hand, key);
      const optBlock = optMove ? `
        <div class="ana-optimal">
          <button class="ana-optimal-toggle">
            <span class="ana-optimal-icon">⚡</span>
            <span class="ana-optimal-tag">Move optimal</span>
            <span class="ana-optimal-action ana-optimal-action--${optMove.actionType}">${optMove.label}</span>
            <span class="ana-optimal-chevron">›</span>
          </button>
          <div class="ana-optimal-body" hidden>${optMove.detail}</div>
        </div>` : '';

      streetBlocks += `
        <div class="ana-section ${sectionCls}">
          <div class="ana-section-header">
            <span class="ana-section-label">${label}</span>
            ${boardCards ? `<div class="ana-section-cards">${boardCards}</div>` : ''}
            ${headerBadge}
          </div>
          <div class="ana-section-body">
            <div class="ana-block">${infoRows}</div>
            ${conseilBlock}
            ${optBlock}
          </div>
        </div>`;
    }

    prevKey = key;
  }

  if (!streetBlocks) {
    const msg = !hero ? 'Hero non défini.' : !hasCards ? 'Cartes Hero non renseignées.' : 'Aucune action Hero enregistrée.';
    streetBlocks = `<div class="ana-section"><div class="ana-section-body"><div class="ana-block"><div class="ana-row"><span class="ha-verdict ha-warn">${msg}</span></div></div></div></div>`;
  }

  // Section Ligne de jeu (multibarrel)
  const mbLine = analyzeMultibarrelLine(hand);
  const lineSection = mbLine ? `
    <div class="ana-section ana-section--warn ana-section--line">
      <div class="ana-section-header">
        <span class="ana-section-label">Ligne de jeu</span>
        <span class="ana-line-pattern">${mbLine.pattern.split('').join(' › ')}</span>
      </div>
      <div class="ana-section-body">
        <div class="ana-conseil" style="border-left:none;background:transparent;padding:10px 12px;">
          <div class="ana-block-title">${mbLine.verdict}</div>
          <p class="ana-conseil-text">${mbLine.conseil}</p>
        </div>
      </div>
    </div>` : '';

  const html = `
    <div class="modal-title">Analyse de main</div>
    <div class="ana-header">
      <div class="ana-cards">${heroCardsHtml || '<span class="ha-warn" style="font-size:12px">Pas de cartes</span>'}</div>
      <div class="ana-header-meta">
        ${handStr ? `<span class="ana-handstr">${handStr}</span>` : ''}
        <span class="ha-pos">${pos}</span>
      </div>
    </div>
    ${streetBlocks}
    ${lineSection}
    <div class="modal-actions">
      <button class="btn btn-secondary" id="ana-close">Retour</button>
    </div>`;

  showModal(html, {
    id: 'modal-analysis',
    onMount: () => {
      $('ana-close').addEventListener('click', () => { closeModal(); showHistoryModal(); });

      document.querySelectorAll('#modal-analysis .ana-optimal-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          const body = btn.nextElementSibling;
          const chevron = btn.querySelector('.ana-optimal-chevron');
          if (body.hidden) {
            body.hidden = false;
            chevron.classList.add('open');
          } else {
            body.hidden = true;
            chevron.classList.remove('open');
          }
        });
      });
    }
  });
}

function _formatTourneyDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function showHistoryModal(filters = {}) {
  const allHands = loadAllHands().slice().reverse();
  const totalCount = allHands.length;
  const pseudo = loadPseudo();
  const tourneyName = loadTourneyName();
  const tourneyDate = loadTourneyDate();

  const uniquePseudos = [...new Set(allHands.map(h => h.pseudo).filter(Boolean))].sort();
  const uniqueTourneys = [...new Set(allHands.map(h => h.tourneyName).filter(Boolean))].sort();

  const fPseudo = filters.pseudo || '';
  const fTourney = filters.tourney || '';
  const hands = allHands.filter(h =>
    (!fPseudo  || h.pseudo === fPseudo) &&
    (!fTourney || h.tourneyName === fTourney)
  );
  const count = hands.length;
  const filtersActive = fPseudo || fTourney;

 const listHtml = count === 0
    ? (filtersActive
        ? '<div class="history-empty">No hands match the filters.</div>'
        : '<div class="history-empty">Aucune main sauvegardée.<br>Jouez une main pour commencer.</div>')
    : hands.map(hand => {
        const d = new Date(hand.date);
        const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const inHandCount = (hand.players || []).filter(p => p.inHand).length;
        const anteTag = hand.anteEnabled
          ? (hand.bbAnteMode ? ' · BB/Ante' : ` · Ante ${hand.ante}`) : '';
        const summary = handResultSummary(hand);

        // Déclare heroPlayer ET heroResult au début
       const heroPlayer = hand.heroIdx !== null && hand.heroIdx !== undefined ? hand.players?.[hand.heroIdx] : null;
        const heroResult = heroPlayer ? heroPlayer.result : null;

        // Détermine la couleur en fonction du résultat de Hero
        const outcomeClass = !hand.winners || hand.winners.length === 0
  ? 'history-item--incomplete'
  : heroResult === 'win' ? 'history-item--win'
  : heroResult === 'tie' ? 'history-item--tie'
  : heroResult === 'lose' ? 'history-item--lose'
  : 'history-item--incomplete';

        const heroHtml = heroPlayer ? heroPlayer.cards.map(histCardHtml).join('') : '';
        const boardHtml = (hand.board || []).map(histCardHtml).join('');
        const cardsRow = heroHtml || boardHtml ? `
          <div class="history-cards-row">
            ${heroHtml ? `<div class="history-card-group">${heroHtml}</div>` : ''}
            ${boardHtml ? `<div class="history-card-group history-board-group">${boardHtml}</div>` : ''}
          </div>` : '';

        const analysisHtml = _preflopAnalysisHtml(hand);
        return `<div class="history-item ${outcomeClass}">
  <div class="history-item-header">
    <div class="history-meta">
      <span class="history-blinds">${hand.sb}/${hand.bb}${anteTag} · ${inHandCount} Players</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <div class="history-unit-toggle" data-hand-id="${hand.id}">
        <button class="history-unit-btn chips-btn active" data-unit="chips">Tks</button>
        <button class="history-unit-btn bb-btn" data-unit="bb">BB</button>
      </div>
    </div>
  </div>
  <div class="history-summary">${summary}</div>
  <div class="history-hand-content" data-hand-id="${hand.id}">
    ${_handStreetsHtml(hand, 'chips')}
  </div>
  <div id="solver-button">
    ${cardsRow}
    <div class="history-tags">
      ${hand.pseudo ? `<span class="history-pseudo-tag">${hand.pseudo}</span>` : ''}
      ${hand.tourneyName ? `<span class="history-tourney-tag">${hand.tourneyName}</span>` : ''}
      ${hand.tourneyDate ? `<span class="history-date-tag">${_formatTourneyDate(hand.tourneyDate)}</span>` : ''}
    </div>
  </div>
</div>`;
      }).join('');

  const titleCount = filtersActive ? `${count}/${totalCount}` : `${totalCount}`;
  const filtersHtml = (uniquePseudos.length || uniqueTourneys.length) ? `
    <div class="history-filters">
      <select class="history-filter-select" id="hist-filter-pseudo">
        <option value="">Pseudo: all</option>
        ${uniquePseudos.map(p => `<option value="${p}"${p === fPseudo ? ' selected' : ''}>${p}</option>`).join('')}
      </select>
      <select class="history-filter-select" id="hist-filter-tourney">
        <option value="">Tournament: all</option>
        ${uniqueTourneys.map(t => `<option value="${t}"${t === fTourney ? ' selected' : ''}>${t}</option>`).join('')}
      </select>
      ${filtersActive ? '<button class="history-filter-clear" id="hist-filter-clear" title="Reset">✕</button>' : ''}
    </div>` : '';

  const html = `
    <div class="modal-title">Historique (${titleCount})</div>
    <button class="history-row" id="hist-pseudo-edit">
      <span class="history-row-cell">
        <span class="history-row-label">Pseudo</span>
        <span class="history-row-value">${pseudo || '<span class="history-row-empty">Not set</span>'}</span>
      </span>
      <span class="history-row-cell">
        <span class="history-row-label">Tournament</span>
        <span class="history-row-value">${tourneyName || '<span class="history-row-empty">—</span>'}</span>
      </span>
      <span class="history-row-cell">
        <span class="history-row-label">Date</span>
        <span class="history-row-value">${tourneyDate ? _formatTourneyDate(tourneyDate) : '<span class="history-row-empty">—</span>'}</span>
      </span>
      <span class="history-row-icon">✎</span>
    </button>
    <div class="history-toolbar">
      <button class="btn btn-secondary hist-btn${!pseudo && count > 0 ? ' hist-btn--blocked' : ''}" id="hist-export"${count === 0 ? ' disabled' : ''}>↓ Exporter</button>
      <label class="btn btn-secondary hist-btn history-import-label">
        ↑ Importer
        <input type="file" id="hist-import-input" accept=".json,application/json" style="display:none">
      </label>
    </div>
    ${filtersHtml}
    <div class="history-list">${listHtml}</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="hist-close">Close</button>
      ${count > 0 ? '<button class="btn" style="background:#4b1c1c;color:#fca5a5;border:1px solid #7f1d1d;flex:0.7;" id="hist-clear">Clear</button>' : ''}
    </div>`;

  showModal(html, { id: 'modal-history',
  onMount: () => {
    $('hist-close').addEventListener('click', closeModal);

    const fPseudoSel = $('hist-filter-pseudo');
    const fTourneySel = $('hist-filter-tourney');
    if (fPseudoSel) fPseudoSel.addEventListener('change', () => {
      showHistoryModal({ pseudo: fPseudoSel.value, tourney: fTourneySel.value });
    });
    if (fTourneySel) fTourneySel.addEventListener('change', () => {
      showHistoryModal({ pseudo: fPseudoSel.value, tourney: fTourneySel.value });
    });
    const clrFilterBtn = $('hist-filter-clear');
    if (clrFilterBtn) clrFilterBtn.addEventListener('click', () => showHistoryModal());

    $('hist-pseudo-edit').addEventListener('click', () => {
      const curPseudo = loadPseudo();
      const curName = loadTourneyName();
      const curDate = loadTourneyDate();
      showModal(`
        <div class="modal-title">Session</div>
        <div class="modal-subtitle">Pseudo, tournament and date associated with saved hands.</div>
        <label class="history-field-label" for="pseudo-input">Pseudo</label>
        <div class="pseudo-row">
          <div class="pseudo-input-wrap">
            <input class="stack-input" id="pseudo-input" type="text"
              value="${curPseudo}" placeholder="e.g. John" maxlength="24"
              autocomplete="off" autocorrect="off" spellcheck="false">
            <div class="ss-suggest" id="ss-suggest" hidden></div>
          </div>
          <button type="button" class="btn-sharkscope" id="sharkscope-btn"
            title="Voir les statistiques sur SharkScope"${curPseudo ? '' : ' disabled'}>
            SharkScope
          </button>
        </div>
        <div class="tourney-row">
          <div class="tourney-field tourney-field--name">
            <label class="history-field-label" for="tourney-name-input">Tournament name</label>
            <input class="stack-input" id="tourney-name-input" type="text"
              value="${curName}" placeholder="e.g. WSOP Main Event" maxlength="48"
              autocomplete="off" autocorrect="off" spellcheck="false">
          </div>
          <div class="tourney-field tourney-field--date">
            <label class="history-field-label" for="tourney-date-input">Date</label>
            <input class="stack-input" id="tourney-date-input" type="date" value="${curDate}">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="pseudo-cancel">Cancel</button>
          <button class="btn btn-primary" id="pseudo-save">Save</button>
        </div>`, { id: 'modal-pseudo',
        onMount: () => {
          const pseudoInput = $('pseudo-input');
          const nameInput = $('tourney-name-input');
          const dateInput = $('tourney-date-input');
          const sharkBtn = $('sharkscope-btn');
          pseudoInput.focus(); pseudoInput.select();
          const save = () => {
            savePseudo(pseudoInput.value);
            saveTourneyName(nameInput.value);
            saveTourneyDate(dateInput.value);
            closeModal();
            showHistoryModal();
          };
          sharkBtn.addEventListener('click', () => {
            const p = pseudoInput.value.trim();
            if (!p) return;
            savePseudo(p);
            const url = `https://fr.sharkscope.com/#Player-Statistics/networks/*/players/${encodeURIComponent(p)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
          });
          setupSharkscopeAutocomplete(pseudoInput, $('ss-suggest'), sharkBtn);
          $('pseudo-cancel').addEventListener('click', () => { closeModal(); showHistoryModal(); });
          $('pseudo-save').addEventListener('click', save);
          [pseudoInput, nameInput].forEach(inp => {
            inp.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
          });
        }
      });
    });

    const expBtn = $('hist-export');
    if (expBtn) expBtn.addEventListener('click', () => {
      if (!loadPseudo()) {
        showToast('Définis ton pseudo pour exporter', 2500);
        const pseudoRow = $('hist-pseudo-edit');
        pseudoRow.classList.add('history-row--pulse');
        setTimeout(() => pseudoRow.classList.remove('history-row--pulse'), 800);
      } else {
        exportHistory();
      }
    });

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
          <button class="btn btn-secondary" id="clr-cancel">Cancel</button>
          <button class="btn" style="background:#b91c1c;color:white;" id="clr-confirm">Clear all</button>
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

    document.querySelectorAll('.ha-btn').forEach(btn => {
      const hand = hands.find(h => h.id === btn.dataset.analyseId);
      if (hand) btn.addEventListener('click', () => _showAnalysisModal(hand));
    });

    // Event listeners pour les toggles d'unit par main
    document.querySelectorAll('.history-unit-toggle').forEach(toggle => {
      const handId = toggle.dataset.handId;
      const chipsBtn = toggle.querySelector('.chips-btn');
      const bbBtn = toggle.querySelector('.bb-btn');
      const contentDiv = document.querySelector(`[data-hand-id="${handId}"].history-hand-content`);
      const hand = hands.find(h => h.id === handId);

      if (!hand) return;

      chipsBtn.addEventListener('click', () => {
        chipsBtn.classList.add('active');
        bbBtn.classList.remove('active');
        contentDiv.innerHTML = _handStreetsHtml(hand, 'chips');
      });

      bbBtn.addEventListener('click', () => {
        bbBtn.classList.add('active');
        chipsBtn.classList.remove('active');
        contentDiv.innerHTML = _handStreetsHtml(hand, 'bb');
      });
    });
  }
});
}

export function exportHistory() {
  const hands = loadAllHands();
  if (hands.length === 0) return;
  const dateStr = new Date().toISOString().split('T')[0];
  const pseudo = loadPseudo();
  const filename = pseudo ? `${pseudo}_${dateStr}.json` : `poker_hands_${dateStr}.json`;
  const tourneyName = loadTourneyName();
  const tourneyDate = loadTourneyDate();
  const payload = JSON.stringify({ version: '10.2', exportDate: new Date().toISOString(), pseudo, tourneyName, tourneyDate, hands }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
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
      const filePseudo = !Array.isArray(parsed) ? (parsed.pseudo || '') : '';
      const fileTourneyName = !Array.isArray(parsed) ? (parsed.tourneyName || '') : '';
      const fileTourneyDate = !Array.isArray(parsed) ? (parsed.tourneyDate || '') : '';
      if (!Array.isArray(incoming) || incoming.length === 0)
        throw new Error('Aucune main trouvée dans ce fichier.');
      const existingMap = new Map(loadAllHands().map(h => [h.id, h]));
      let added = 0, replaced = 0;
      for (const hand of incoming) {
        if (!hand.id || !hand.date) continue;
        if (!hand.pseudo && filePseudo) hand.pseudo = filePseudo;
        if (!hand.tourneyName && fileTourneyName) hand.tourneyName = fileTourneyName;
        if (!hand.tourneyDate && fileTourneyDate) hand.tourneyDate = fileTourneyDate;
        existingMap.has(hand.id) ? replaced++ : added++;
        existingMap.set(hand.id, hand);
      }
      saveAllHands([...existingMap.values()]);
      closeModal();
      showModal(`
        <div class="modal-title">Import completed</div>
        <div class="modal-subtitle">${added} hand(s) added${replaced ? ', ' + replaced + ' replaced' : ''}.</div>
        <div class="modal-actions"><button class="btn btn-primary" id="imp-ok">OK</button></div>`, {
        onMount: () => { $('imp-ok').addEventListener('click', () => { closeModal(); showHistoryModal(); }); }
      });
    } catch (err) {
      closeModal();
      showModal(`
        <div class="modal-title">Erreur d'import</div>
        <div class="modal-subtitle">${err.message}</div>
        <div class="modal-actions"><button class="btn btn-secondary" id="imp-err-ok">Back</button></div>`, {
        onMount: () => { $('imp-err-ok').addEventListener('click', () => { closeModal(); showHistoryModal(); }); }
      });
    }
  };
  reader.readAsText(file);
}

export function showTourneyPickerModal(field, onPick) {
  if (field === 'date') {
    const current = loadTourneyDate();
    showModal(`
      <div class="modal-title">Choose a date</div>
      <div class="modal-subtitle">Date to associate with the session.</div>
      <label class="history-field-label" for="pick-date-input">Date</label>
      <input class="stack-input" id="pick-date-input" type="date" value="${current}">
      <div class="modal-actions">
        <button class="btn btn-secondary" id="pick-close">Cancel</button>
        <button class="btn btn-primary" id="pick-save">OK</button>
      </div>`, {
      id: 'modal-tourney-picker',
      onMount: () => {
        const input = $('pick-date-input');
        input.focus();
        const commit = () => {
          const v = input.value.trim();
          if (!v) { showToast('Date required', 2000); return; }
          saveTourneyDate(v);
          closeModal();
          if (onPick) onPick();
        };
        $('pick-close').addEventListener('click', closeModal);
        $('pick-save').addEventListener('click', commit);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') commit(); });
      }
    });
    return;
  }

  const hands = loadAllHands();
  const values = [...new Set(hands.map(h => h.tourneyName).filter(Boolean))].sort();

  if (values.length === 0) {
    showModal(`
      <div class="modal-title">Choose a tournament</div>
      <div class="modal-subtitle">No tournament recorded in history.</div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="pick-close">Close</button>
      </div>`, {
      id: 'modal-tourney-picker',
      onMount: () => $('pick-close').addEventListener('click', closeModal)
    });
    return;
  }

  const current = loadTourneyName();
  const itemsHtml = values.map((v, i) => {
    const active = v === current;
    return `<button class="tourney-pick-item${active ? ' is-active' : ''}" data-idx="${i}">
      <span class="history-tourney-tag">${v}</span>
    </button>`;
  }).join('');

  showModal(`
    <div class="modal-title">Choose a tournament</div>
    <div class="modal-subtitle">Select the tournament name to associate with the session.</div>
    <div class="tourney-pick-list">${itemsHtml}</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="pick-close">Close</button>
    </div>`, {
    id: 'modal-tourney-picker',
    onMount: () => {
      $('pick-close').addEventListener('click', closeModal);
      document.querySelectorAll('.tourney-pick-item').forEach(btn => {
        btn.addEventListener('click', () => {
          saveTourneyName(values[+btn.dataset.idx]);
          closeModal();
          if (onPick) onPick();
        });
      });
    }
  });
}

export function showTourneyConfirmModal(onConfirm, onCancel, opts = {}) {
  const curPseudo = loadPseudo();
  const curName = loadTourneyName();
  const curDate = loadTourneyDate();
  const allSet = !!curPseudo && !!curName && !!curDate;
  const editing = opts.forceEdit || !allSet;

  const body = !editing
    ? `
      <div class="modal-title">Save hand</div>
      <div class="modal-subtitle">Pseudo, tournament and date associated with the hand:</div>
      <div class="history-tags">
        <span class="history-pseudo-tag">${curPseudo}</span>
        <span>Tournament: <span class="history-tourney-tag">${curName}</span></span>
        <span>Date: <span class="history-date-tag">${_formatTourneyDate(curDate)}</span></span>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
        <button class="btn btn-secondary" id="confirm-edit">Edit</button>
        <button class="btn btn-primary" id="confirm-save">OK</button>
      </div>`
    : `
      <div class="modal-title">Save hand</div>
      <div class="modal-subtitle">Pseudo, tournament and date are required to save.</div>
      <label class="history-field-label" for="confirm-pseudo">Pseudo</label>
      <input class="stack-input" id="confirm-pseudo" type="text"
        value="${curPseudo}" placeholder="e.g. John" maxlength="24"
        autocomplete="off" autocorrect="off" spellcheck="false">
      <div class="confirm-row">
        <div class="confirm-field">
          <label class="history-field-label" for="confirm-tourney-name">Tournament name</label>
          <input class="stack-input" id="confirm-tourney-name" type="text"
            value="${curName}" placeholder="e.g. WSOP Main Event" maxlength="48"
            autocomplete="off" autocorrect="off" spellcheck="false">
        </div>
        <div class="confirm-field">
          <label class="history-field-label" for="confirm-tourney-date">Tournament date</label>
          <input class="stack-input" id="confirm-tourney-date" type="date" value="${curDate}">
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
        <button class="btn btn-primary" id="confirm-save">Save</button>
      </div>`;

  showModal(body, {
    id: 'modal-confirm-save',
    onMount: () => {
      const pseudoInput = $('confirm-pseudo');
      const nameInput = $('confirm-tourney-name');
      const dateInput = $('confirm-tourney-date');
      const focusTarget = pseudoInput && !pseudoInput.value ? pseudoInput
        : nameInput && !nameInput.value ? nameInput
        : pseudoInput || nameInput;
      if (focusTarget) { focusTarget.focus(); focusTarget.select?.(); }
      const commit = () => {
        if (pseudoInput && nameInput && dateInput) {
          const pVal = pseudoInput.value.trim();
          const nVal = nameInput.value.trim();
          const dVal = dateInput.value.trim();
          if (!pVal || !nVal || !dVal) {
            showToast('Pseudo, tournament and date are required', 2500);
            const missing = !pVal ? pseudoInput : !nVal ? nameInput : dateInput;
            missing.focus();
            return;
          }
          savePseudo(pVal);
          saveTourneyName(nVal);
          saveTourneyDate(dVal);
        }
        closeModal();
        if (onConfirm) onConfirm();
      };
      $('confirm-cancel').addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
      });
      $('confirm-save').addEventListener('click', commit);
      const editBtn = $('confirm-edit');
      if (editBtn) editBtn.addEventListener('click', () => {
        closeModal();
        showTourneyConfirmModal(onConfirm, onCancel, { forceEdit: true });
      });
      [pseudoInput, nameInput, dateInput].forEach(inp => {
        if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') commit(); });
      });
    }
  });
}

/**
 * Autocomplete pseudo via SharkScope suggestions endpoint (proxifié CORS).
 * Endpoint réel : /poker-statistics/networks/* /players/<term>/suggestions?limit=25
 * Réponse XML : <Response><SearchSuggestionsResponse><PlayerSuggestions>
 *   <Player name="..." network="..." country="..." countryName="..."/>...
 */
function setupSharkscopeAutocomplete(input, dropdown, sharkBtn) {
  // Proxies CORS testés (allorigins.win était en panne, corsproxy.io est passé en payant).
  // corsmirror.com fonctionne et a ACAO: *. Si plusieurs sont fournis, on essaie dans l'ordre.
  const PROXIES = [
    'https://corsmirror.com/v1?url=',
    'https://api.allorigins.win/raw?url='
  ];
  const MIN_LEN = 3;
  const DEBOUNCE = 300;
  let timer = null;
  let controller = null;
  let activeIdx = -1;
  let items = [];

  const syncBtn = () => { sharkBtn.disabled = !input.value.trim(); };
  syncBtn();

  const hide = () => {
    dropdown.hidden = true;
    dropdown.innerHTML = '';
    activeIdx = -1;
    items = [];
  };

  const render = (players) => {
    items = players;
    if (!players.length) { hide(); return; }
    dropdown.innerHTML = players.map((p, i) => `
      <div class="ss-suggest-item" data-i="${i}">
        <span class="ss-suggest-name">${escapeHtml(p.name)}</span>
        <span class="ss-suggest-net">${escapeHtml(p.network || '')}${p.country ? ' · ' + escapeHtml(p.country) : ''}</span>
      </div>
    `).join('');
    dropdown.hidden = false;
    activeIdx = -1;
    dropdown.querySelectorAll('.ss-suggest-item').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        const i = parseInt(el.dataset.i, 10);
        input.value = items[i].name;
        syncBtn();
        hide();
        input.focus();
      });
    });
  };

  const setActive = (i) => {
    const els = dropdown.querySelectorAll('.ss-suggest-item');
    els.forEach(el => el.classList.remove('ss-suggest-active'));
    if (i >= 0 && i < els.length) {
      els[i].classList.add('ss-suggest-active');
      activeIdx = i;
    }
  };

  const fetchSuggestions = async (term) => {
    if (controller) controller.abort();
    controller = new AbortController();
    const ssUrl = `https://fr.sharkscope.com/poker-statistics/networks/*/players/${encodeURIComponent(term)}/suggestions?limit=15`;
    for (const proxy of PROXIES) {
      try {
        const resp = await fetch(proxy + encodeURIComponent(ssUrl), { signal: controller.signal });
        if (!resp.ok) continue;
        const text = await resp.text();
        const doc = new DOMParser().parseFromString(text, 'text/xml');
        if (doc.querySelector('parsererror')) continue;
        const players = Array.from(doc.querySelectorAll('PlayerSuggestions > Player')).map(el => ({
          name: el.getAttribute('name'),
          network: el.getAttribute('network'),
          country: el.getAttribute('country')
        })).filter(p => p.name);
        if (input.value.trim() === term) render(players);
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    hide();
  };

  input.addEventListener('input', () => {
    syncBtn();
    const term = input.value.trim();
    clearTimeout(timer);
    if (term.length < MIN_LEN) { hide(); return; }
    timer = setTimeout(() => fetchSuggestions(term), DEBOUNCE);
  });

  input.addEventListener('keydown', e => {
    if (dropdown.hidden || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((activeIdx + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((activeIdx - 1 + items.length) % items.length); }
    else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault(); e.stopPropagation();
      input.value = items[activeIdx].name;
      syncBtn();
      hide();
    } else if (e.key === 'Escape') { hide(); }
  });

  input.addEventListener('blur', () => setTimeout(hide, 150));
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
