/* ui.js — Rendu DOM, modales et interactions joueurs
 *
 * NOTE dépendance circulaire : ui.js ↔ hand.js (voir hand.js pour explication).
 * Les imports de hand.js sont utilisés uniquement dans les corps de fonctions.
 */

import { state, SUITS, RANKS } from './state.js';
import { $, fmtChips, fmtStack, fmtAmount, cardLabel, cardInnerHtml, isCardUsed, getActivePlayers, getEffectiveAnte } from './utils.js';
import { postBlindsForPreview } from './player.js';
import { loadPseudo } from './storage.js';
// Imports circulaires — safe à runtime (voir note ci-dessus)
import { doAction, goBackOneAction, buildActionQueue, finishHand } from './hand.js';

/* ================================================================
   HELPERS DE POSITIONNEMENT
   ================================================================ */

/** Calcule les coordonnées écran de chaque siège autour de la table. */
export function getSeatScreenPositions() {
  const tableArea = $('table-area');
  const rect = tableArea.getBoundingClientRect();
  const cx = rect.width / 2, cy = rect.height / 2;
  const rx = Math.min(rect.width * 0.42, 280);
  const ry = Math.min(rect.height * 0.40, 165);
  const n = state.numPlayers;
  const positions = {};
  let anchorAngle, slotForPlayer;
  if (state.heroIdx === null) {
    anchorAngle = Math.PI * 0.35;
    slotForPlayer = (idx) => idx;
  } else {
    anchorAngle = Math.PI / 2;
    slotForPlayer = (idx) => (idx - state.heroIdx + n) % n;
  }
  const step = (Math.PI * 2) / n;
  for (let i = 0; i < n; i++) {
    const slot = slotForPlayer(i);
    const angle = anchorAngle + slot * step;
    positions[i] = { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry, angle };
  }
  return positions;
}

/* ================================================================
   RENDUS
   ================================================================ */

export function renderSeats() {
  const container = $('seats-container');
  container.innerHTML = '';
  const positions = getSeatScreenPositions();
  const tableArea = $('table-area');
  const rect = tableArea.getBoundingClientRect();
  const cx = rect.width / 2, cy = rect.height / 2;
  const actingIdx = (state.betRound && (state.step.endsWith('-bet') || state.step === 'preflop'))
    ? state.betRound.queue[state.betRound.qIndex] : null;
  const pseudo = loadPseudo();

  state.players.forEach((p, i) => {
    const { x, y } = positions[i];
    const seat = document.createElement('div');
    seat.className = 'seat';
    seat.style.left = x + 'px'; seat.style.top = y + 'px';

    if (p.idx === state.heroIdx) seat.classList.add('is-hero');
    if (state.heroIdx !== null && p.inHand && p.idx !== state.heroIdx) seat.classList.add('is-active-in-hand');
    if (state.heroIdx !== null && !p.inHand) seat.classList.add('is-out');
    if (p.folded) seat.classList.add('is-folded');
    if (p.allin)  seat.classList.add('is-allin');
    if (actingIdx === p.idx) seat.classList.add('is-acting');
    if (p.result === 'win')  seat.classList.add('is-winner');
    if (p.result === 'tie')  seat.classList.add('is-tie');
    if (p.result === 'lose') seat.classList.add('is-loser');

    if (p.cards.length > 0) {
      const cardsEl = document.createElement('div');
      cardsEl.className = 'seat-cards';
      p.cards.forEach(c => {
        const lbl = cardLabel(c);
        const mc = document.createElement('div');
        mc.className = 'mini-card ' + lbl.cssClass;
        mc.innerHTML = cardInnerHtml(c);
        cardsEl.appendChild(mc);
      });
      seat.appendChild(cardsEl);
    }

    const posEl = document.createElement('div');
    posEl.className = 'seat-pos';
    if (p.idx === state.heroIdx && pseudo) {
      const label = pseudo.length > 6 ? pseudo.slice(0, 6) : pseudo;
      posEl.textContent = label;
      posEl.style.fontSize = label.length > 3 ? '9px' : '13px';
    } else {
      posEl.textContent = p.pos;
    }
    seat.appendChild(posEl);

    if (p.inHand && p.stackKnown && p.stack !== null) {
      const stackEl = document.createElement('div');
      stackEl.className = 'seat-stack'; stackEl.textContent = fmtStack(p.stack);
      seat.appendChild(stackEl);
    } else if (p.inHand && !p.stackKnown) {
      const stackEl = document.createElement('div');
      stackEl.className = 'seat-stack'; stackEl.textContent = 'N/C';
      seat.appendChild(stackEl);
    }

    if (p.handValueLabel) {
      const hv = document.createElement('div');
      hv.className = 'seat-handvalue'; hv.textContent = p.handValueLabel;
      seat.appendChild(hv);
    }

    container.appendChild(seat);

    // Chip de mise
    let chipLabel = null;
    if (state.step === 'setup' && p.postedBlind) {
      chipLabel = fmtAmount(p.currentBet);
    } else if (p.currentBet > 0 && (state.step.endsWith('-bet') || state.step === 'preflop')) {
      chipLabel = fmtAmount(p.currentBet);
    }
    if (chipLabel) {
      const chip = document.createElement('div');
      chip.className = 'seat-bet-chip';
      if (p.postedBlind) chip.classList.add('is-blind');
      const dx = cx - x, dy = cy - y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const offset = 70;
      chip.style.left = (x + (dx / dist) * offset) + 'px';
      chip.style.top  = (y + (dy / dist) * offset) + 'px';
      chip.style.position = 'absolute';
      chip.textContent = chipLabel;
      container.appendChild(chip);
    }

    // Bouton dealer
    if (p.pos === 'BU') {
      const db = document.createElement('div');
      db.className = 'dealer-btn';
      const dx = cx - x, dy = cy - y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const ux = dx / dist, uy = dy / dist;
      const lx = uy, ly = -ux;
      db.style.left = (x + ux * 56 + lx * 36) + 'px';
      db.style.top  = (y + uy * 56 + ly * 36) + 'px';
      db.textContent = 'D';
      container.appendChild(db);
    }

    seat.addEventListener('click', () => onSeatClick(p.idx));
  });
}

