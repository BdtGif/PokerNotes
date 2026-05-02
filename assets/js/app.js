/* =================================================================
   POKER TRACKER V8
   ================================================================= */

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const RANK_VAL = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };
const SUITS = [
  { sym: '♠', code: 's', color: 'black', name: 'Pique',   cssClass: 'suit-s' },
  { sym: '♥', code: 'h', color: 'red',   name: 'Cœur',    cssClass: 'suit-h' },
  { sym: '♦', code: 'd', color: 'red',   name: 'Carreau', cssClass: 'suit-d' },
  { sym: '♣', code: 'c', color: 'black', name: 'Trèfle',  cssClass: 'suit-c' }
];

const POSITIONS = {
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

const HAND_RANK_LABELS = [
  'Carte haute','Paire','Double paire','Brelan','Quinte',
  'Couleur','Full','Carré','Quinte flush','Quinte flush royale'
];

const state = {
  step: 'setup',
  sb: 25, bb: 50,
  sbManual: false, // V9: BB-only entry; SB auto = BB/2 unless user clicks SB to override
  anteEnabled: false,
  ante: 0,
  bbAnteMode: false, // if true, ante = 1 BB (paid by BB only)
  numPlayers: 6,
  stackUnit: 'chips',
  heroIdx: null,
  players: [],
  board: [],
  pot: 0,
  currentBet: 0,
  betRound: null,
  raiseUnit: 'chips',
  raiseInput: '',
  allinInput: '',
  raiseShownFor: null,
  allinShownFor: null,
  raiseError: null, // V9: inline error message for raise/bet
  winners: [], // for display: [{pos, share}]
  finalPotForDisplay: 0
};

function $(id) { return document.getElementById(id); }
function fmtChips(n) { return Math.round(n).toLocaleString('fr-FR'); }
function fmtStack(n) {
  if (n === null || n === undefined) return '?';
  if (state.stackUnit === 'bb') return (n / state.bb).toFixed(1) + ' bb';
  return fmtChips(n);
}
function fmtAmount(n) {
  if (state.stackUnit === 'bb') return (n / state.bb).toFixed(1) + ' bb';
  return fmtChips(n);
}

function cardLabel(card) {
  const suit = SUITS.find(s => s.code === card[1]);
  return { rank: card[0], sym: suit.sym, color: suit.color, cssClass: suit.cssClass };
}
// V9: only top-left symbol (bottom-right removed)
function cardInnerHtml(card) {
  const lbl = cardLabel(card);
  return `<span class="card-sym-tl">${lbl.sym}</span><span class="card-rank">${lbl.rank}</span>`;
}
function isCardUsed(card) {
  if (state.board.includes(card)) return true;
  for (const p of state.players) {
    if (p.cards.includes(card)) return true;
  }
  return false;
}
function getActivePlayers() {
  return state.players.filter(p => p.inHand && !p.folded);
}

function getEffectiveAnte() {
  if (!state.anteEnabled) return 0;
  if (state.bbAnteMode) return state.bb;
  return state.ante || 0;
}

/* ---------- SEAT POSITIONING ---------- */
function getSeatScreenPositions() {
  const tableArea = $('table-area');
  const rect = tableArea.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
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
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    positions[i] = { x, y, angle };
  }
  return positions;
}

/* ---------- RENDER SEATS ---------- */
function renderSeats() {
  const container = $('seats-container');
  container.innerHTML = '';
  const positions = getSeatScreenPositions();
  const tableArea = $('table-area');
  const rect = tableArea.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  const actingIdx = (state.betRound && (state.step.endsWith('-bet') || state.step === 'preflop'))
    ? state.betRound.queue[state.betRound.qIndex]
    : null;

  state.players.forEach((p, i) => {
    const { x, y, angle } = positions[i];
    const seat = document.createElement('div');
    seat.className = 'seat';
    seat.style.left = x + 'px';
    seat.style.top = y + 'px';

    if (p.idx === state.heroIdx) seat.classList.add('is-hero');
    if (state.heroIdx !== null && p.inHand && p.idx !== state.heroIdx) seat.classList.add('is-active-in-hand');
    if (state.heroIdx !== null && !p.inHand) seat.classList.add('is-out');
    if (p.folded) seat.classList.add('is-folded');
    if (p.allin) seat.classList.add('is-allin');
    if (actingIdx === p.idx) seat.classList.add('is-acting');
    if (p.result === 'win') seat.classList.add('is-winner');
    if (p.result === 'tie') seat.classList.add('is-tie');
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
    posEl.textContent = p.pos;
    seat.appendChild(posEl);

    if (p.inHand && p.stackKnown && p.stack !== null) {
      const stackEl = document.createElement('div');
      stackEl.className = 'seat-stack';
      stackEl.textContent = fmtStack(p.stack);
      seat.appendChild(stackEl);
    } else if (p.inHand && !p.stackKnown) {
      const stackEl = document.createElement('div');
      stackEl.className = 'seat-stack';
      stackEl.textContent = 'N/C';
      seat.appendChild(stackEl);
    }

    if (p.handValueLabel) {
      const hv = document.createElement('div');
      hv.className = 'seat-handvalue';
      hv.textContent = p.handValueLabel;
      seat.appendChild(hv);
    }

    container.appendChild(seat);

    // Bet chip in front of player toward center (on the felt)
    // Show during setup (blinds preview) AND during bet rounds
    let chipAmount = p.currentBet;
    let chipLabel = null;
    if (state.step === 'setup' && p.postedBlind) {
      // During setup, p.currentBet has been set by postBlindsForPreview.
      // Show only the value (no SB/BB/Ante prefix)
      chipLabel = fmtAmount(p.currentBet);
    } else if (chipAmount > 0 && (state.step.endsWith('-bet') || state.step === 'preflop')) {
      chipLabel = fmtAmount(chipAmount);
    }

    if (chipLabel) {
      const chip = document.createElement('div');
      chip.className = 'seat-bet-chip';
      if (p.postedBlind) chip.classList.add('is-blind');
      const dx = cx - x;
      const dy = cy - y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      // V8: position V6 (décollées vers intérieur du tapis)
      const offset = 70;
      const chipX = x + (dx / dist) * offset;
      const chipY = y + (dy / dist) * offset;
      chip.style.left = chipX + 'px';
      chip.style.top = chipY + 'px';
      chip.style.position = 'absolute';
      chip.textContent = chipLabel;
      container.appendChild(chip);
    }

    // V5: Dealer button on BU seat — V6: more detached, on felt
    if (p.pos === 'BU') {
      const db = document.createElement('div');
      db.className = 'dealer-btn';
      const dx = cx - x;
      const dy = cy - y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const ux = dx / dist;   // unit vector toward center
      const uy = dy / dist;
      // perpendicular "left" vector (rotated -90° from toward-center, i.e. dealer's left)
      const lx = uy;
      const ly = -ux;
      const forward = 56;     // toward center (V6: bien décollé)
      const sideLeft = 36;    // to the left (V6: plus marqué)
      db.style.left = (x + ux * forward + lx * sideLeft) + 'px';
      db.style.top  = (y + uy * forward + ly * sideLeft) + 'px';
      db.textContent = 'D';
      container.appendChild(db);
    }

    seat.addEventListener('click', () => onSeatClick(p.idx));
  });
}

