// ─────────────────────────────────────────────
//  game.js  —  게임 로직 & 캔버스 렌더링
// ─────────────────────────────────────────────

// ── STATE ──
const TILE = 48;
const COLS = 24, ROWS = 15;
let camX = 0, camY = 0;
let playerX = 3, playerY = 8;
let keys = {};
let gameRunning = false;
let atDesk = false;
let clockMin = 0, clockHour = 9;
let lastTime = 0;
let moveAccum = 0;
let currentEmail = null;
let selectedNpc = null;
let npcDialogueOpen = false;

// ── ROUND STATE ──
let currentRound = 1;
const ROUND_DURATION_REAL = 7 * 60; // 7분 (실제 서비스: 30 * 60)
let roundTimeLeft = ROUND_DURATION_REAL;
let roundTimerInterval = null;
let roundActive = false;
let actionLog = [];
let roundScores = [];

function logAction(type, detail, score = 0, extra = {}) {
  actionLog.push({ type, detail, score, extra, time: ROUND_DURATION_REAL - roundTimeLeft, round: currentRound });
}

// ── MAP ──
// 0=floor, 1=wall, 2=playerDesk, 3=npcDesk, 4=window, 5=plant, 6=printer, 7=meetingTable, 8=whiteboard, 9=sofa
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,3,3,0,0,3,3,0,0,3,3,0,0,4,4,4,0,0,5,0,0,0,1],
  [1,0,3,3,0,0,3,3,0,0,3,3,0,0,4,4,4,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,7,7,7,7,7,0,0,0,0,0,0,8,8,0,0,0,0,0,0,1],
  [1,0,0,0,7,7,7,7,7,0,0,0,0,0,0,8,8,0,6,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,2,2,0,0,3,3,0,0,3,3,0,0,3,3,0,0,5,0,0,0,0,1],
  [1,0,2,2,0,0,3,3,0,0,3,3,0,0,3,3,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,9,9,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// ── NPC 초기화 (npc.js에서 정보 가져옴) ──
let NPCS = [];

function initNPCs() {
  NPCS = NPC_INFO.map(info => ({
    ...info,
    lines: [] // 레거시용 빈 배열
  }));
}

// ── DYNAMIC DATA ──
let EMAILS = [];
let TASKS  = { todo:[], progress:[], done:[] };

// ── CANVAS ──
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── TILE COLORS ──
const TILE_COLORS = {
  0: '#dde2e8', 1: '#8b95a1',
  2: '#bfdbfe', 3: '#f0f2f4',
  4: '#bae6fd', 5: '#bbf7d0',
  6: '#e5e7eb', 7: '#fef3c7',
  8: '#f0fdf4', 9: '#fef9c3',
};

// ── MAIN LOOP ──
function drawGame(ts) {
  if (!gameRunning) return;
  const dt = ts - lastTime; lastTime = ts;

  moveAccum += dt;
  if (moveAccum > 20000) { moveAccum -= 20000; clockMin += 20; if (clockMin >= 60) { clockMin -= 60; clockHour++; } updateClock(); }

  if (!npcDialogueOpen) {
    const speed = 0.075;
    let nx = playerX, ny = playerY;
    if (keys['w'] || keys['arrowup'])    ny -= speed * dt / 16;
    if (keys['s'] || keys['arrowdown'])  ny += speed * dt / 16;
    if (keys['a'] || keys['arrowleft'])  nx -= speed * dt / 16;
    if (keys['d'] || keys['arrowright']) nx += speed * dt / 16;
    const ti = Math.floor(nx), tj = Math.floor(ny);
    if (ti >= 0 && ti < COLS && tj >= 0 && tj < ROWS && MAP[tj][ti] === 0) {
      playerX = nx; playerY = ny;
    }
  }

  camX = playerX - canvas.width  / 2 / TILE;
  camY = playerY - canvas.height / 2 / TILE;

  ctx.fillStyle = '#c8cfd6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const sx = (c - camX) * TILE, sy = (r - camY) * TILE;
      const t = MAP[r][c];
      ctx.fillStyle = TILE_COLORS[t] || '#ccc';
      ctx.fillRect(sx, sy, TILE, TILE);
      drawTileDetail(ctx, t, sx, sy);
    }
  }

  // 햇빛 효과
  ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = '#fef9c3';
  for (let c = 14; c <= 16; c++) for (let r = 2; r <= 3; r++) {
    const sx = (c - camX) * TILE, sy = (r - camY) * TILE;
    ctx.beginPath();
    ctx.moveTo(sx, sy+TILE); ctx.lineTo(sx+TILE, sy+TILE);
    ctx.lineTo(sx+TILE*4, sy+TILE*9); ctx.lineTo(sx-TILE*3, sy+TILE*9);
    ctx.fill();
  }
  ctx.restore();

  drawNPCs(); drawPlayer();

  // Proximity hint
  let nearText = '';
  const distDesk = Math.hypot(playerX - 2 - 1, playerY - 8 - 1);
  if (distDesk < 2.5) nearText = '[ E ] 자리에 앉기';
  NPCS.forEach(npc => {
    if (Math.hypot(playerX - npc.x, playerY - npc.y) < 2.8) nearText = `[ E ] ${npc.name}에게 말 걸기`;
  });
  document.getElementById('nearHint').textContent = nearText;

  requestAnimationFrame(drawGame);
}