export function renderBoard() {
  const board = $('board');
  if (state.step === 'setup' || state.step === 'preflop') { board.style.display = 'none'; return; }
  board.style.display = 'flex'; board.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const c = state.board[i];
    const div = document.createElement('div');
    if (c) {
      const lbl = cardLabel(c);
      div.className = 'board-card ' + lbl.cssClass;
      div.innerHTML = cardInnerHtml(c);
    } else { div.className = 'board-card empty'; }
    board.appendChild(div);
  }
}

export function renderPot() {
  const pd = $('pot-display'), wd = $('winner-display'), ad = $('ante-display');
  if (state.step === 'result' && state.winners.length > 0) {
    wd.style.display = 'block';
    wd.classList.toggle('tie', state.winners.length > 1);
    if (state.winners.length === 1) {
      const w = state.winners[0];
      wd.innerHTML = `<strong>${w.pos}</strong> gagne : <strong>${fmtAmount(w.share)}</strong>`;
    } else {
      wd.innerHTML = state.winners.map(w => `<strong>${w.pos}</strong> gagne : <strong>${fmtAmount(w.share)}</strong>`).join('<br>');
    }
  } else { wd.style.display = 'none'; }
  pd.style.display = 'block';
  pd.textContent = 'Pot : ' + fmtAmount(state.pot);
  // Afficher l'ante UNIQUEMENT en préflop et setup
  if (state.anteEnabled && (state.step === 'preflop' || state.step === 'setup')) {
    const ante = getEffectiveAnte();
    if (ante > 0) { ad.style.display = 'block'; ad.textContent = 'Ante : ' + fmtAmount(ante); }
    else { ad.style.display = 'none'; }
  } else { ad.style.display = 'none'; }
}

export function renderStepIndicator() {
  const map = {
    'setup': 'Set up the hand',
    'preflop': 'Preflop',
    'flop-cards': 'Flop — Select 3 cards',
    'flop-bet': 'Flop — Bet',
    'turn-cards': 'Turn — Select 1 card',
    'turn-bet': 'Turn — Bet',
    'river-cards': 'River — Select 1 card',
    'river-bet': 'River — Bet',
    'showdown': 'Showdown — Opponent cards',
    'result': 'Result'
  };
  $('step-indicator').textContent = map[state.step] || '';
}

export function renderBottomBar() {
  const validateBtn = $('validate-setup-btn'), backBtn = $('back-btn');
  if (state.step === 'setup') {
    backBtn.disabled = state.heroIdx === null && state.players.every(p => !p.inHand);
    backBtn.textContent = '← Back';
  } else { backBtn.disabled = false; backBtn.textContent = '← Back'; }

  if (state.step === 'setup') {
    validateBtn.style.display = 'block';
    const inHandCount = state.players.filter(p => p.inHand).length;
    validateBtn.disabled = !(state.heroIdx !== null && inHandCount >= 2);
    validateBtn.textContent = 'Confirm';
  } else if (state.step === 'result') {
    validateBtn.style.display = 'block';
    validateBtn.disabled = false;
    validateBtn.textContent = 'New Hand';
  } else { validateBtn.style.display = 'none'; }

  $('unit-switch').classList.toggle('bb', state.stackUnit === 'bb');
  $('sb-input').value = state.sb;
  $('bb-input').value = state.bb;

  const anteToggle = $('ante-toggle'), bbanteToggle = $('bbante-toggle'), anteInput = $('ante-input');
  anteToggle.classList.toggle('active', state.anteEnabled);
  anteToggle.textContent = state.anteEnabled ? 'ON' : 'OFF';
  bbanteToggle.classList.toggle('active', state.bbAnteMode);
  if (state.anteEnabled) {
    if (state.bbAnteMode) { anteInput.disabled = true; anteInput.value = ''; anteInput.placeholder = '= 1 BB'; }
    else { anteInput.disabled = false; anteInput.value = state.ante || ''; anteInput.placeholder = 'val'; }
  } else { anteInput.disabled = true; anteInput.value = ''; anteInput.placeholder = '—'; }
}