function renderBoard() {
  const board = $('board');
  if (state.step === 'setup' || state.step === 'preflop') {
    board.style.display = 'none';
    return;
  }
  board.style.display = 'flex';
  board.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const c = state.board[i];
    const div = document.createElement('div');
    if (c) {
      const lbl = cardLabel(c);
      div.className = 'board-card ' + lbl.cssClass;
      div.innerHTML = cardInnerHtml(c);
    } else {
      div.className = 'board-card empty';
    }
    board.appendChild(div);
  }
}

function renderPot() {
  const pd = $('pot-display');
  const wd = $('winner-display');
  const ad = $('ante-display');

  // Winner display
  if (state.step === 'result' && state.winners.length > 0) {
    wd.style.display = 'block';
    wd.classList.toggle('tie', state.winners.length > 1);
    if (state.winners.length === 1) {
      const w = state.winners[0];
      wd.innerHTML = `<strong>${w.pos}</strong> gagne : <strong>${fmtAmount(w.share)}</strong>`;
    } else {
      const lines = state.winners.map(w => `<strong>${w.pos}</strong> gagne : <strong>${fmtAmount(w.share)}</strong>`);
      wd.innerHTML = lines.join('<br>');
    }
  } else {
    wd.style.display = 'none';
  }

  // V5: pot always visible
  pd.style.display = 'block';
  pd.textContent = 'Pot : ' + fmtAmount(state.pot);

  // V5: ante info under pot (separate from BB)
  if (state.anteEnabled) {
    const ante = getEffectiveAnte();
    if (ante > 0) {
      ad.style.display = 'block';
      // V6: simple format — "Ante : X bb" ou valeur jetons selon l'unité
      ad.textContent = 'Ante : ' + fmtAmount(ante);
    } else {
      ad.style.display = 'none';
    }
  } else {
    ad.style.display = 'none';
  }
}

function renderStepIndicator() {
  const map = {
    'setup': 'Étape 1 — Configurer la table',
    'preflop': 'Préflop — Tour de mises',
    'flop-cards': 'Flop — Sélectionne 3 cartes',
    'flop-bet': 'Flop — Tour de mises',
    'turn-cards': 'Turn — Sélectionne 1 carte',
    'turn-bet': 'Turn — Tour de mises',
    'river-cards': 'River — Sélectionne 1 carte',
    'river-bet': 'River — Tour de mises',
    'showdown': 'Showdown — Cartes adverses',
    'result': 'Résultat'
  };
  $('step-indicator').textContent = map[state.step] || '';
}

function renderBottomBar() {
  const validateBtn = $('validate-setup-btn');
  const backBtn = $('back-btn');

  // Back button: enabled at every step except setup with nothing changed
  if (state.step === 'setup') {
    backBtn.disabled = state.heroIdx === null && state.players.every(p => !p.inHand);
    backBtn.textContent = '← Retour';
  } else {
    backBtn.disabled = false;
    backBtn.textContent = '← Retour';
  }

  if (state.step === 'setup') {
    validateBtn.style.display = 'block';
    const inHandCount = state.players.filter(p => p.inHand).length;
    validateBtn.disabled = !(state.heroIdx !== null && inHandCount >= 2 && state.players[state.heroIdx].cards.length === 2);
    validateBtn.textContent = 'Valider';
  } else if (state.step === 'result') {
    validateBtn.style.display = 'block';
    validateBtn.disabled = false;
    validateBtn.textContent = 'Nouvelle main';
  } else {
    validateBtn.style.display = 'none';
  }

  // Unit switch
  const sw = $('unit-switch');
  sw.classList.toggle('bb', state.stackUnit === 'bb');

  // Header inputs
  $('sb-input').value = state.sb;
  $('bb-input').value = state.bb;

  // Ante UI
  const anteToggle = $('ante-toggle');
  const bbanteToggle = $('bbante-toggle');
  const anteInput = $('ante-input');
  anteToggle.classList.toggle('active', state.anteEnabled);
  anteToggle.textContent = state.anteEnabled ? 'ON' : 'OFF';
  bbanteToggle.classList.toggle('active', state.bbAnteMode);

  if (state.anteEnabled) {
    if (state.bbAnteMode) {
      anteInput.disabled = true;
      anteInput.value = '';
      anteInput.placeholder = '= 1 BB';
    } else {
      anteInput.disabled = false;
      anteInput.value = state.ante || '';
      anteInput.placeholder = 'val';
    }
  } else {
    anteInput.disabled = true;
    anteInput.value = '';
    anteInput.placeholder = '—';
  }
}