function drawTileDetail(ctx, t, sx, sy) {
  if (t === 0) {
    ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(sx, sy, TILE, TILE);
  }
  if (t === 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(sx, sy, TILE, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(sx, sy, 4, TILE);
  }
  if (t === 2) {
    ctx.fillStyle = '#93c5fd'; ctx.fillRect(sx+3, sy+4, TILE-6, TILE-7);
    ctx.fillStyle = '#1e40af'; ctx.fillRect(sx+9, sy+7, TILE-18, 14);
    ctx.fillStyle = '#dbeafe'; ctx.fillRect(sx+11, sy+9, TILE-22, 10);
    ctx.fillStyle = '#60a5fa'; ctx.fillRect(sx+8, sy+TILE-14, TILE-16, 5);
  }
  if (t === 3) {
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(sx+3, sy+4, TILE-6, TILE-7);
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(sx+9, sy+7, TILE-18, 14);
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(sx+11, sy+9, TILE-22, 10);
  }
  if (t === 4) {
    ctx.fillStyle = '#7dd3fc'; ctx.fillRect(sx+3, sy+3, TILE-6, TILE-6);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
    ctx.strokeRect(sx+5, sy+5, TILE-10, TILE-10);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx+TILE/2, sy+5); ctx.lineTo(sx+TILE/2, sy+TILE-5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx+5, sy+TILE/2); ctx.lineTo(sx+TILE-5, sy+TILE/2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,253,180,0.12)'; ctx.fillRect(sx, sy, TILE, TILE);
  }
  if (t === 5) {
    ctx.fillStyle = '#166534'; ctx.beginPath(); ctx.arc(sx+TILE/2, sy+TILE/2-5, TILE/3+2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.arc(sx+TILE/2-7, sy+TILE/2-3, TILE/4+1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx+TILE/2+7, sy+TILE/2-3, TILE/4+1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#713f12'; ctx.fillRect(sx+TILE/2-4, sy+TILE/2+3, 8, 12);
    ctx.fillStyle = '#854d0e'; ctx.fillRect(sx+TILE/2-6, sy+TILE-10, 12, 8);
  }
  if (t === 6) {
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(sx+5, sy+6, TILE-10, TILE-12);
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(sx+7, sy+8, TILE-14, 9);
    ctx.fillStyle = '#60a5fa'; ctx.fillRect(sx+9, sy+10, 7, 5);
    ctx.fillStyle = '#86efac'; ctx.beginPath(); ctx.arc(sx+TILE-10, sy+TILE-12, 4, 0, Math.PI*2); ctx.fill();
  }
  if (t === 7) {
    ctx.fillStyle = '#fef3c7'; ctx.fillRect(sx+3, sy+4, TILE-6, TILE-8);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5;
    ctx.strokeRect(sx+5, sy+6, TILE-10, TILE-12);
    ctx.fillStyle = '#fde68a'; ctx.fillRect(sx+10, sy+TILE-14, 6, 6);
    ctx.fillRect(sx+TILE-16, sy+TILE-14, 6, 6);
  }
  if (t === 8) {
    ctx.fillStyle = '#f0fdf4'; ctx.fillRect(sx+2, sy+3, TILE-4, TILE-6);
    ctx.strokeStyle = '#86efac'; ctx.lineWidth = 1.5;
    ctx.strokeRect(sx+4, sy+5, TILE-8, TILE-10);
    ctx.fillStyle = '#16a34a'; ctx.fillRect(sx+8, sy+10, TILE-16, 2);
    ctx.fillRect(sx+8, sy+16, TILE*0.6, 2);
  }
  if (t === 9) {
    ctx.fillStyle = '#fefce8'; ctx.fillRect(sx+3, sy+8, TILE-6, TILE-11);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(sx+2, sy+10, 5, TILE-13);
    ctx.fillRect(sx+TILE-7, sy+10, 5, TILE-13);
  }
}

function drawNPCs() {
  NPCS.forEach(npc => {
    const sx = (npc.x + 0.5 - camX) * TILE, sy = (npc.y + 0.5 - camY) * TILE;
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.ellipse(sx, sy+17, 12, 5, 0, 0, Math.PI*2); ctx.fill();
    // 몸통
    ctx.fillStyle = npc.color;
    ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.stroke();
    // 아바타 이모지
    ctx.font = '14px serif'; ctx.textAlign = 'center';
    ctx.fillText(npc.avatar || '👤', sx, sy + 5);
    // 이름 배지
    ctx.font = '500 10px Noto Sans KR'; ctx.textAlign = 'center';
    const nw = ctx.measureText(npc.name).width + 12;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.roundRect(sx - nw/2, sy+19, nw, 17, 5); ctx.fill();
    ctx.fillStyle = '#1f2937';
    ctx.fillText(npc.name, sx, sy+31);
    // 대화 가능 표시
    if (Math.hypot(playerX - npc.x, playerY - npc.y) < 2.8) {
      ctx.fillStyle = '#2563eb';
      ctx.beginPath(); ctx.arc(sx, sy-18, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif';
      ctx.fillText('!', sx, sy-15);
    }
  });
}

function drawPlayer() {
  const px = (playerX + 0.5 - camX) * TILE, py = (playerY + 0.5 - camY) * TILE;
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath(); ctx.ellipse(px, py+17, 12, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#2563eb';
  ctx.beginPath(); ctx.arc(px, py, 15, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Noto Sans KR'; ctx.textAlign = 'center';
  ctx.fillText('나', px, py+4);
  const pw = ctx.measureText(COMPANY.playerName).width + 14;
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath(); ctx.roundRect(px - pw/2, py+19, pw, 18, 5); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 10px Noto Sans KR';
  ctx.fillText(COMPANY.playerName, px, py+32);
}

// ── CLOCK ──
function updateClock() {
  const h = String(clockHour).padStart(2,'0'), m = String(clockMin).padStart(2,'0');
  const rd = ROUND_DATA[currentRound];
  document.getElementById('dayBadge').textContent = `${rd?.dayLabel || 'DAY'} ${h}:${m}`;
  document.getElementById('deskClock').textContent = `${h}:${m}`;
}

// ── ROUND TIMER ──
function startRoundTimer() {
  roundTimeLeft = ROUND_DURATION_REAL;
  roundActive = true;
  updateTimerDisplay();
  roundTimerInterval = setInterval(() => {
    roundTimeLeft--;
    updateTimerDisplay();
    const elapsed = ROUND_DURATION_REAL - roundTimeLeft;
    const rd = ROUND_DATA[currentRound];
    clockHour = rd.startHour + Math.floor(elapsed / 60);
    clockMin  = elapsed % 60;
    updateClock();
    if (roundTimeLeft <= 60 && roundTimeLeft > 0) {
      document.getElementById('timerBarFill').style.background = '#dc2626';
      if (roundTimeLeft % 15 === 0) showNotif(`⏰ ${roundTimeLeft}초 남았습니다!`);
    }
    if (roundTimeLeft <= 0) endRound();
  }, 1000);
}

function updateTimerDisplay() {
  const m = String(Math.floor(roundTimeLeft / 60)).padStart(2,'0');
  const s = String(roundTimeLeft % 60).padStart(2,'0');
  const el = document.getElementById('roundTimer');
  if (el) el.textContent = `${m}:${s}`;
  const pct = (roundTimeLeft / ROUND_DURATION_REAL) * 100;
  const bar = document.getElementById('timerBarFill');
  if (bar) {
    bar.style.width = pct + '%';
    if (pct > 50) bar.style.background = '#16a34a';
    else if (pct > 25) bar.style.background = '#d97706';
    else bar.style.background = '#dc2626';
  }
}

function endRound() {
  clearInterval(roundTimerInterval);
  roundActive = false;
  if (atDesk) exitDesk();
  gameRunning = false;
  showRoundEvaluation();
}

// ── ROUND LOADING ──
function loadRound(round) {
  const rd = ROUND_DATA[round];
  EMAILS = rd.emails.map(e => ({ ...e }));
  TASKS  = JSON.parse(JSON.stringify(rd.tasks));
  actionLog = actionLog.filter(a => a.round < round);
  playerX = 3; playerY = 8;
  clockHour = rd.startHour; clockMin = 0;
  updateClock();

  // NPC 대화 상태 초기화
  NPC_INFO.forEach(n => { npcStates[n.id] = { talked: false, mood: 'neutral', history: [] }; });

  document.getElementById('roundBadge').textContent  = rd.label;
  document.getElementById('roundBadge').style.background = rd.color;
  document.getElementById('timerBarFill').style.background = '#16a34a';

  showRoundIntro(round);
}

function showRoundIntro(round) {
  const rd = ROUND_DATA[round];
  document.getElementById('roundIntroTitle').textContent   = rd.label;
  document.getElementById('roundIntroDay').textContent     = `${rd.dayLabel} · 난이도: ${rd.difficulty}`;
  document.getElementById('roundIntroDiff').textContent    = `난이도: ${rd.difficulty}`;
  document.getElementById('roundIntroDiff').style.background = rd.color;
  document.getElementById('roundIntroBriefing').textContent = rd.briefing;
  document.getElementById('roundIntroTasks').innerHTML = rd.emails.filter(e => e.required).map(e =>
    `<div class="round-task-item">${e.subject}</div>`).join('');
  document.getElementById('roundIntro').classList.add('active');
}

function closeRoundIntro() {
  document.getElementById('roundIntro').classList.remove('active');
  gameRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(drawGame);
  startRoundTimer();
  showNotif(`${ROUND_DATA[currentRound].label} 시작!`);
}

function startNextRound() {
  currentRound++;
  document.getElementById('evalOverlay').classList.remove('active');
  loadRound(currentRound);
}

// ── INPUT ──
document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'e' && !atDesk && gameRunning && !npcDialogueOpen) interact();
  if (e.key === 'Escape' && npcDialogueOpen) closeNpcDialogue();
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function interact() {
  const distDesk = Math.hypot(playerX - 2 - 1, playerY - 8 - 1);
  if (distDesk < 2.5) { sitAtDesk(); return; }
  NPCS.forEach(npc => {
    if (Math.hypot(playerX - npc.x, playerY - npc.y) < 2.8) openNpcDialogue(npc);
  });
}

// ── NPC 대화 시스템 ──
function openNpcDialogue(npc) {
  const dialogue = getNpcDialogue(npc.id, currentRound);
  if (!dialogue) {
    showNotif(`${npc.name}: 지금은 바빠요.`);
    return;
  }
  selectedNpc = npc;
  npcDialogueOpen = true;

  const bubble = document.getElementById('bubble');
  bubble.style.display = 'block';

  // 화면 위치 계산
  const sx = (npc.x + 0.5 - camX) * TILE;
  const sy = (npc.y + 0.5 - camY) * TILE;
  bubble.style.left = Math.min(Math.max(sx - 140, 10), window.innerWidth - 320) + 'px';
  bubble.style.top  = Math.max(sy - 200, 10) + 'px';

  // 헤더
  document.getElementById('bubbleAvatar').textContent   = npc.avatar || '👤';
  document.getElementById('bubbleAvatar').style.background = npc.color + '22';
  document.getElementById('bubbleNpcName').textContent  = npc.name;
  document.getElementById('bubbleNpcName').style.color  = npc.color;
  document.getElementById('bubbleNpcRole').textContent  = npc.role;

  // 대화 내용 — 여러 줄 순차적으로 표시
  showDialogueLines(dialogue, 0);
}

let dialogueQueue = [];
let currentDialogue = null;

function showDialogueLines(dialogue, lineIdx) {
  currentDialogue = dialogue;
  const allLines = [dialogue.opening, ...(dialogue.lines || [])];

  if (lineIdx < allLines.length) {
    document.getElementById('bubbleText').textContent = allLines[lineIdx];
    document.getElementById('bubbleChoices').innerHTML = '';

    if (lineIdx < allLines.length - 1) {
      // 다음 줄 버튼
      const nextBtn = document.createElement('button');
      nextBtn.className = 'bubble-choice';
      nextBtn.textContent = '계속 →';
      nextBtn.onclick = () => showDialogueLines(dialogue, lineIdx + 1);
      document.getElementById('bubbleChoices').appendChild(nextBtn);
    } else {
      // 마지막 줄 — 선택지 표시
      if (dialogue.choices && dialogue.choices.length > 0) {
        dialogue.choices.forEach((choice, idx) => {
          const btn = document.createElement('button');
          btn.className = 'bubble-choice';
          btn.textContent = choice.text;
          btn.onclick = () => handleNpcChoice(dialogue, idx, choice);
          document.getElementById('bubbleChoices').appendChild(btn);
        });
      } else {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'bubble-choice';
        closeBtn.textContent = '알겠어요.';
        closeBtn.onclick = closeNpcDialogue;
        document.getElementById('bubbleChoices').appendChild(closeBtn);
      }
    }
  }
}

function handleNpcChoice(dialogue, choiceIdx, choice) {
  recordNpcTalk(selectedNpc.id, dialogue.id, choiceIdx);

  document.getElementById('bubbleText').textContent = choice.response;
  document.getElementById('bubbleChoices').innerHTML = '';

  // 결과에 따라 NPC 상태 업데이트
  if (npcStates[selectedNpc.id]) {
    npcStates[selectedNpc.id].mood = choice.mood || 'neutral';
  }

  // 갈등 결과 처리
  if (choice.consequence) handleConsequence(choice.consequence);

  // 닫기 버튼
  const closeBtn = document.createElement('button');
  closeBtn.className = 'bubble-choice';
  closeBtn.textContent = '대화 종료';
  closeBtn.onclick = closeNpcDialogue;
  document.getElementById('bubbleChoices').appendChild(closeBtn);
}

function closeNpcDialogue() {
  document.getElementById('bubble').style.display = 'none';
  npcDialogueOpen = false;
  selectedNpc = null;
}

function handleConsequence(consequence) {
  if (consequence === 'choi_conflict_escalated') {
    setTimeout(() => showNotif('⚠️ 최현우 과장과의 관계가 악화됐습니다.'), 500);
  }
  if (consequence === 'choi_takes_over') {
    setTimeout(() => showNotif('⚠️ 개발팀이 독자적으로 결정을 내렸습니다.'), 500);
  }
}

// ── DESK ──
function sitAtDesk() {
  atDesk = true;
  document.getElementById('deskMode').classList.add('active');
  initDesk();
}

function exitDesk() {
  atDesk = false;
  document.getElementById('deskMode').classList.remove('active');
}

function initDesk() {
  renderEmails();
  renderTasks();
  drawChart();
  updateReportGuide();
  switchTab('email');
}

// ── EMAIL ──
function renderEmails() {
  const list = document.getElementById('emailList');
  const unreadCount = EMAILS.filter(e => e.unread).length;
  document.getElementById('unreadBadge').textContent = unreadCount;
  document.getElementById('unreadBadge').style.display = unreadCount > 0 ? 'block' : 'none';

  list.innerHTML = '';
  EMAILS.forEach(em => {
    const d = document.createElement('div');
    const priorityClass = em.priority === 'critical' ? 'email-priority-critical' : em.priority === 'high' ? 'email-priority-high' : '';
    d.className = `email-item ${em.unread ? 'unread' : ''} ${priorityClass}`;
    const priorityIcon = em.priority === 'critical' ? '🚨 ' : em.priority === 'high' ? '❗ ' : '';
    d.innerHTML = `
      <div class="email-from">
        ${em.unread ? '<span class="email-dot"></span>' : ''}
        ${em.from.split('<')[0].trim()}
      </div>
      <div class="email-subject">${priorityIcon}${em.subject}</div>
      <div class="email-time">${em.time}</div>`;
    d.onclick = () => openEmail(em);
    list.appendChild(d);
  });
}

function openEmail(em) {
  currentEmail = em;
  const wasUnread = em.unread;
  em.unread = false;
  if (wasUnread) logAction('read', em.subject, 5);

  document.getElementById('emailSubjectLine').textContent = em.subject;
  document.getElementById('emailMetaLine').innerHTML = `보낸 사람: ${em.from} &nbsp;|&nbsp; ${em.time}`;
  const body = document.getElementById('emailBody');
  body.style.display = 'block'; body.style.alignItems = ''; body.style.justifyContent = '';
  body.innerHTML = em.body.split('\n').map(l => l ? `<p>${l}</p>` : '<p>&nbsp;</p>').join('');
  document.getElementById('replyArea').style.display = 'block';
  document.getElementById('replyInput').value = '';
  renderEmails();
  setTimeout(() => {
    document.querySelectorAll('.email-item').forEach((el, idx) => {
      if (EMAILS[idx] === em) el.classList.add('selected');
    });
  }, 10);
}

function clearReply() { document.getElementById('replyInput').value = ''; }

function sendReply() {
  const text = document.getElementById('replyInput').value.trim();
  if (!text) { showNotif('답장 내용을 입력해주세요.'); return; }
  logAction('reply', text, 20);
  if (actionLog.length) actionLog[actionLog.length - 1].emailId = currentEmail?.id;
  showNotif('✓ 전송 완료');
  document.getElementById('replyInput').value = '';
  if (currentEmail) currentEmail.replied = true;
  renderEmails();
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#screenArea > div').forEach(d => { d.style.display = 'none'; d.classList.remove('active'); });
  const tabs = ['email', 'report', 'task'];
  document.querySelectorAll('.tab')[tabs.indexOf(tab)].classList.add('active');
  const apps = ['emailApp', 'reportApp', 'taskApp'];
  const app = document.getElementById(apps[tabs.indexOf(tab)]);
  app.style.display = 'flex'; app.classList.add('active');
}

// ── REPORT ──
function updateReportGuide() {
  const rd = ROUND_DATA[currentRound];
  const guide = document.getElementById('reportGuide');
  if (guide && rd) {
    const guides = {
      1: '팀장 지시 사항: ① CTR/CVR 변동 원인 분석 ② 채널별 ROAS 비교 ③ 6월 예산 재배분 제안 (채널별 금액 + 근거)',
      2: '보고서 목적: 경쟁사 필링스 대응 전략 초안. 위협 수준 분석 → 단기 대응 → 중기 차별화 순서로 작성',
      3: '긴급 보고: SNS 위기 현황 + 대응 방향 + 리스크 분석. 법무팀 지시 준수 (결함 인정 금지)',
    };
    guide.textContent = guides[currentRound] || '';
  }
}

function insertData(text) {
  const ed  = document.getElementById('reportEditor');
  const pos = ed.selectionStart, val = ed.value;
  ed.value = val.slice(0, pos) + text + val.slice(pos);
  ed.focus(); showNotif('데이터 삽입됨');
}

function submitReport() {
  const text = document.getElementById('reportEditor').value.trim();
  if (text.length < 80) { showNotif('보고서를 더 자세히 작성해주세요. (최소 80자)'); return; }
  logAction('report', text, 35);
  showNotif('✓ 보고서 제출 완료 — 라운드 종료 시 피드백을 확인하세요.');
  document.getElementById('reportSubmitBtn').disabled = true;
  document.getElementById('reportSubmitBtn').textContent = '제출 완료 ✓';
  document.getElementById('reportSubmitBtn').style.background = '#16a34a';
}

// ── TASKS ──
function renderTasks() {
  ['todo', 'progress', 'done'].forEach(col => {
    const el = document.getElementById('col-' + col);
    el.innerHTML = '';
    TASKS[col].forEach((task, i) => {
      const card = document.createElement('div');
      card.className = 'kanban-card'; card.draggable = true;
      card.dataset.col = col; card.dataset.idx = i;
      card.innerHTML = `
        <div class="card-title">${task.title}</div>
        <span class="card-tag tag-${task.tag}">${task.tag === 'urgent' ? '🔴 긴급' : task.tag === 'normal' ? '🟡 일반' : '✅ 완료'}</span>
        <div class="card-due">⏰ ${task.due}</div>`;
      el.appendChild(card);
    });
  });
  setupDragDrop();
}

function setupDragDrop() {
  let dragging = null;
  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', () => { dragging = card; });
  });
  ['todo', 'progress', 'done'].forEach(col => {
    const el = document.getElementById('col-' + col);
    el.addEventListener('dragover', e => e.preventDefault());
    el.addEventListener('drop', () => {
      if (!dragging) return;
      const fromCol = dragging.dataset.col, idx = parseInt(dragging.dataset.idx);
      if (fromCol === col) return;
      const task = TASKS[fromCol].splice(idx, 1)[0];
      if (col === 'done') { task.tag = 'done'; logAction('task_done', task.title, 15); }
      TASKS[col].push(task);
      renderTasks();
      showNotif(`"${task.title.slice(0,20)}..." → ${col === 'done' ? '완료' : col}`);
    });
  });
}

// ── CHART ──
function drawChart() {
  const c = document.getElementById('perfChart');
  if (!c) return;
  const ctx2 = c.getContext('2d');
  c.width = c.parentElement.offsetWidth - 32; c.height = 130;
  const labels = ['2월','3월','4월','5월(목표)','5월(실제)'];
  const ctr   = [1.8, 2.1, 2.6, 3.0, 3.2];
  const roas  = [2.8, 3.1, 3.6, 4.0, 4.2];
  const W = c.width, H = c.height, pad = 44;

  ctx2.fillStyle = '#f9fafb'; ctx2.fillRect(0, 0, W, H);

  for (let i = 0; i <= 4; i++) {
    const y = H - pad - (i * (H - 2*pad) / 4);
    ctx2.strokeStyle = 'rgba(0,0,0,0.06)'; ctx2.lineWidth = 1;
    ctx2.beginPath(); ctx2.moveTo(pad, y); ctx2.lineTo(W - pad, y); ctx2.stroke();
    ctx2.fillStyle = '#9ca3af'; ctx2.font = '9px Inter,sans-serif'; ctx2.textAlign = 'right';
    ctx2.fillText((i * 1.5).toFixed(1), pad - 4, y + 3);
  }

  const drawLine = (data, color, max) => {
    ctx2.strokeStyle = color; ctx2.lineWidth = 2.5; ctx2.beginPath();
    data.forEach((v, i) => {
      const x = pad + i*(W-2*pad)/4, y = H-pad-(v/max)*(H-2*pad);
      i === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
    }); ctx2.stroke();
    data.forEach((v, i) => {
      const x = pad + i*(W-2*pad)/4, y = H-pad-(v/max)*(H-2*pad);
      ctx2.fillStyle = color; ctx2.beginPath(); ctx2.arc(x, y, 4, 0, Math.PI*2); ctx2.fill();
      ctx2.fillStyle = '#fff'; ctx2.beginPath(); ctx2.arc(x, y, 2, 0, Math.PI*2); ctx2.fill();
    });
  };
  drawLine(ctr, '#2563eb', 6);
  drawLine(roas, '#16a34a', 6);

  ctx2.fillStyle = '#6b7280'; ctx2.font = '9px Inter,sans-serif'; ctx2.textAlign = 'center';
  labels.forEach((l, i) => ctx2.fillText(l, pad + i*(W-2*pad)/4, H - 6));

  ctx2.fillStyle = '#2563eb'; ctx2.fillRect(pad, 8, 16, 4);
  ctx2.fillStyle = '#374151'; ctx2.textAlign = 'left'; ctx2.font = '10px Inter,sans-serif';
  ctx2.fillText('CTR(%)', pad + 20, 14);
  ctx2.fillStyle = '#16a34a'; ctx2.fillRect(pad + 80, 8, 16, 4);
  ctx2.fillText('ROAS', pad + 100, 14);
}

// ── NOTIFICATION ──
let notifTimer;
function showNotif(msg) {
  const n = document.getElementById('notif');
  n.textContent = msg; n.classList.add('show');
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => n.classList.remove('show'), 2800);
}

// ── START ──
function startGame() {
  document.getElementById('intro').style.display = 'none';
  document.getElementById('gameWrap').classList.add('active');
  document.getElementById('timerUI').classList.add('active');
  initNPCs();
  loadRound(1);
}