export function renderActionPanel() {
  // Ne pas re-rendre pendant la saisie dans l'input raise/all-in (clavier Android)
  const ae = document.activeElement;
  if (ae && ae.tagName === 'INPUT' && (ae.id === 'ap-raise-input' || ae.id === 'ap-allin-input')) return;

  const root = $('action-panel-root');
  root.innerHTML = '';
  if (!state.betRound) return;
  if (!state.step.endsWith('-bet') && state.step !== 'preflop') return;
  const br = state.betRound;
  if (br.qIndex >= br.queue.length) return;
  const idx = br.queue[br.qIndex];
  const player = state.players[idx];
  if (!player || player.folded || !player.inHand) return;

  const positions = getSeatScreenPositions();
  const pos = positions[idx];
  const tableArea = $('table-area');
  const rect = tableArea.getBoundingClientRect();
  const panel = document.createElement('div');
  panel.className = 'action-panel';

  const toCall = state.currentBet - player.currentBet;
  const canCheck = toCall === 0;
  const heroCardsHtml = player.idx === state.heroIdx
    ? '<div style="display:flex;justify-content:center;gap:3px;margin-top:4px;">' + player.cards.map(c => { const l = cardLabel(c); return `<div class="mini-card ${l.cssClass}">${cardInnerHtml(c)}</div>`; }).join('') + '</div>'
    : '';

  let infoHtml = toCall > 0
    ? `<div class="action-panel-info"><strong>${player.pos}</strong> — To call : <strong>${fmtAmount(toCall)}</strong>${heroCardsHtml}</div>`
    : `<div class="action-panel-info"><strong>${player.pos}</strong> — No bet to call${heroCardsHtml}</div>`;

  const showAllinInput = state.allinShownFor === idx;

  let buttonsHtml = '<div class="action-row-inline three">';
// Affiche Fold s'il y a une mise à suivre (canCheck = false)
// En préflop : uniquement s'il y a une mise à suivre (relance après blinds)
// Postflop : toujours s'il y a une mise à suivre
if (!canCheck) {
  buttonsHtml += `<button class="action-btn-inline action-fold" id="ap-fold">Fold</button>`;
}
if (canCheck) {
  buttonsHtml += `<button class="action-btn-inline action-check" id="ap-check">Check</button>`;
} else {
  let callDisplay = toCall, callIsAllin = false;
  if (player.stackKnown && player.stack !== null && toCall >= player.stack) { callDisplay = player.stack; callIsAllin = true; }
  buttonsHtml += `<button class="action-btn-inline action-call" id="ap-call">${callIsAllin ? 'Call all-in ' + fmtAmount(callDisplay) : 'Call ' + fmtAmount(callDisplay)}</button>`;
}
const minRaise = state.currentBet === 0 ? state.bb : (state.currentBet + (state.betRound?.lastRaiseSize || state.bb));
const minDisplay = state.stackUnit === 'bb' ? (minRaise / state.bb).toFixed(1) + ' bb' : fmtChips(Math.round(minRaise));
buttonsHtml += `<button class="action-btn-inline action-raise" id="ap-raise"><div>${state.currentBet > 0 ? 'Raise' : 'Bet'}</div><div style="font-size:9px;color:var(--color-text-secondary);">min ${minDisplay}</div></button></div>`;  buttonsHtml += `<div class="action-row-inline"><button class="action-btn-inline action-back-inline" id="ap-back">← Back</button><button class="action-btn-inline action-allin" id="ap-allin">All-in</button></div>`;

  let allinInputHtml = '';
  if (showAllinInput) {
    if (player.stackKnown && player.stack !== null) {
      allinInputHtml = `<div class="allin-inline-row"><div style="flex:1;font-size:11px;color:#fecaca;text-align:center;">All-in : ${fmtAmount(player.stack)}</div><button class="raise-confirm" id="ap-allin-ok" style="background:#b91c1c">OK</button></div>`;
    } else {
      allinInputHtml = `<div class="allin-inline-row"><input type="number" inputmode="decimal" class="raise-input-inline" id="ap-allin-input" value="${state.allinInput || ''}" placeholder="Total all-in (BB)" autofocus step="0.5"><div style="font-size:11px;font-weight:700;color:var(--gold);padding:0 4px;">BB</div><button class="raise-confirm" id="ap-allin-ok" style="background:#b91c1c">OK</button></div>`;
    }
  }

  panel.innerHTML = infoHtml + buttonsHtml + allinInputHtml;
  root.appendChild(panel);

  const panelRect = panel.getBoundingClientRect();
  const cosA = Math.cos(pos.angle);
  const seatRadius = 48, margin = 16;
  let px, py;
  if (cosA >= 0) { px = pos.x + seatRadius + margin; py = pos.y - panelRect.height / 2; }
  else { px = pos.x - seatRadius - margin - panelRect.width; py = pos.y - panelRect.height / 2; }
  px = Math.max(8, Math.min(rect.width - panelRect.width - 8, px));
  py = Math.max(8, Math.min(rect.height - panelRect.height - 8, py));
  panel.style.left = px + 'px'; panel.style.top = py + 'px';

  // Event listeners des boutons d'action
  const foldBtn  = $('ap-fold'), checkBtn = $('ap-check'), callBtn = $('ap-call');
  const raiseBtn = $('ap-raise'), allinBtn = $('ap-allin'), backBtn2 = $('ap-back');
  if (foldBtn)  foldBtn.addEventListener('click', () => doAction(player, 'fold'));
  if (checkBtn) checkBtn.addEventListener('click', () => doAction(player, 'check'));
  if (callBtn)  callBtn.addEventListener('click', () => doAction(player, 'call'));
  if (raiseBtn) raiseBtn.addEventListener('click', () => {
    state.allinShownFor = null; state.raiseInput = ''; state.raiseError = null;
    openRaiseModal(player, idx);
  });
  if (allinBtn) allinBtn.addEventListener('click', () => {
    state.allinShownFor = idx; state.raiseShownFor = null; state.allinInput = ''; render();
    if (!player.stackKnown) setTimeout(() => { const i = $('ap-allin-input'); if (i) i.focus(); }, 50);
  });
  if (backBtn2) backBtn2.addEventListener('click', goBackOneAction);

  if (showAllinInput) {
    if (player.stackKnown && player.stack !== null) {
      $('ap-allin-ok').addEventListener('click', () => {
        const totalBet = player.stack + player.currentBet;
        state.allinShownFor = null; doAction(player, 'allin', totalBet);
      });
    } else {
      $('ap-allin-input').addEventListener('input', (e) => { state.allinInput = e.target.value; });
      $('ap-allin-ok').addEventListener('click', () => {
        const v = parseFloat($('ap-allin-input').value);
        if (!v || v <= 0) return;
        state.allinShownFor = null; state.allinInput = '';
        doAction(player, 'allin', v * state.bb);
      });
    }
  }
}