function renderActionPanel() {
  // V10.1: never tear down the action panel while the user is typing in the
  // raise/all-in field — destroying the input drops focus + closes the
  // Android keyboard mid-keystroke and breaks input completely.
  const _ae = document.activeElement;
  if (_ae && _ae.tagName === 'INPUT' &&
      (_ae.id === 'ap-raise-input' || _ae.id === 'ap-allin-input')) {
    return;
  }
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
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  const panel = document.createElement('div');
  panel.className = 'action-panel';

  const toCall = state.currentBet - player.currentBet;
  const canCheck = toCall === 0;

  const heroCardsHtml = player.idx === state.heroIdx
    ? '<div style="display:flex;justify-content:center;gap:3px;margin-top:4px;">' + player.cards.map(c => { const l = cardLabel(c); return `<div class="mini-card ${l.cssClass}">${cardInnerHtml(c)}</div>`; }).join('') + '</div>'
    : '';

  let infoHtml = '';
  if (toCall > 0) {
    infoHtml = `<div class="action-panel-info"><strong>${player.pos}</strong> — À suivre : <strong>${fmtAmount(toCall)}</strong>${heroCardsHtml}</div>`;
  } else {
    infoHtml = `<div class="action-panel-info"><strong>${player.pos}</strong> — Aucune mise à suivre${heroCardsHtml}</div>`;
  }

  const showRaiseInput = state.raiseShownFor === idx;
  const showAllinInput = state.allinShownFor === idx;

  let buttonsHtml = '';
  buttonsHtml += '<div class="action-row-inline three">';
  buttonsHtml += `<button class="action-btn-inline action-fold" id="ap-fold">Fold</button>`;
  if (canCheck) {
    buttonsHtml += `<button class="action-btn-inline action-check" id="ap-check">Check</button>`;
  } else {
    // V7: si le call dépasse le stack restant, afficher le stack restant (call all-in)
    let callDisplay = toCall;
    let callIsAllin = false;
    if (player.stackKnown && player.stack !== null && toCall >= player.stack) {
      callDisplay = player.stack;
      callIsAllin = true;
    }
    const callLabel = callIsAllin
      ? `Call all-in ${fmtAmount(callDisplay)}`
      : `Call ${fmtAmount(callDisplay)}`;
    buttonsHtml += `<button class="action-btn-inline action-call" id="ap-call">${callLabel}</button>`;
  }
  buttonsHtml += `<button class="action-btn-inline action-raise" id="ap-raise">${state.currentBet > 0 ? 'Raise' : 'Bet'}</button>`;
  buttonsHtml += '</div>';

  buttonsHtml += '<div class="action-row-inline">';
  buttonsHtml += `<button class="action-btn-inline action-back-inline" id="ap-back">← Retour</button>`;
  buttonsHtml += `<button class="action-btn-inline action-allin" id="ap-allin">All-in</button>`;
  buttonsHtml += '</div>';

  let raiseInputHtml = '';
  if (showRaiseInput) {
    const isPostflop = state.step.endsWith('-bet') && state.step !== 'preflop';
    let sliderHtml = '';
    if (isPostflop) {
      // Compute current pot percentage based on raiseInput (in chips)
      const currentChips = state.raiseInput
        ? (state.raiseUnit === 'bb' ? parseFloat(state.raiseInput) * state.bb : parseFloat(state.raiseInput))
        : 0;
      const pct = state.pot > 0 ? Math.min(200, Math.round((currentChips / state.pot) * 100)) : 0;
      sliderHtml = `
        <div class="pot-slider-wrap">
          <div class="pot-slider-header">
            <span>% du pot</span>
            <span class="pot-slider-value" id="ap-slider-val">${pct}%</span>
          </div>
          <input type="range" min="0" max="200" step="5" value="${pct}" class="pot-slider" id="ap-pot-slider">
          <div class="pot-slider-presets">
            <button class="pot-preset-btn" data-pct="20">20%</button>
            <button class="pot-preset-btn" data-pct="25">¼</button>
            <button class="pot-preset-btn" data-pct="33">⅓</button>
            <button class="pot-preset-btn" data-pct="40">40%</button>
            <button class="pot-preset-btn" data-pct="50">½</button>
            <button class="pot-preset-btn" data-pct="66">⅔</button>
            <button class="pot-preset-btn" data-pct="75">¾</button>
            <button class="pot-preset-btn" data-pct="100">Pot</button>
            <button class="pot-preset-btn" data-pct="125">125%</button>
          </div>
        </div>`;
    }
    raiseInputHtml = `
      <div class="raise-inline-row">
        <input type="number" inputmode="decimal" class="raise-input-inline" id="ap-raise-input" value="${state.raiseInput || ''}" placeholder="Total" autofocus>
        <div class="unit-toggle-mini">
          <button id="ap-unit-chips" class="${state.raiseUnit==='chips'?'active':''}">J</button>
          <button id="ap-unit-bb" class="${state.raiseUnit==='bb'?'active':''}">BB</button>
        </div>
        <button class="raise-confirm" id="ap-raise-ok">OK</button>
      </div>
      ${state.raiseError ? `<div class="raise-error">${state.raiseError}</div>` : ''}
      ${sliderHtml}`;
  }

  let allinInputHtml = '';
  if (showAllinInput) {
    if (player.stackKnown && player.stack !== null) {
      // V7: afficher le stack restant à mettre, pas le total cumulé
      allinInputHtml = `
        <div class="allin-inline-row">
          <div style="flex:1;font-size:11px;color:#fecaca;text-align:center;">All-in : ${fmtAmount(player.stack)}</div>
          <button class="raise-confirm" id="ap-allin-ok" style="background:#b91c1c">OK</button>
        </div>`;
    } else {
      // V5: stack inconnu → saisie en BB uniquement
      allinInputHtml = `
        <div class="allin-inline-row">
          <input type="number" inputmode="decimal" class="raise-input-inline" id="ap-allin-input" value="${state.allinInput || ''}" placeholder="Total all-in (BB)" autofocus step="0.5">
          <div style="font-size:11px;font-weight:700;color:var(--gold);padding:0 4px;">BB</div>
          <button class="raise-confirm" id="ap-allin-ok" style="background:#b91c1c">OK</button>
        </div>`;
    }
  }

  panel.innerHTML = infoHtml + buttonsHtml + raiseInputHtml + allinInputHtml;
  root.appendChild(panel);

  const panelRect = panel.getBoundingClientRect();
  const tableRect = tableArea.getBoundingClientRect();

  let px, py;
  const cosA = Math.cos(pos.angle);
  const seatRadius = 48;
  const margin = 16;
  // V4: right side panel for top/bottom/right seats; left side panel for left seats
  if (cosA >= 0) {
    // seat is on right half (or top/bottom centered) -> place panel to the LEFT of seat? 
    // User wants: right for haut/bas/droite => panel on RIGHT side of seat
    px = pos.x + seatRadius + margin;
    py = pos.y - panelRect.height / 2;
  } else {
    // seat is clearly on left half -> panel on LEFT side of seat
    px = pos.x - seatRadius - margin - panelRect.width;
    py = pos.y - panelRect.height / 2;
  }
  px = Math.max(8, Math.min(tableRect.width - panelRect.width - 8, px));
  py = Math.max(8, Math.min(tableRect.height - panelRect.height - 8, py));
  panel.style.left = px + 'px';
  panel.style.top = py + 'px';

  const foldBtn = $('ap-fold');
  const checkBtn = $('ap-check');
  const callBtn = $('ap-call');
  const raiseBtn = $('ap-raise');
  const allinBtn = $('ap-allin');
  const backBtn2 = $('ap-back');

  if (foldBtn) foldBtn.addEventListener('click', () => doAction(player, 'fold'));
  if (checkBtn) checkBtn.addEventListener('click', () => doAction(player, 'check'));
  if (callBtn) callBtn.addEventListener('click', () => doAction(player, 'call'));
  if (raiseBtn) raiseBtn.addEventListener('click', () => {
    state.raiseShownFor = idx;
    state.allinShownFor = null;
    state.raiseInput = '';
    state.raiseError = null;
    render();
    setTimeout(() => { const i = $('ap-raise-input'); if (i) i.focus(); }, 50);
  });
  if (allinBtn) allinBtn.addEventListener('click', () => {
    state.allinShownFor = idx;
    state.raiseShownFor = null;
    state.allinInput = '';
    render();
    if (!player.stackKnown) {
      setTimeout(() => { const i = $('ap-allin-input'); if (i) i.focus(); }, 50);
    }
  });
  if (backBtn2) backBtn2.addEventListener('click', goBackOneAction);

  if (showRaiseInput) {
    $('ap-unit-chips').addEventListener('click', () => { state.raiseUnit = 'chips'; render(); });
    $('ap-unit-bb').addEventListener('click', () => { state.raiseUnit = 'bb'; render(); });
    $('ap-raise-input').addEventListener('input', (e) => {
      state.raiseInput = e.target.value;
      // V9: hide any prior error live without re-rendering
      if (state.raiseError) {
        state.raiseError = null;
        const errEl = document.querySelector('.raise-error');
        if (errEl) errEl.remove();
      }
      // Update slider live without re-rendering whole panel
      const slider = $('ap-pot-slider');
      const sliderVal = $('ap-slider-val');
      if (slider && sliderVal && state.pot > 0) {
        const chips = state.raiseUnit === 'bb' ? (parseFloat(e.target.value) || 0) * state.bb : (parseFloat(e.target.value) || 0);
        const pct = Math.min(200, Math.max(0, Math.round((chips / state.pot) * 100)));
        slider.value = pct;
        sliderVal.textContent = pct + '%';
      }
    });
    // V4: pot percentage slider bindings
    const slider = $('ap-pot-slider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value) || 0;
        $('ap-slider-val').textContent = pct + '%';
        const chips = (state.pot * pct) / 100;
        const display = state.raiseUnit === 'bb' ? (chips / state.bb).toFixed(1) : Math.round(chips);
        state.raiseInput = String(display);
        $('ap-raise-input').value = display;
      });
      // Preset buttons
      document.querySelectorAll('.pot-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pct = parseInt(btn.dataset.pct);
          slider.value = pct;
          $('ap-slider-val').textContent = pct + '%';
          const chips = (state.pot * pct) / 100;
          const display = state.raiseUnit === 'bb' ? (chips / state.bb).toFixed(1) : Math.round(chips);
          state.raiseInput = String(display);
          $('ap-raise-input').value = display;
        });
      });
    }
    $('ap-raise-ok').addEventListener('click', () => {
      const v = parseFloat($('ap-raise-input').value);
      if (!v || v <= 0) {
        state.raiseError = 'Saisis un montant supérieur à 0.';
        render();
        return;
      }
      const chips = state.raiseUnit === 'bb' ? v * state.bb : v;
      // V9: min bet/raise rules — inline error display
      const br0 = state.betRound;
      let minTotal, reason;
      if (state.currentBet === 0) {
        // Opening bet → min 1 BB
        minTotal = state.bb;
        reason = 'Mise minimale : 1 BB';
      } else {
        // Sur-relance → min = dernière mise + (dernière − précédente)
        minTotal = state.currentBet + (br0.lastRaiseSize || state.bb);
        reason = 'Sur-relance minimale : dernière mise + dernier incrément';
      }
      // Cap to player stack (sinon impossible si stack < min → all-in autorisé)
      const stackCap = (player.stackKnown && player.stack !== null) ? (player.stack + player.currentBet) : Infinity;
      const enforcedMin = Math.min(minTotal, stackCap);
      if (chips < enforcedMin) {
        state.raiseError = `${reason}<br><strong>Min : ${fmtAmount(enforcedMin)}</strong>`;
        render();
        return;
      }
      state.raiseShownFor = null;
      state.raiseInput = '';
      state.raiseError = null;
      doAction(player, 'raise', chips);
    });
  }
  if (showAllinInput) {
    if (player.stackKnown && player.stack !== null) {
      $('ap-allin-ok').addEventListener('click', () => {
        // V5: cap at stack (already implicit since totalBet uses player.stack)
        const totalBet = player.stack + player.currentBet;
        state.allinShownFor = null;
        doAction(player, 'allin', totalBet);
      });
    } else {
      // V5: stack inconnu → saisie forcée en BB
      $('ap-allin-input').addEventListener('input', (e) => { state.allinInput = e.target.value; });
      $('ap-allin-ok').addEventListener('click', () => {
        const v = parseFloat($('ap-allin-input').value);
        if (!v || v <= 0) return;
        const chips = v * state.bb;
        state.allinShownFor = null;
        state.allinInput = '';
        doAction(player, 'allin', chips);
      });
    }
  }
}