/** Point d'entrée du rendu : met à jour tout le DOM. */
export function render() {
  renderSeats(); renderBoard(); renderPot();
  renderStepIndicator(); renderBottomBar(); renderActionPanel();
}

/* ================================================================
   SYSTÈME DE MODALES
   ================================================================ */

/** @param {string} html @param {{onMount?:Function, id?:string}} [opts] */
export function showModal(html, opts = {}) {
  const root = $('modal-root');
  const idAttr = opts.id ? ` id="${opts.id}"` : '';
  root.innerHTML = `<div class="overlay"><div class="modal"${idAttr}>${html}</div></div>`;
  if (opts.onMount) opts.onMount();
}

export function closeModal() { $('modal-root').innerHTML = ''; }

/* ================================================================
   MODALE RAISE / BET
   ================================================================ */

export function openRaiseModal(player, idx) {
  const isPostflop = state.step.endsWith('-bet') && state.step !== 'preflop';
  const label = state.currentBet > 0 ? 'Raise' : 'Bet';
  const minRaise = state.currentBet === 0 ? state.bb : (state.currentBet + (state.betRound?.lastRaiseSize || state.bb));
  const stackCap = (player.stackKnown && player.stack !== null) ? (player.stack + player.currentBet) : null;

  // Bornes de la jauge (en chips)
  const gaugeMin = Math.round(minRaise);
  const gaugeMax = stackCap
    ? Math.round(stackCap)
    : isPostflop ? Math.round(Math.max(minRaise, state.pot) * 2) : Math.round(state.bb * 10);
  const gaugeStep = Math.max(1, Math.round(state.bb / 10));

  const fmtDisplay = chips => state.stackUnit === 'bb'
    ? `${(chips / state.bb).toFixed(1)} BB`
    : fmtChips(Math.round(chips));

  const initChips = gaugeMin;
  const initVal = state.stackUnit === 'bb' ? (initChips / state.bb).toFixed(1) : Math.round(initChips);

  const html = `
    <div class="modal-title">${label}</div>
    <div class="modal-subtitle">Min : ${fmtAmount(minRaise)}${stackCap ? ' · Max : ' + fmtAmount(stackCap) : ''}</div>
    <div class="raise-gauge-wrap">
      <div class="raise-gauge-val" id="rm-gauge-val">${fmtDisplay(initChips)}</div>
      <input type="range" class="raise-gauge" id="rm-gauge"
        min="${gaugeMin}" max="${gaugeMax}" step="${gaugeStep}" value="${gaugeMin}">
    </div>
    <div class="stack-input-wrap" style="margin:4px 0;">
      <input type="number" inputmode="decimal" class="stack-input" id="rm-input" value="${initVal}" placeholder="Total" autofocus>
      <div class="unit-toggle-mini">
        <button id="rm-unit-bb" class="${state.stackUnit === 'bb' ? 'active' : ''}">BB</button>
        <button id="rm-unit-chips" class="${state.stackUnit === 'chips' ? 'active' : ''}">Tks</button>
      </div>
    </div>
    <div class="raise-error" id="rm-error" style="display:none;margin-top:6px;"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="rm-cancel">Cancel</button>
      <button class="btn btn-primary" id="rm-ok">${label}</button>
    </div>`;

  showModal(html, { id: 'modal-raise',
    onMount: () => {
      const errEl = $('rm-error');
      const gauge = $('rm-gauge');
      const gaugeValEl = $('rm-gauge-val');

      const inputToChips = () => {
        const v = parseFloat($('rm-input').value) || 0;
        return state.stackUnit === 'bb' ? v * state.bb : v;
      };

      const setGaugeFromChips = (chips) => {
        gauge.value = Math.round(chips);
        gaugeValEl.textContent = fmtDisplay(chips);
      };

      const setInputFromChips = (chips) => {
        $('rm-input').value = state.stackUnit === 'bb' ? (chips / state.bb).toFixed(1) : Math.round(chips);
      };

      // Jauge → input
      gauge.addEventListener('input', () => {
        const chips = parseFloat(gauge.value);
        gaugeValEl.textContent = fmtDisplay(chips);
        setInputFromChips(chips);
        errEl.style.display = 'none';
      });

      // Input → jauge
      $('rm-input').addEventListener('input', () => {
        errEl.style.display = 'none';
        const chips = inputToChips();
        setGaugeFromChips(Math.max(gaugeMin, Math.min(gaugeMax, chips)));
      });

      // Unit toggle
      const switchUnit = (newUnit) => {
        if (state.stackUnit === newUnit) return;
        const v = parseFloat($('rm-input').value);
        if (v > 0) $('rm-input').value = newUnit === 'bb' ? +(v / state.bb).toFixed(2) : Math.round(v * state.bb);
        state.stackUnit = newUnit;
        $('rm-unit-bb').classList.toggle('active', newUnit === 'bb');
        $('rm-unit-chips').classList.toggle('active', newUnit === 'chips');
        gaugeValEl.textContent = fmtDisplay(parseFloat(gauge.value));
        render();
      };
      $('rm-unit-bb').addEventListener('click', () => switchUnit('bb'));
      $('rm-unit-chips').addEventListener('click', () => switchUnit('chips'));

      // Confirm
      $('rm-ok').addEventListener('click', () => {
        const v = parseFloat($('rm-input').value);
        if (!v || v <= 0) { errEl.innerHTML = 'Enter an amount > 0'; errEl.style.display = 'block'; return; }
        const chips = inputToChips();
        const br0 = state.betRound;
        let minTotal, reason;
        if (state.currentBet === 0) { minTotal = state.bb; reason = 'Min bet: 1 BB'; }
        else { minTotal = state.currentBet + (br0?.lastRaiseSize || state.bb); reason = 'Min raise'; }
        const enforcedMin = Math.min(minTotal, stackCap ?? Infinity);
        if (chips < enforcedMin) { errEl.innerHTML = `${reason} — Min: ${fmtAmount(enforcedMin)}`; errEl.style.display = 'block'; return; }
        state.raiseInput = ''; state.raiseError = null;
        closeModal(); doAction(player, 'raise', chips);
      });
      bindEnterToValidate('rm-input', 'rm-ok');

      $('rm-cancel').addEventListener('click', closeModal);
    }
  });
}

/* ================================================================
   INTERACTIONS SIÈGES
   ================================================================ */

/** @param {number} idx */
export function onSeatClick(idx) {
  const p = state.players[idx];
  if (state.step === 'setup') {
    if (state.heroIdx === null || idx === state.heroIdx) openHeroSetupModal(idx);
    else openOpponentSetupModal(idx);
  } else if (state.step === 'showdown') {
    if (p.inHand && !p.folded && p.idx !== state.heroIdx) openShowdownCardModal(idx);
  }
}

export function openHeroSetupModal(idx) {
  const p = state.players[idx];
  let stackInputUnit = state.stackUnit === 'chips' ? 'chips' : 'bb';
  const hGaugeMin = state.bb;
  const hGaugeMax = 500 * state.bb;
  const hGaugeStep = Math.max(1, Math.round(state.bb / 2));
  const initChips = p.stack > 0 ? p.stack : hGaugeMin;
  const stackVal = stackInputUnit === 'bb' ? (initChips / state.bb).toFixed(1) : Math.round(initChips);
  const fmtHero = chips => stackInputUnit === 'bb'
    ? `${(chips / state.bb).toFixed(1)} BB`
    : fmtChips(Math.round(chips));
  let selectedCards = [...p.cards];

  const html = `
    <div class="modal-title">Your position : ${p.pos}</div>
    <div class="modal-subtitle">Enter your stack and select 2 cards</div>
    <div class="raise-gauge-wrap">
      <div class="raise-gauge-val" id="hero-gauge-val">${fmtHero(initChips)}</div>
      <input type="range" class="raise-gauge" id="hero-gauge"
        min="${hGaugeMin}" max="${hGaugeMax}" step="${hGaugeStep}" value="${initChips}">
    </div>
    <div class="stack-input-wrap" style="margin:4px 0 12px;">
      <input type="number" inputmode="decimal" class="stack-input" id="hero-stack" value="${stackVal}" placeholder="Ex: 100" autofocus>
      <div class="unit-toggle-mini">
        <button id="hero-unit-bb" class="${stackInputUnit === 'bb' ? 'active' : ''}">BB</button>
        <button id="hero-unit-chips" class="${stackInputUnit === 'chips' ? 'active' : ''}">Tks</button>
      </div>
    </div>
    <label class="label" style="display:block;margin:0 0 6px;">Your hand - Select 2 cards</label>
    <div class="card-picker-status" id="cp-status"></div>
    <div class="card-picker" id="card-picker"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="hero-cancel">Cancel</button>
      <button class="btn btn-primary" id="hero-ok" disabled>Confirm</button>
    </div>`;

  showModal(html, { id: 'modal-hero-setup',
    onMount: () => {
      const gauge = $('hero-gauge'), gaugeVal = $('hero-gauge-val');

      const updateOk = () => { $('hero-ok').disabled = !(parseFloat($('hero-stack').value) > 0); };

      const syncGaugeDisplay = () => {
        gaugeVal.textContent = fmtHero(parseFloat(gauge.value));
      };

      // Jauge → input
      gauge.addEventListener('input', () => {
        const chips = parseFloat(gauge.value);
        gaugeVal.textContent = fmtHero(chips);
        $('hero-stack').value = stackInputUnit === 'bb' ? (chips / state.bb).toFixed(1) : Math.round(chips);
        updateOk();
      });

      // Input → jauge
      $('hero-stack').addEventListener('input', () => {
        const v = parseFloat($('hero-stack').value) || 0;
        const chips = stackInputUnit === 'bb' ? v * state.bb : v;
        gauge.value = Math.max(hGaugeMin, Math.min(hGaugeMax, chips));
        gaugeVal.textContent = fmtHero(parseFloat(gauge.value));
        updateOk();
      });

      buildCardPicker(selectedCards, 2, (cards) => { selectedCards = cards; updateOk(); });
      bindEnterToValidate('hero-stack', 'hero-ok');

      $('hero-unit-bb').addEventListener('click', () => {
        if (stackInputUnit === 'chips') { const v = parseFloat($('hero-stack').value); if (v > 0) $('hero-stack').value = +(v / state.bb).toFixed(2); }
        stackInputUnit = 'bb'; state.stackUnit = 'bb';
        $('hero-unit-bb').classList.add('active'); $('hero-unit-chips').classList.remove('active');
        syncGaugeDisplay(); render();
      });
      $('hero-unit-chips').addEventListener('click', () => {
        if (stackInputUnit === 'bb') { const v = parseFloat($('hero-stack').value); if (v > 0) $('hero-stack').value = Math.round(v * state.bb); }
        stackInputUnit = 'chips'; state.stackUnit = 'chips';
        $('hero-unit-chips').classList.add('active'); $('hero-unit-bb').classList.remove('active');
        syncGaugeDisplay(); render();
      });

      $('hero-cancel').addEventListener('click', closeModal);
      $('hero-ok').addEventListener('click', () => {
        const stackNum = parseFloat($('hero-stack').value);
        if (!stackNum || stackNum <= 0) return;
        p.stack = stackInputUnit === 'bb' ? stackNum * state.bb : stackNum;
        p.stackKnown = true; p.cards = selectedCards; p.inHand = true;
        state.heroIdx = idx; closeModal(); render();
      });
    }
  });
}