function render() {
  renderSeats();
  renderBoard();
  renderPot();
  renderStepIndicator();
  renderBottomBar();
  renderActionPanel();
}

/* ---------- Setup ---------- */
function rebuildPlayers() {
  const positions = POSITIONS[state.numPlayers];
  state.players = positions.map((pos, idx) => ({
    idx, pos,
    inHand: false,
    stack: null, stackKnown: false,
    cards: [],
    folded: false,
    allin: false,
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
  postBlindsForPreview();
}

function postBlindsForPreview() {
  state.players.forEach(p => { p.postedBlind = null; p.currentBet = 0; });
  state.pot = 0;

  // SB & BB
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

  // Ante
  // V5: Ante goes to pot only — NOT shown on seat chips (displayed separately under pot)
  if (state.anteEnabled) {
    const ante = getEffectiveAnte();
    if (state.bbAnteMode) {
      // BB pays one ante for the table — added to pot, NOT to BB chip
      state.pot += ante;
    } else {
      // Each seat antes — added to pot only
      state.pot += ante * state.numPlayers;
    }
  }
}

/* ---------- Modal helpers ---------- */
function showModal(html, opts = {}) {
  const root = $('modal-root');
  root.innerHTML = `<div class="overlay"><div class="modal">${html}</div></div>`;
  if (opts.onMount) opts.onMount();
}
function closeModal() { $('modal-root').innerHTML = ''; }

/* ---------- Seat click ---------- */
function onSeatClick(idx) {
  const p = state.players[idx];
  if (state.step === 'setup') {
    if (state.heroIdx === null) {
      openHeroSetupModal(idx);
    } else if (idx === state.heroIdx) {
      openHeroSetupModal(idx);
    } else {
      openOpponentSetupModal(idx);
    }
  } else if (state.step === 'showdown') {
    if (p.inHand && !p.folded && p.idx !== state.heroIdx) {
      openShowdownCardModal(idx);
    }
  }
}

function openHeroSetupModal(idx) {
  const p = state.players[idx];
  let stackVal = p.stack || '';
  let selectedCards = [...p.cards];
  let stackInputUnit = 'bb'; // V8: BB par défaut

  const html = `
    <div class="modal-title">Ta position : ${p.pos}</div>
    <div class="modal-subtitle">Saisis ton stack et choisis tes 2 cartes</div>
    <label class="label" style="display:block; margin-bottom:6px;">Ton stack</label>
    <div class="stack-input-wrap">
      <input type="number" inputmode="decimal" class="stack-input" id="hero-stack" value="${stackVal}" placeholder="Ex: 100" autofocus>
      <div class="unit-toggle-mini" style="height:48px;">
        <button id="hero-unit-bb" class="active" style="padding:0 10px;font-size:11px;">BB</button>
        <button id="hero-unit-chips" style="padding:0 10px;font-size:11px;">Jetons</button>
      </div>
    </div>
    <label class="label" style="display:block; margin: 12px 0 6px;">Ta main (sélectionne 2 cartes)</label>
    <div class="card-picker-status" id="cp-status"></div>
    <div class="card-picker" id="card-picker"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="hero-cancel">Annuler</button>
      <button class="btn btn-primary" id="hero-ok" disabled>Valider</button>
    </div>
  `;
  showModal(html, {
    onMount: () => {
      const updateOk = () => {
        $('hero-ok').disabled = !(selectedCards.length === 2 && parseFloat($('hero-stack').value) > 0);
      };
      buildCardPicker(selectedCards, 2, (cards) => {
        selectedCards = cards;
        updateOk();
      });
      $('hero-stack').addEventListener('input', updateOk);
      // V10.2: Enter on Android numeric keypad → validate + close keyboard
      bindEnterToValidate('hero-stack', 'hero-ok');
      $('hero-unit-bb').addEventListener('click', () => {
        stackInputUnit = 'bb';
        $('hero-unit-bb').classList.add('active');
        $('hero-unit-chips').classList.remove('active');
      });
      $('hero-unit-chips').addEventListener('click', () => {
        stackInputUnit = 'chips';
        $('hero-unit-chips').classList.add('active');
        $('hero-unit-bb').classList.remove('active');
      });
      $('hero-cancel').addEventListener('click', closeModal);
      $('hero-ok').addEventListener('click', () => {
        const stackNum = parseFloat($('hero-stack').value);
        if (!stackNum || stackNum <= 0) return;
        // Convert to chips if entered in BB
        const stackInChips = stackInputUnit === 'bb' ? stackNum * state.bb : stackNum;
        p.stack = stackInChips;
        p.stackKnown = true;
        p.cards = selectedCards;
        p.inHand = true;
        state.heroIdx = idx;
        closeModal();
        render();
      });
    }
  });
}

function openOpponentSetupModal(idx) {
  const p = state.players[idx];
  let stackVal = p.stackKnown ? p.stack : '';
  let stackInputUnit = 'bb'; // V8: BB par défaut
  // If stack was previously stored in chips, optionally show value as-is

  const html = `
    <div class="modal-title">Joueur en ${p.pos}</div>
    <div class="modal-subtitle">Saisis son stack pour l'inclure dans la main</div>
    <label class="label" style="display:block; margin-bottom:6px;">Stack du joueur</label>
    <div class="stack-input-wrap">
      <input type="number" inputmode="decimal" class="stack-input" id="op-stack" value="${stackVal}" placeholder="Stack..." autofocus>
      <div class="unit-toggle-mini" style="height:48px;">
        <button id="op-unit-bb" class="active" style="padding:0 10px;font-size:11px;">BB</button>
        <button id="op-unit-chips" style="padding:0 10px;font-size:11px;">Jetons</button>
      </div>
    </div>
    <div style="display:flex;gap:6px;margin:8px 0;">
      <button class="btn btn-secondary" id="op-nc" style="flex:1;padding:10px;">Stack N/C</button>
      ${p.inHand ? '<button class="btn btn-secondary" id="op-remove" style="flex:1;padding:10px;background:#4b1c1c;color:#fca5a5;border-color:#7f1d1d;">Retirer de la main</button>' : ''}
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="op-cancel">Annuler</button>
      <button class="btn btn-primary" id="op-ok">Valider</button>
    </div>
  `;
  showModal(html, {
    onMount: () => {
      let nc = false;
      $('op-unit-bb').addEventListener('click', () => {
        stackInputUnit = 'bb';
        $('op-unit-bb').classList.add('active');
        $('op-unit-chips').classList.remove('active');
      });
      $('op-unit-chips').addEventListener('click', () => {
        stackInputUnit = 'chips';
        $('op-unit-chips').classList.add('active');
        $('op-unit-bb').classList.remove('active');
      });
      $('op-nc').addEventListener('click', () => {
        nc = true;
        $('op-stack').value = '';
        $('op-stack').placeholder = 'Stack non communiqué';
        // Validate immediately as in-hand without known stack
        p.inHand = true;
        p.stack = null;
        p.stackKnown = false;
        closeModal();
        render();
      });
      $('op-stack').addEventListener('input', () => { nc = false; });
      // V10.2: Enter on Android numeric keypad → validate + close keyboard
      bindEnterToValidate('op-stack', 'op-ok');
      const removeBtn = $('op-remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          p.inHand = false;
          p.stack = null;
          p.stackKnown = false;
          closeModal();
          render();
        });
      }
      $('op-cancel').addEventListener('click', closeModal);
      $('op-ok').addEventListener('click', () => {
        const v = parseFloat($('op-stack').value);
        if (!v || v <= 0) return;
        const stackInChips = stackInputUnit === 'bb' ? v * state.bb : v;
        p.inHand = true;
        p.stack = stackInChips;
        p.stackKnown = true;
        closeModal();
        render();
      });
    }
  });
}

/* ---------- Card picker ---------- */
function buildCardPicker(currentSelection, maxSelect, onChange, allowFewer = false) {
  const root = $('card-picker');
  const status = $('cp-status');
  let selection = [...currentSelection];

  const refreshStatus = () => {
    if (allowFewer) {
      status.textContent = `${selection.length}/${maxSelect} carte(s) — tu peux en choisir 0, 1 ou ${maxSelect}`;
    } else {
      status.textContent = `${selection.length}/${maxSelect} carte(s) sélectionnée(s)`;
    }
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
          if (isSelected) {
            selection = selection.filter(c => c !== card);
          } else {
            if (selection.length >= maxSelect) {
              if (maxSelect === 1) selection = [card]; else return;
            } else selection.push(card);
          }
          render2();
          onChange(selection);
        });
        row.appendChild(cell);
      });
      root.appendChild(row);
    });
    refreshStatus();
  };
  render2();
  refreshStatus();
}