export function openOpponentSetupModal(idx) {
  const p = state.players[idx];
  let stackInputUnit = state.stackUnit === 'chips' ? 'chips' : 'bb';
  let stackVal = p.stackKnown && p.stack > 0 ? (stackInputUnit === 'bb' ? p.stack / state.bb : p.stack) : '';
  const html = `
    <div class="modal-title">Joueur en ${p.pos}</div>
    <div class="modal-subtitle">Saisis son stack pour l'inclure dans la main</div>
    <label class="label" style="display:block;margin-bottom:6px;">Stack du joueur</label>
    <div class="stack-input-wrap">
      <input type="number" inputmode="decimal" class="stack-input" id="op-stack" value="${stackVal}" placeholder="Stack..." autofocus>
      <div class="unit-toggle-mini">
        <button id="op-unit-bb" class="${stackInputUnit === 'bb' ? 'active' : ''}">BB</button>
        <button id="op-unit-chips" class="${stackInputUnit === 'chips' ? 'active' : ''}">Tks</button>
      </div>
    </div>
    <div style="display:flex;gap:6px;margin:8px 0;">
      <button class="btn btn-secondary" id="op-nc" style="flex:1;padding:10px;">Stack N/C</button>
      ${p.inHand ? '<button class="btn btn-secondary" id="op-remove" style="flex:1;padding:10px;background:#4b1c1c;color:#fca5a5;border-color:#7f1d1d;">Retirer de la main</button>' : ''}
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="op-cancel">Cancel</button>
      <button class="btn btn-primary" id="op-ok">Confirm</button>
    </div>`;
  showModal(html, { id: 'modal-opponent-setup',
    onMount: () => {
      $('op-unit-bb').addEventListener('click', () => {
        if (stackInputUnit === 'chips') { const v = parseFloat($('op-stack').value); if (v > 0) $('op-stack').value = +(v / state.bb).toFixed(2); }
        stackInputUnit = 'bb'; state.stackUnit = 'bb'; $('op-unit-bb').classList.add('active'); $('op-unit-chips').classList.remove('active'); render();
      });
      $('op-unit-chips').addEventListener('click', () => {
        if (stackInputUnit === 'bb') { const v = parseFloat($('op-stack').value); if (v > 0) $('op-stack').value = Math.round(v * state.bb); }
        stackInputUnit = 'chips'; state.stackUnit = 'chips'; $('op-unit-chips').classList.add('active'); $('op-unit-bb').classList.remove('active'); render();
      });
      $('op-nc').addEventListener('click', () => { p.inHand = true; p.stack = null; p.stackKnown = false; closeModal(); render(); });
      $('op-stack').addEventListener('input', () => {});
      bindEnterToValidate('op-stack', 'op-ok');
      const removeBtn = $('op-remove');
      if (removeBtn) removeBtn.addEventListener('click', () => { p.inHand = false; p.stack = null; p.stackKnown = false; closeModal(); render(); });
      $('op-cancel').addEventListener('click', closeModal);
      $('op-ok').addEventListener('click', () => {
        const v = parseFloat($('op-stack').value);
        if (!v || v <= 0) return;
        p.inHand = true; p.stack = stackInputUnit === 'bb' ? v * state.bb : v; p.stackKnown = true;
        closeModal(); render();
      });
    }
  });
}