/* ---------- Start preflop ---------- */
function startPreflop() {
  // Reset preview chips, and post real blinds + antes for IN-HAND players only
  state.pot = 0;
  state.players.forEach(p => { p.postedBlind = null; p.currentBet = 0; p.totalBet = 0; });

  const ante = getEffectiveAnte();
  // Apply ante
  if (state.anteEnabled && ante > 0) {
    if (state.bbAnteMode) {
      // Only BB pays the table ante (simplified: 1 BB)
      const bbPlayer = state.players.find(p => p.pos === 'BB' && p.inHand);
      if (bbPlayer) {
        // Take ante from BB stack (separate from the BB itself); we add it to pot but NOT to currentBet.
        // For simplicity here, ante goes directly into pot, doesn't count as currentBet.
        if (bbPlayer.stackKnown && bbPlayer.stack !== null) {
          const a = Math.min(ante, bbPlayer.stack);
          bbPlayer.stack -= a;
          bbPlayer.totalBet += a;
          state.pot += a;
          if (bbPlayer.stack === 0) bbPlayer.allin = true;
        } else {
          bbPlayer.totalBet += ante;
          state.pot += ante;
        }
      }
    } else {
      // Each in-hand player antes
      state.players.filter(p => p.inHand).forEach(p => {
        if (p.stackKnown && p.stack !== null) {
          const a = Math.min(ante, p.stack);
          p.stack -= a;
          p.totalBet += a;
          state.pot += a;
          if (p.stack === 0) p.allin = true;
        } else {
          p.totalBet += ante;
          state.pot += ante;
        }
      });
    }
  }

  // Post SB and BB
  const inHand = state.players.filter(p => p.inHand);
  const sbPlayer = inHand.find(p => p.pos === 'SB');
  const bbPlayer = inHand.find(p => p.pos === 'BB');
  if (state.numPlayers === 2) {
    const bu = inHand.find(p => p.pos === 'BU');
    if (bu) postBet(bu, state.sb);
    if (bbPlayer) postBet(bbPlayer, state.bb);
  } else {
    if (sbPlayer) postBet(sbPlayer, state.sb);
    if (bbPlayer) postBet(bbPlayer, state.bb);
  }
  state.currentBet = state.bb;

  const queue = buildActionQueue('preflop');
  state.betRound = { street: 'preflop', queue, qIndex: 0, lastRaiserIdx: null, lastRaiseSize: state.bb, history: [] };
  state.step = 'preflop';
  render();
}

function postBet(player, amount) {
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

function buildActionQueue(street) {
  const inHand = state.players.filter(p => p.inHand && !p.folded && !p.allin);
  if (inHand.length === 0) return [];
  let startIdx;
  const n = state.numPlayers;
  if (street === 'preflop') {
    if (n === 2) {
      startIdx = state.players.findIndex(p => p.pos === 'BU');
    } else {
      const bbIdx = state.players.findIndex(p => p.pos === 'BB');
      startIdx = (bbIdx + 1) % n;
    }
  } else {
    const buIdx = state.players.findIndex(p => p.pos === 'BU');
    startIdx = (buIdx + 1) % n;
  }
  const queue = [];
  for (let i = 0; i < n; i++) {
    const idx = (startIdx + i) % n;
    const p = state.players[idx];
    if (p.inHand && !p.folded && !p.allin) queue.push(idx);
  }
  return queue;
}

/* ---------- Action handler ---------- */
function doAction(player, action, totalBet = null) {
  const br = state.betRound;
  if (!br) return;

  const snapshot = JSON.parse(JSON.stringify({
    players: state.players,
    pot: state.pot,
    currentBet: state.currentBet,
    qIndex: br.qIndex,
    queue: br.queue,
    lastRaiserIdx: br.lastRaiserIdx,
    lastRaiseSize: br.lastRaiseSize,
    step: state.step,
    board: state.board
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
      player.stack -= actual;
      player.currentBet += actual;
      player.totalBet += actual;
      state.pot += actual;
      if (player.stack === 0) player.allin = true;
    } else {
      player.currentBet = totalBet;
      player.totalBet += additional;
      state.pot += additional;
    }
    const prevBet = state.currentBet;
    state.currentBet = Math.max(state.currentBet, player.currentBet);
    // V8: track raise size for re-raise minimum
    const raiseSize = state.currentBet - prevBet;
    if (raiseSize > 0) br.lastRaiseSize = raiseSize;
    br.lastRaiserIdx = player.idx;
    br.history.push({ idx: player.idx, action: 'raise', amount: totalBet, snapshot });

    // Re-open queue: continue from next clockwise, end when back to raiser
    const newQueue = [];
    const startPos = (state.players.findIndex(pp => pp.idx === player.idx) + 1) % state.numPlayers;
    for (let i = 0; i < state.numPlayers; i++) {
      const idx = (startPos + i) % state.numPlayers;
      const p = state.players[idx];
      if (p.idx === player.idx) break;
      if (p.inHand && !p.folded && !p.allin) newQueue.push(idx);
    }
    br.queue = newQueue;
    br.qIndex = 0;
  } else if (action === 'allin') {
    const additional = totalBet - player.currentBet;
    if (additional <= 0) return;
    if (player.stackKnown && player.stack !== null) {
      const actual = Math.min(additional, player.stack);
      player.stack -= actual;
      player.currentBet += actual;
      player.totalBet += actual;
      state.pot += actual;
      player.allin = true;
    } else {
      player.currentBet = totalBet;
      player.totalBet += additional;
      state.pot += additional;
      player.allin = true;
    }

    // V3 RULE: After an all-in, every remaining active player who has not yet matched OR exceeded
    // the all-in's currentBet must still act (re-open queue), regardless of whether the all-in
    // raised the bet level or not. Players who have ALREADY matched or exceeded the all-in
    // amount should not be re-prompted.
    const allinAmount = player.currentBet;
    if (allinAmount > state.currentBet) {
      const prevBet = state.currentBet;
      state.currentBet = allinAmount;
      // V8: an all-in only "counts" as a full raise if it meets/exceeds the previous raise size.
      // Otherwise, lastRaiseSize stays as it was (so subsequent re-raisers must still meet it).
      const raiseSize = allinAmount - prevBet;
      if (raiseSize >= br.lastRaiseSize) br.lastRaiseSize = raiseSize;
      br.lastRaiserIdx = player.idx;
    }

    // Build new queue: players clockwise after this one, who are active, not folded, not allin,
    // AND whose currentBet < allinAmount (need to act).
    const newQueue = [];
    const startPos = (state.players.findIndex(pp => pp.idx === player.idx) + 1) % state.numPlayers;
    for (let i = 0; i < state.numPlayers; i++) {
      const idx = (startPos + i) % state.numPlayers;
      const p = state.players[idx];
      if (p.idx === player.idx) break;
      if (!p.inHand || p.folded || p.allin) continue;
      if (p.currentBet >= allinAmount) continue; // already matched or exceeded
      newQueue.push(idx);
    }
    br.queue = newQueue;
    br.qIndex = 0;
    br.history.push({ idx: player.idx, action: 'allin', amount: totalBet, snapshot });
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
    render();
    return;
  }

  const stillCanAct = active.filter(p => !p.allin);
  if (stillCanAct.length <= 1 && br.queue.length === 0) {
    skipToShowdown();
    return;
  }

  promptNext();
}

function applySidePotAdjustment() {
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
      p.currentBet -= excess;
      p.totalBet -= excess;
      state.pot -= excess;
      if (p.stackKnown) p.stack += excess;
      if (p.stackKnown && p.stack > 0) p.allin = false;
    }
  });
}

function promptNext() {
  const br = state.betRound;
  if (!br) return;
  if (br.qIndex >= br.queue.length) {
    finishStreet();
    return;
  }
  const idx = br.queue[br.qIndex];
  const player = state.players[idx];
  if (player.folded || !player.inHand || player.allin) {
    br.qIndex++;
    promptNext();
    return;
  }
  if (br.lastRaiserIdx === player.idx && player.currentBet === state.currentBet) {
    finishStreet();
    return;
  }
  render();
}