/* ================================================================
   SÉLECTEUR DE CARTES
   ================================================================ */

/**
 * Affiche le picker de cartes dans un conteneur existant.
 * @param {string[]} currentSelection
 * @param {number} maxSelect
 * @param {Function} onChange
 * @param {boolean} [allowFewer=false]
 */
export function buildCardPicker(currentSelection, maxSelect, onChange, allowFewer = false) {
  const root = $('card-picker'), status = $('cp-status');
  let selection = [...currentSelection];
  const refreshStatus = () => {
    status.textContent = allowFewer
      ? `${selection.length}/${maxSelect} card(s) - you can select 0, 1 or ${maxSelect}`
      : `${selection.length}/${maxSelect} card(s) selected`;
  };
  const render2 = () => {
    root.innerHTML = '';
    SUITS.forEach((suit) => {
      const row = document.createElement('div');
      row.className = 'suit-row';
      const lbl = document.createElement('div');
      lbl.className = 'suit-label ' + suit.cssClass;
      lbl.textContent = suit.sym;
      row.appendChild(lbl);
      RANKS.forEach((r) => {
        const card = r + suit.code;
        const cell = document.createElement('div');
        cell.className = 'card-cell ' + suit.cssClass;
        cell.textContent = r;
        const isSelected = selection.includes(card);
        const usedElsewhere = !isSelected && isCardUsed(card);
        if (isSelected) cell.classList.add('selected');
        if (usedElsewhere) cell.classList.add('disabled');
        cell.addEventListener('click', () => {
          if (usedElsewhere) return;
          if (isSelected) { selection = selection.filter(c => c !== card); }
          else {
            if (selection.length >= maxSelect) { if (maxSelect === 1) selection = [card]; else return; }
            else selection.push(card);
          }
          render2(); onChange(selection);
        });
        row.appendChild(cell);
      });
      root.appendChild(row);
    });
    refreshStatus();
  };
  render2(); refreshStatus();
}