function goBackOneAction() {
  const br = state.betRound;
  state.raiseShownFor = null;
  state.allinShownFor = null;
  if (!br) {
    // Not in bet round: handle back at other steps
    handleGlobalBack();
    return;
  }
  if (br.history.length === 0) {
    if (br.street === 'preflop') {
      state.players.forEach(p => { p.currentBet = 0; p.totalBet = 0; p.folded = false; p.allin = false; });
      state.pot = 0;
      state.currentBet = 0;
      state.betRound = null;
      state.step = 'setup';
      postBlindsForPreview();
      render();
      return;
    } else {
      const map = { 'flop': 'flop-cards', 'turn': 'turn-cards', 'river': 'river-cards' };
      if (br.street === 'flop') state.board = state.board.slice(0, 0);
      if (br.street === 'turn') state.board = state.board.slice(0, 3);
      if (br.street === 'river') state.board = state.board.slice(0, 4);
      state.players.forEach(p => { p.currentBet = 0; });
      state.currentBet = 0;
      state.betRound = null;
      state.step = map[br.street];
      render();
      promptCardSelection(br.street);
      return;
    }
  }
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

// Bottom-bar back button: handles all steps
function handleGlobalBack() {
  if (state.step === 'setup') {
    // Reset hero / opponents progress
    rebuildPlayers();
    render();
    return;
  }
  if (state.step === 'showdown' || state.step === 'result') {
    // Go back to river bet round (re-create queue without history)
    state.players.forEach(p => {
      p.currentBet = 0; p.handValueLabel = null; p.handScore = null; p.result = null;
      // Keep cards as user entered them (so they don't have to re-enter)
    });
    state.currentBet = 0;
    state.winners = [];
    state.step = 'river-bet';
    state.betRound = { street: 'river', queue: buildActionQueue('river'), qIndex: 0, lastRaiserIdx: null, lastRaiseSize: state.bb, history: [] };
    render();
    return;
  }
  if (state.step.endsWith('-cards')) {
    // Back to previous bet round (same as cards-back button)
    const prevMap = { 'flop-cards': 'preflop', 'turn-cards': 'flop-bet', 'river-cards': 'turn-bet' };
    const prev = prevMap[state.step];
    if (state.step === 'flop-cards') {
      // Back to preflop bet round (re-init)
      state.players.forEach(p => { p.currentBet = 0; });
      state.currentBet = 0;
      state.step = 'preflop';
      // Re-initialize preflop with blinds — simplest: rebuild via startPreflop logic but keep cards.
      // Easier: reset bets, re-post blinds + ante (but we already deducted them; we'd double).
      // Simpler approach: just re-create the bet round from current state without re-posting blinds.
      state.betRound = { street: 'preflop', queue: buildActionQueue('preflop'), qIndex: 0, lastRaiserIdx: null, lastRaiseSize: state.bb, history: [] };
      // Re-establish currentBet from BB
      const bb = state.players.find(p => p.pos === 'BB' && p.inHand);
      const buIdx = state.players.findIndex(p => p.pos === 'BU' && p.inHand);
      if (state.numPlayers === 2 && buIdx >= 0) {
        state.players[buIdx].currentBet = state.sb;
      }
      if (bb) bb.currentBet = state.bb;
      // Pot / stacks are already as left at end of preflop. We need to "undo" the postflop advances.
      // For V3 simplification: the user can still go back further via the inline ← Retour in panel.
      render();
      return;
    } else {
      state.step = prev;
      // Trim board if needed
      if (state.step === 'flop-bet') state.board = state.board.slice(0,3);
      if (state.step === 'turn-bet') state.board = state.board.slice(0,4);
      const street = state.step.replace('-bet','');
      state.players.forEach(p => { p.currentBet = 0; });
      state.currentBet = 0;
      state.betRound = { street, queue: buildActionQueue(street), qIndex: 0, lastRaiserIdx: null, lastRaiseSize: state.bb, history: [] };
      render();
      return;
    }
  }
}

/* ---------- Street transitions ---------- */
function finishStreet() {
  const br = state.betRound;
  state.players.forEach(p => { p.currentBet = 0; });
  state.currentBet = 0;

  const active = getActivePlayers();
  if (active.length === 1) {
    state.step = 'result';
    active[0].result = 'win';
    active[0].handValueLabel = 'Gagne sans abattage';
    state.winners = [{ pos: active[0].pos, share: state.pot }];
    state.finalPotForDisplay = state.pot;
    render();
    return;
  }

  const stillCanAct = active.filter(p => !p.allin);
  if (stillCanAct.length <= 1 && br.street !== 'river') {
    if (br.street === 'preflop') { state.step = 'flop-cards'; render(); promptCardSelection('flop', true); return; }
    if (br.street === 'flop')    { state.step = 'turn-cards'; render(); promptCardSelection('turn', true); return; }
    if (br.street === 'turn')    { state.step = 'river-cards'; render(); promptCardSelection('river', true); return; }
  }

  if (br.street === 'preflop') {
    state.step = 'flop-cards'; render(); promptCardSelection('flop');
  } else if (br.street === 'flop') {
    state.step = 'turn-cards'; render(); promptCardSelection('turn');
  } else if (br.street === 'turn') {
    state.step = 'river-cards'; render(); promptCardSelection('river');
  } else if (br.street === 'river') {
    state.step = 'showdown'; render(); promptShowdown();
  }
}

function skipToShowdown() {
  const br = state.betRound;
  if (!br) return;
  state.players.forEach(p => { p.currentBet = 0; });
  state.currentBet = 0;
  const street = br.street;
  if (street === 'preflop') { state.step = 'flop-cards'; render(); promptCardSelection('flop', true); }
  else if (street === 'flop') { state.step = 'turn-cards'; render(); promptCardSelection('turn', true); }
  else if (street === 'turn') { state.step = 'river-cards'; render(); promptCardSelection('river', true); }
  else { state.step = 'showdown'; render(); promptShowdown(); }
}

function promptCardSelection(street, autoMode = false) {
  const count = street === 'flop' ? 3 : 1;
  let selected = [];
  const html = `
    <div class="modal-title">${street.toUpperCase()}</div>
    <div class="modal-subtitle">Sélectionne ${count} carte${count>1?'s':''} du board${autoMode ? ' — joueurs all-in' : ''}</div>
    <div class="card-picker-status" id="cp-status"></div>
    <div class="card-picker" id="card-picker"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cards-back">← Retour</button>
      <button class="btn btn-primary" id="cards-ok" disabled>Valider</button>
    </div>
  `;
  showModal(html, {
    onMount: () => {
      buildCardPicker([], count, (cards) => {
        selected = cards;
        $('cards-ok').disabled = cards.length !== count;
      });
      $('cards-back').addEventListener('click', () => {
        closeModal();
        if (street === 'flop') {
          state.players.forEach(p => { p.currentBet = 0; p.totalBet = 0; p.folded = false; p.allin = false; });
          state.pot = 0; state.currentBet = 0;
          state.step = 'setup';
          postBlindsForPreview();
          render();
        } else {
          const prevMap = { 'turn': 'flop', 'river': 'turn' };
          const prev = prevMap[street];
          if (prev === 'flop') state.board = state.board.slice(0,0);
          else if (prev === 'turn') state.board = state.board.slice(0,3);
          state.players.forEach(p => { p.currentBet = 0; });
          state.currentBet = 0;
          state.step = prev + '-bet';
          state.betRound = { street: prev, queue: buildActionQueue(prev), qIndex: 0, lastRaiserIdx: null, lastRaiseSize: state.bb, history: [] };
          render();
        }
      });
      $('cards-ok').addEventListener('click', () => {
        state.board.push(...selected);
        closeModal();
        if (autoMode) {
          if (street === 'flop')  { state.step = 'turn-cards'; render(); promptCardSelection('turn', true); }
          else if (street === 'turn') { state.step = 'river-cards'; render(); promptCardSelection('river', true); }
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

/* ---------- Showdown ---------- */
function promptShowdown() {
  const opponents = getActivePlayers().filter(p => p.idx !== state.heroIdx);
  if (opponents.length === 0) { finishHand(); return; }
  showdownIterator(opponents, 0);
}
function showdownIterator(list, i) {
  if (i >= list.length) { finishHand(); return; }
  openShowdownCardModal(list[i].idx, () => showdownIterator(list, i + 1));
}
function openShowdownCardModal(idx, onDone) {
  const p = state.players[idx];
  let selected = [...p.cards];
  const html = `
    <div class="modal-title">Cartes — ${p.pos}</div>
    <div class="modal-subtitle">0, 1 ou 2 cartes (N/C si inconnues)</div>
    <div class="card-picker-status" id="cp-status"></div>
    <div class="card-picker" id="card-picker"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="show-nc">N/C</button>
      <button class="btn btn-primary" id="show-ok">Valider</button>
    </div>
  `;
  showModal(html, {
    onMount: () => {
      buildCardPicker(selected, 2, (cards) => { selected = cards; }, true);
      $('show-nc').addEventListener('click', () => {
        p.cards = []; closeModal(); render(); if (onDone) onDone();
      });
      $('show-ok').addEventListener('click', () => {
        p.cards = selected; closeModal(); render(); if (onDone) onDone();
      });
    }
  });
}

/* ---------- Hand evaluator ---------- */
function evaluateHand(cards) {
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
  const groupedRanks = Object.entries(counts).map(([r,c]) => ({r: parseInt(r), c}))
    .sort((a,b) => b.c - a.c || b.r - a.r);

  let cat = 0, tieBreak = [];
  if (isStraight && isFlush && straightHigh === 14) { cat = 9; tieBreak = [14]; }
  else if (isStraight && isFlush) { cat = 8; tieBreak = [straightHigh]; }
  else if (countVals[0] === 4) { cat = 7; tieBreak = [groupedRanks[0].r, groupedRanks[1].r]; }
  else if (countVals[0] === 3 && countVals[1] === 2) { cat = 6; tieBreak = [groupedRanks[0].r, groupedRanks[1].r]; }
  else if (isFlush) { cat = 5; tieBreak = ranks; }
  else if (isStraight) { cat = 4; tieBreak = [straightHigh]; }
  else if (countVals[0] === 3) {
    cat = 3;
    const three = groupedRanks[0].r;
    const kickers = ranks.filter(r => r !== three);
    tieBreak = [three, ...kickers];
  }
  else if (countVals[0] === 2 && countVals[1] === 2) {
    cat = 2;
    const pairs = [groupedRanks[0].r, groupedRanks[1].r].sort((a,b)=>b-a);
    const kicker = groupedRanks[2].r;
    tieBreak = [...pairs, kicker];
  }
  else if (countVals[0] === 2) {
    cat = 1;
    const pair = groupedRanks[0].r;
    const kickers = ranks.filter(r => r !== pair);
    tieBreak = [pair, ...kickers];
  }
  else { cat = 0; tieBreak = ranks; }

  let score = cat * 1e10, mult = 1e8;
  for (const t of tieBreak) { score += t * mult; mult /= 100; }
  return { score, cat, label: HAND_RANK_LABELS[cat] };
}

/* ---------- Finish hand ---------- */
function finishHand() {
  state.step = 'result';
  const active = getActivePlayers();
  const evaluated = [];
  for (const p of active) {
    if (p.cards.length === 2) {
      const all = [...p.cards, ...state.board];
      const ev = evaluateHand(all);
      p.handScore = ev.score;
      p.handValueLabel = ev.label;
      evaluated.push(p);
    } else {
      p.handScore = null;
      p.result = 'lose';
      p.handValueLabel = null;
    }
  }

  let winnersList = [];
  if (evaluated.length === 1) {
    evaluated[0].result = 'win';
    winnersList = [evaluated[0]];
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

  // Compute share
  state.finalPotForDisplay = state.pot;
  if (winnersList.length > 0) {
    const share = state.pot / winnersList.length;
    state.winners = winnersList.map(p => ({ pos: p.pos, share }));
  } else {
    state.winners = [];
  }

  render();
}

/* ---------- BINDINGS ---------- */
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
$('sb-input').addEventListener('input', (e) => {
  state.sb = Math.max(0, parseInt(e.target.value) || 0);
  state.sbManual = true; // V10: editing SB unlinks it from BB
  if (state.step === 'setup') postBlindsForPreview();
  render();
});
$('bb-input').addEventListener('input', (e) => {
  state.bb = Math.max(1, parseInt(e.target.value) || 1);
  // V10: BB-driven SB sync — SB = BB/2 unless user has overridden SB
  if (!state.sbManual) {
    state.sb = Math.floor(state.bb / 2);
  }
  if (state.step === 'setup') postBlindsForPreview();
  render();
});

// V10.2 — Android: bind Enter on numeric keypads to validate+close keyboard.
// On <input type="number">, the Android numeric keypad shows a "Done"/return key
// that fires keydown 'Enter'. We catch it, optionally click the modal's confirm
// button, then blur the input to dismiss the on-screen keyboard.
function bindEnterToValidate(inputId, validateBtnId) {
  const input = $(inputId);
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (validateBtnId) {
      const btn = $(validateBtnId);
      if (btn && !btn.disabled) btn.click();
    }
    input.blur(); // closes the Android numeric keypad
  });
}
// Header blinds: no confirm button, Enter just commits the live value and closes the keyboard
bindEnterToValidate('sb-input', null);
bindEnterToValidate('bb-input', null);

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
  // Toggling BB/Ante also enables ante automatically
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

$('unit-switch').addEventListener('click', () => {
  state.stackUnit = state.stackUnit === 'chips' ? 'bb' : 'chips';
  render();
});

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
  // V4 fix: native confirm() can be blocked/unreliable; use in-app modal
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
        // Full reset: state defaults + rebuild players
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

// V10.1 — fix Android Chrome: virtual keyboard fires `resize`, which used to
// re-render the action panel and destroy the focused input mid-typing.
// We (a) debounce resize, (b) skip it entirely while a typing input is focused,
// and (c) skip it on small height deltas typical of the on-screen keyboard.
let _resizeTO = null;
let _lastVPHeight = window.innerHeight;
window.addEventListener('resize', () => {
  const ae = document.activeElement;
  const typing = ae && ae.tagName === 'INPUT' &&
    (ae.id === 'ap-raise-input' || ae.id === 'ap-allin-input' ||
     ae.id === 'sb-input' || ae.id === 'bb-input' || ae.id === 'ante-input');
  // Heuristic: if only height changed (keyboard show/hide), skip the re-render
  // when typing is active in any input field.
  const heightDelta = Math.abs(window.innerHeight - _lastVPHeight);
  _lastVPHeight = window.innerHeight;
  if (typing) return; // never tear down a focused input
  if (heightDelta > 0 && document.activeElement && document.activeElement.tagName === 'INPUT') return;
  clearTimeout(_resizeTO);
  _resizeTO = setTimeout(() => render(), 150);
});

/* ---------- Init ---------- */
rebuildPlayers();
render();