/* ================================================================
   SÉLECTION DES CARTES DU BOARD
   ================================================================ */

/**
 * Ouvre la modale de saisie des cartes du board pour une street donnée.
 * @param {string} street 'flop'|'turn'|'river'
 * @param {boolean} [autoMode=false] Enchaîne automatiquement les streets (all-in runout)
 */
export function promptCardSelection(street, autoMode = false) {
  const count = street === 'flop' ? 3 : 1;
  let selected = [];
  const html = `
    <div class="modal-title">${street.toUpperCase()}</div>
    <div class="modal-subtitle">Select ${count} card${count > 1 ? 's' : ''} from the board${autoMode ? ' - players all-in' : ''}</div>
    <div class="card-picker-status" id="cp-status"></div>
    <div class="card-picker" id="card-picker"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cards-back">← Back</button>
      <button class="btn btn-primary" id="cards-ok" disabled>Confirm</button>
    </div>`;
  showModal(html, { id: 'modal-board-cards',
    onMount: () => {
      buildCardPicker([], count, (cards) => {
        selected = cards;
        $('cards-ok').disabled = cards.length !== count;
      });
      $('cards-back').addEventListener('click', () => {
        closeModal();
        if (street === 'flop') {
          state.players.forEach(p => { p.currentBet = 0; p.totalBet = 0; p.folded = false; p.allin = false; });
          state.pot = 0; state.currentBet = 0; state.step = 'setup';
          postBlindsForPreview(); render();
        } else {
          const prevMap = { 'turn': 'flop', 'river': 'turn' };
          const prev = prevMap[street];
          if (prev === 'flop')  state.board = state.board.slice(0, 0);
          else if (prev === 'turn') state.board = state.board.slice(0, 3);
          state.players.forEach(p => { p.currentBet = 0; });
          state.currentBet = 0; state.step = prev + '-bet';
          state.betRound = { street: prev, queue: buildActionQueue(prev), qIndex: 0, lastRaiserIdx: null, lastRaiseSize: state.bb, history: [] };
          render();
        }
      });
      $('cards-ok').addEventListener('click', () => {
        state.board.push(...selected); closeModal();
        if (autoMode) {
          if (street === 'flop')       { state.step = 'turn-cards';  render(); promptCardSelection('turn',  true); }
          else if (street === 'turn')  { state.step = 'river-cards'; render(); promptCardSelection('river', true); }
          else { state.step = 'showdown'; render(); promptShowdown(); }
        } else {
          state.step = street + '-bet';
          state.betRound = { street, queue: buildActionQueue(street), qIndex: 0, lastRaiserIdx: null, lastRaiseSize: state.bb, history: [] };
          render();
        }
      });
    }
  });
}

/* ================================================================
   SHOWDOWN
   ================================================================ */

export function promptShowdown() {
  const opponents = getActivePlayers().filter(p => p.idx !== state.heroIdx);
  if (opponents.length === 0) { finishHand(); return; }
  showdownIterator(opponents, 0);
}

export function showdownIterator(list, i) {
  if (i >= list.length) { finishHand(); return; }
  openShowdownCardModal(list[i].idx, () => showdownIterator(list, i + 1));
}

export function openShowdownCardModal(idx, onDone) {
  const p = state.players[idx];
  let selected = [...p.cards];
  const html = `
    <div class="modal-title">Cards — ${p.pos}</div>
    <div class="modal-subtitle">0, 1 or 2 cards (N/C if unknown)</div>
    <div class="card-picker-status" id="cp-status"></div>
    <div class="card-picker" id="card-picker"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="show-nc">N/C</button>
      <button class="btn btn-primary" id="show-ok">Confirm</button>
    </div>`;
  showModal(html, { id: 'modal-showdown',
    onMount: () => {
      buildCardPicker(selected, 2, (cards) => { selected = cards; }, true);
      $('show-nc').addEventListener('click', () => { p.cards = []; closeModal(); render(); if (onDone) onDone(); });
      $('show-ok').addEventListener('click', () => { p.cards = selected; closeModal(); render(); if (onDone) onDone(); });
    }
  });
}

/* ================================================================
   UTILITAIRE CLAVIER ANDROID
   ================================================================ */

/**
 * Sur Android, le clavier numérique affiche une touche "Entrée".
 * Ce binding la connecte au bouton de validation et ferme le clavier.
 * @param {string} inputId
 * @param {string|null} validateBtnId
 */
export function bindEnterToValidate(inputId, validateBtnId) {
  const input = $(inputId);
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (validateBtnId) { const btn = $(validateBtnId); if (btn && !btn.disabled) btn.click(); }
    input.blur();
  });
}
