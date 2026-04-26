// ─────────────────────────────────────────────
//  game.js  —  캔버스 렌더링 & 게임 로직
// ─────────────────────────────────────────────

// ── STATE ──
const TILE = 48;
const COLS = 22, ROWS = 14;
let camX = 0, camY = 0;
let playerX = 3, playerY = 7;
let keys = {};
let gameRunning = false;
let atDesk = false;
let clockMin = 0, clockHour = 9;
let lastTime = 0;
let moveAccum = 0;
let bubbleTimer = 0;
let currentEmail = null;
let aiContext = [];

// ── ROUND STATE ──
let currentRound = 1;
const ROUND_DURATION_REAL = 7 * 60; // 7분 (데모용) — 실제 서비스는 30 * 60
let roundTimeLeft = ROUND_DURATION_REAL;
let roundTimerInterval = null;
let roundActive = false;
let actionLog = [];
let roundScores = [];

function logAction(type, detail, score = 0) {
  actionLog.push({ type, detail, score, time: ROUND_DURATION_REAL - roundTimeLeft, round: currentRound });
}

// ── MAP ──
// 0=floor, 1=wall, 2=desk(player), 3=desk(npc), 4=window, 5=plant, 6=printer, 7=meeting_table
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,3,3,0,0,3,3,0,0,3,3,0,0,4,4,0,0,5,0,0,1],
  [1,0,3,3,0,0,3,3,0,0,3,3,0,0,4,4,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,7,7,7,7,0,0,0,0,0,0,0,0,6,0,0,0,0,1],
  [1,0,0,0,7,7,7,7,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,2,2,0,0,3,3,0,0,3,3,0,0,3,3,0,0,5,0,0,1],
  [1,0,2,2,0,0,3,3,0,0,3,3,0,0,3,3,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// ── NPCs ──
const NPCS = [
  { x:2,  y:3, name:'김팀장', role:'마케팅팀장',   lines:[], color:'#f87171' },
  { x:6,  y:3, name:'박대리', role:'데이터분석',    lines:[], color:'#34d399' },
  { x:10, y:3, name:'이인턴', role:'인턴(3개월차)', lines:[], color:'#fbbf24' },
  { x:10, y:8, name:'최과장', role:'기획파트',      lines:[], color:'#a78bfa' },
  { x:14, y:8, name:'정대리', role:'콘텐츠팀',      lines:[], color:'#38bdf8' },
];

// ── DYNAMIC DATA (loaded per round) ──
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
  0: '#e8eaf0', 1: '#9ca3af', 2: '#bfdbfe',
  3: '#f3f4f6', 4: '#bae6fd', 5: '#bbf7d0',
  6: '#e5e7eb', 7: '#fef9c3',
};

// ── MAIN LOOP ──
function drawGame(ts) {
  if (!gameRunning) return;
  const dt = ts - lastTime; lastTime = ts;

  // In-game clock (visual only — real clock driven by round timer)
  moveAccum += dt;
  if (moveAccum > 15000) { moveAccum -= 15000; clockMin += 15; if (clockMin >= 60) { clockMin = 0; clockHour++; } updateClock(); }

  // Movement
  const speed = 0.08;
  let nx = playerX, ny = playerY;
  if (keys['w'] || keys['arrowup'])    ny -= speed * dt / 16;
  if (keys['s'] || keys['arrowdown'])  ny += speed * dt / 16;
  if (keys['a'] || keys['arrowleft'])  nx -= speed * dt / 16;
  if (keys['d'] || keys['arrowright']) nx += speed * dt / 16;

  const ti = Math.floor(nx), tj = Math.floor(ny);
  if (ti >= 0 && ti < COLS && tj >= 0 && tj < ROWS && MAP[tj][ti] === 0) {
    playerX = nx; playerY = ny;
  }

  camX = playerX - canvas.width  / 2 / TILE;
  camY = playerY - canvas.height / 2 / TILE;

  // Clear
  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw tiles
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const sx = (c - camX) * TILE, sy = (r - camY) * TILE;
      const t = MAP[r][c];
      ctx.fillStyle = TILE_COLORS[t] || '#ccc';
      ctx.fillRect(sx, sy, TILE, TILE);

      if (t === 0) {
        ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.5;
        ctx.strokeRect(sx, sy, TILE, TILE);
      }
      if (t === 1) {
        ctx.fillStyle = '#6b7280'; ctx.fillRect(sx, sy, TILE, 4);
        ctx.fillStyle = '#374151'; ctx.fillRect(sx, sy, 3, TILE);
      }
      if (t === 2) {
        ctx.fillStyle = '#93c5fd'; ctx.fillRect(sx+3, sy+3, TILE-6, TILE-6);
        ctx.fillStyle = '#1e40af'; ctx.fillRect(sx+10, sy+8, TILE-20, TILE/3);
        ctx.fillStyle = '#dbeafe'; ctx.fillRect(sx+12, sy+10, TILE-24, TILE/3-4);
        ctx.fillStyle = '#60a5fa'; ctx.fillRect(sx+8, sy+TILE-16, TILE-16, 6);
      }
      if (t === 3) {
        ctx.fillStyle = '#f9fafb'; ctx.fillRect(sx+3, sy+3, TILE-6, TILE-6);
        ctx.fillStyle = '#9ca3af'; ctx.fillRect(sx+10, sy+8, TILE-20, TILE/3);
        ctx.fillStyle = '#e5e7eb'; ctx.fillRect(sx+12, sy+10, TILE-24, TILE/3-4);
      }
      if (t === 4) {
        ctx.fillStyle = '#7dd3fc'; ctx.fillRect(sx+3, sy+3, TILE-6, TILE-6);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.strokeRect(sx+5, sy+5, TILE-10, TILE-10);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.moveTo(sx+TILE/2, sy+5); ctx.lineTo(sx+TILE/2, sy+TILE-5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx+5, sy+TILE/2); ctx.lineTo(sx+TILE-5, sy+TILE/2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,200,0.15)'; ctx.fillRect(sx, sy, TILE, TILE);
      }
      if (t === 5) {
        ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.arc(sx+TILE/2, sy+TILE/2-4, TILE/3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#16a34a';
        ctx.beginPath(); ctx.arc(sx+TILE/2-6, sy+TILE/2-2, TILE/4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx+TILE/2+6, sy+TILE/2-2, TILE/4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#713f12'; ctx.fillRect(sx+TILE/2-4, sy+TILE/2+4, 8, 10);
      }
      if (t === 6) {
        ctx.fillStyle = '#f3f4f6'; ctx.fillRect(sx+4, sy+6, TILE-8, TILE-12);
        ctx.fillStyle = '#d1d5db'; ctx.fillRect(sx+6, sy+8, TILE-12, 8);
        ctx.fillStyle = '#60a5fa'; ctx.fillRect(sx+8, sy+10, 6, 4);
      }
      if (t === 7) {
        ctx.fillStyle = '#fef3c7'; ctx.fillRect(sx+3, sy+3, TILE-6, TILE-6);
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1;
        ctx.strokeRect(sx+4, sy+4, TILE-8, TILE-8);
      }
    }
  }

  // Sunlight rays from windows
  ctx.save(); ctx.globalAlpha = 0.04; ctx.fillStyle = '#fef08a';
  for (let c = 13; c <= 14; c++) for (let r = 2; r <= 3; r++) {
    const sx = (c - camX) * TILE, sy = (r - camY) * TILE;
    ctx.beginPath();
    ctx.moveTo(sx, sy+TILE); ctx.lineTo(sx+TILE, sy+TILE);
    ctx.lineTo(sx+TILE*3, sy+TILE*8); ctx.lineTo(sx-TILE*2, sy+TILE*8);
    ctx.fill();
  }
  ctx.restore();

  // Draw NPCs
  NPCS.forEach(npc => {
    const sx = (npc.x + 0.5 - camX) * TILE, sy = (npc.y + 0.5 - camY) * TILE;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(sx, sy+16, 11, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = npc.color;
    ctx.beginPath(); ctx.arc(sx, sy, 13, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    const nw = ctx.measureText(npc.name).width + 10;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.roundRect(sx - nw/2, sy+18, nw, 16, 4); ctx.fill();
    ctx.fillStyle = '#374151'; ctx.font = '500 10px Noto Sans KR'; ctx.textAlign = 'center';
    ctx.fillText(npc.name, sx, sy+30);
  });

  // Draw player
  const px = (playerX + 0.5 - camX) * TILE, py = (playerY + 0.5 - camY) * TILE;
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); ctx.ellipse(px, py+16, 11, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#2563eb';
  ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Noto Sans KR'; ctx.textAlign = 'center';
  ctx.fillText('나', px, py+4);
  const pw = ctx.measureText('전민서').width + 12;
  ctx.fillStyle = '#2563eb';
  ctx.beginPath(); ctx.roundRect(px - pw/2, py+18, pw, 17, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 10px Noto Sans KR';
  ctx.fillText('전민서', px, py+31);

  // Proximity hint
  let nearText = '';
  const distDesk = Math.hypot(playerX - 2 - 1, playerY - 8 - 1);
  if (distDesk < 2.5) nearText = '[ E ] 자리에 앉기';
  NPCS.forEach(npc => {
    if (Math.hypot(playerX - npc.x, playerY - npc.y) < 2.5) nearText = `[ E ] ${npc.name}에게 말 걸기`;
  });
  document.getElementById('nearHint').textContent = nearText;

  // Bubble timer
  if (bubbleTimer > 0) { bubbleTimer -= dt; if (bubbleTimer <= 0) hideBubble(); }

  requestAnimationFrame(drawGame);
}

// ── CLOCK ──
function updateClock() {
  const h = String(clockHour).padStart(2,'0'), m = String(clockMin).padStart(2,'0');
  document.getElementById('dayBadge').textContent  = `R${currentRound} · ${h}:${m}`;
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
      document.getElementById('timerBar').style.background = '#dc2626';
      if (roundTimeLeft % 10 === 0) showNotif(`⏰ 라운드 종료까지 ${roundTimeLeft}초!`);
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
    bar.style.background = pct > 40 ? '#16a34a' : pct > 20 ? '#d97706' : '#dc2626';
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
  playerX = 3; playerY = 7;
  clockHour = rd.startHour; clockMin = 0;
  updateClock();

  const npcLines = getNpcLines(round);
  NPCS.forEach(npc => { if (npcLines[npc.name]) npc.lines = npcLines[npc.name]; });

  document.getElementById('roundBadge').textContent  = rd.label;
  document.getElementById('roundBadge').style.background = rd.color;
  document.getElementById('timerBar').style.background = '#e5e7eb';

  showRoundIntro(round);
}

function showRoundIntro(round) {
  const rd = ROUND_DATA[round];
  document.getElementById('roundIntroTitle').textContent = rd.label;
  document.getElementById('roundIntroDiff').textContent  = `난이도: ${rd.difficulty}`;
  document.getElementById('roundIntroDiff').style.background = rd.color;
  document.getElementById('roundIntroCtx').textContent  = rd.context;
  document.getElementById('roundIntroTasks').innerHTML  = rd.emails.filter(e => e.required).map(e => `<li>${e.subject}</li>`).join('');
  document.getElementById('roundIntro').style.display   = 'flex';
}

function closeRoundIntro() {
  document.getElementById('roundIntro').style.display = 'none';
  gameRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(drawGame);
  startRoundTimer();
  showNotif(`${ROUND_DATA[currentRound].label} 시작! 7분 안에 모든 과제를 완료하세요.`);
}

function startNextRound() {
  currentRound++;
  document.getElementById('evalOverlay').style.display = 'none';
  loadRound(currentRound);
}

// ── INPUT ──
document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'e' && !atDesk && gameRunning) interact();
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function interact() {
  const distDesk = Math.hypot(playerX - 2 - 1, playerY - 8 - 1);
  if (distDesk < 2.5) { sitAtDesk(); return; }
  NPCS.forEach(npc => {
    if (Math.hypot(playerX - npc.x, playerY - npc.y) < 2.5) showBubble(npc);
  });
}

// ── DESK ──
function sitAtDesk() {
  atDesk = true;
  document.getElementById('deskMode').classList.add('active');
  document.getElementById('aiToggle').classList.add('show');
  initDesk();
}

function exitDesk() {
  atDesk = false;
  document.getElementById('deskMode').classList.remove('active');
  document.getElementById('aiToggle').classList.remove('show');
  document.getElementById('aiPanel').classList.remove('open');
}

function initDesk() {
  renderEmails();
  renderTasks();
  drawChart();
  switchTab('email');
}

// ── EMAIL ──
function renderEmails() {
  const list = document.getElementById('emailList');
  list.innerHTML = '';
  EMAILS.forEach(em => {
    const d = document.createElement('div');
    d.className = 'email-item' + (em.unread ? ' unread' : '');
    d.innerHTML = `<div class="email-from">${em.unread ? '<span class="email-dot"></span>' : ''}${em.from.split('<')[0]}</div><div class="email-subject">${em.subject}</div>`;
    d.onclick = () => openEmail(em);
    list.appendChild(d);
  });
}

function openEmail(em) {
  currentEmail = em;
  const wasUnread = em.unread;
  em.unread = false;
  if (wasUnread) logAction('read', em.subject, 5);
  document.getElementById('emailTitle').textContent = em.subject;
  document.getElementById('emailMeta').innerHTML = `보낸 사람: ${em.from}<br>시간: ${em.time}`;
  const body = document.getElementById('emailBody');
  body.style.display = 'block'; body.style.alignItems = ''; body.style.justifyContent = '';
  body.innerHTML = em.body.split('\n').map(l => l ? `<p>${l}</p>` : '<p>&nbsp;</p>').join('');
  document.getElementById('replyArea').style.display = 'block';
  document.getElementById('replyInput').value = '';
  renderEmails();
  setTimeout(() => {
    const items = document.querySelectorAll('.email-item');
    const idx = EMAILS.indexOf(em);
    if (items[idx]) items[idx].classList.add('selected');
  }, 10);
}

function clearReply() { document.getElementById('replyInput').value = ''; }

function sendReply() {
  const text = document.getElementById('replyInput').value.trim();
  if (!text) { showNotif('답장 내용을 입력해주세요.'); return; }
  logAction('reply', text, 20);
  if (actionLog.length) actionLog[actionLog.length - 1].emailId = currentEmail?.id;
  showNotif('✓ 이메일 전송 완료');
  document.getElementById('replyInput').value = '';
  if (currentEmail) currentEmail.replied = true;
  openAI('email', text);
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#screenArea > div').forEach(d => { d.style.display = 'none'; d.classList.remove('active'); });
  const tabs = ['email', 'report', 'task'];
  const idx  = tabs.indexOf(tab);
  document.querySelectorAll('.tab')[idx].classList.add('active');
  const apps = ['emailApp', 'reportApp', 'taskApp'];
  const app  = document.getElementById(apps[idx]);
  app.style.display = 'flex'; app.classList.add('active');
}

// ── REPORT ──
function insertData(text) {
  const ed  = document.getElementById('reportEditor');
  const pos = ed.selectionStart, val = ed.value;
  ed.value = val.slice(0, pos) + text + val.slice(pos);
  ed.focus(); showNotif('데이터 삽입됨');
}

function submitReport() {
  const text = document.getElementById('reportEditor').value.trim();
  if (text.length < 50) { showNotif('보고서 내용을 더 작성해주세요.'); return; }
  logAction('report', text, 30);
  showNotif('✓ 보고서 제출 완료!');
  openAI('report_submit', text);
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
      card.innerHTML = `<div class="card-title">${task.title}</div><span class="card-tag tag-${task.tag}">${task.tag === 'urgent' ? '🔴 긴급' : task.tag === 'normal' ? '🟡 일반' : '✅ 완료'}</span><div class="card-due">⏰ ${task.due}</div>`;
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
      showNotif(`✓ "${task.title}" → ${col === 'done' ? '완료' : col}`);
    });
  });
}

// ── CHART ──
function drawChart() {
  const c = document.getElementById('perfChart');
  if (!c) return;
  const ctx2 = c.getContext('2d');
  c.width = c.parentElement.offsetWidth - 32; c.height = 120;
  const labels = ['1월','2월','3월','4월','5월'];
  const data   = [2.1, 2.4, 2.8, 3.0, 3.2];
  const data2  = [10.1, 10.8, 11.2, 12.0, 12.4];
  const W = c.width, H = c.height, pad = 40;
  ctx2.fillStyle = '#f9fafb'; ctx2.fillRect(0, 0, W, H);
  for (let i = 0; i < 5; i++) {
    ctx2.strokeStyle = 'rgba(0,0,0,0.06)'; ctx2.lineWidth = 1;
    ctx2.beginPath(); ctx2.moveTo(pad, H-pad-(i*(H-2*pad)/4)); ctx2.lineTo(W-pad, H-pad-(i*(H-2*pad)/4)); ctx2.stroke();
  }
  const drawLine = (d, color, max) => {
    ctx2.strokeStyle = color; ctx2.lineWidth = 2.5; ctx2.beginPath();
    d.forEach((v, i) => { const x=pad+i*(W-2*pad)/4, y=H-pad-(v/max)*(H-2*pad); i===0?ctx2.moveTo(x,y):ctx2.lineTo(x,y); }); ctx2.stroke();
    d.forEach((v, i) => { const x=pad+i*(W-2*pad)/4, y=H-pad-(v/max)*(H-2*pad); ctx2.fillStyle=color; ctx2.beginPath(); ctx2.arc(x,y,4,0,Math.PI*2); ctx2.fill(); ctx2.fillStyle='#fff'; ctx2.beginPath(); ctx2.arc(x,y,2,0,Math.PI*2); ctx2.fill(); });
  };
  drawLine(data, '#2563eb', 4); drawLine(data2, '#16a34a', 14);
  ctx2.fillStyle = '#6b7280'; ctx2.font = '10px Inter,sans-serif'; ctx2.textAlign = 'center';
  labels.forEach((l, i) => ctx2.fillText(l, pad+i*(W-2*pad)/4, H-6));
  ctx2.fillStyle = '#2563eb'; ctx2.fillRect(pad, 8, 16, 4);
  ctx2.fillStyle = '#374151'; ctx2.textAlign = 'left'; ctx2.font = '11px Inter,sans-serif'; ctx2.fillText('CTR(%)', pad+20, 14);
  ctx2.fillStyle = '#16a34a'; ctx2.fillRect(pad+80, 8, 16, 4); ctx2.fillText('CVR(%)', pad+100, 14);
}

// ── BUBBLE ──
function hideBubble() { document.getElementById('bubble').style.display = 'none'; }

function showBubble(npc) {
  const line = npc.lines[Math.floor(Math.random() * npc.lines.length)];
  const b = document.getElementById('bubble');
  document.getElementById('bubbleName').textContent  = `${npc.name} · ${npc.role}`;
  document.getElementById('bubbleName').style.color  = npc.color;
  document.getElementById('bubbleText').textContent  = line;
  const sx = (npc.x + 0.5 - camX) * TILE, sy = (npc.y + 0.5 - camY) * TILE;
  b.style.display = 'block';
  b.style.left = Math.min(sx - 20, window.innerWidth - 280) + 'px';
  b.style.top  = (sy - 80) + 'px';
  bubbleTimer = 3000;
}

// ── NOTIFICATION ──
let notifTimer;
function showNotif(msg) {
  const n = document.getElementById('notif');
  n.textContent = msg; n.classList.add('show');
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => n.classList.remove('show'), 2500);
}

// ── AI PANEL ──
function toggleAiPanel()  { document.getElementById('aiPanel').classList.toggle('open'); }
function closeAiPanel()   { document.getElementById('aiPanel').classList.remove('open'); }

function openAI(context, userContent = '') {
  document.getElementById('aiPanel').classList.add('open');

  const reportCriteria = `
[보고서 평가 기준 — 반드시 엄격하게 적용]
- 50자 미만: 성의 없는 제출. 직접 지적.
- 데이터 미인용(CTR, CVR, CAC, MAU 숫자 없음): 근거 없는 주장. 지적 필수.
- 원인 분석 없이 결론만: 논리 부재. 지적 필수.
- 두루뭉술하고 구체성 없음: 지적 필수.
- 다음 달 전략/제안 없음: 미완성. 지적 필수.
절대 칭찬 먼저 하지 마세요.`;

  const emailCriteria = `
[이메일 평가 기준 — 엄격하게]
- 한 줄짜리 답장: 성의 없음. 직접 지적.
- 질문에 명확한 답변 없음: 핵심 누락.
- 인사말/끝인사 없음: 예절 부재.
- 결정사항·액션 아이템 명시 없음: 지적.
부족한 답장에 칭찬 먼저 하는 것 금지.`;

  const systemPrompts = {
    email: `당신은 인턴+ 업무 시뮬레이터의 엄격한 AI 평가관입니다. 실제 직장 상사처럼 냉정하게 평가하세요.
${emailCriteria}

사용자가 보낸 이메일 답장: "${userContent}"

형식:
[평가] 한 문장 총평
[문제점] 1~2개 (없으면 "없음")
[개선안] 어떻게 썼어야 했는지 예시 한 줄

한국어로, 200자 이내.`,

    report_submit: `당신은 인턴+ 업무 시뮬레이터의 엄격한 AI 평가관입니다. 마케팅 보고서를 실제 팀장 시각에서 냉정하게 평가하세요.
${reportCriteria}

제출된 보고서:
"""
${userContent}
"""

체크 항목:
1. 분량 (짧으면 직접 지적)
2. 데이터 인용 여부 (CTR/CVR/CAC/MAU 숫자)
3. 원인 분석 깊이
4. 다음 달 전략 포함 여부

형식:
[종합 평가] 🔴나쁨 / 🟡보통 / 🟢좋음 + 이유
[미흡한 점] 2~3가지
[잘된 점] 1가지 (없으면 "없음")
[다음엔 이렇게] 핵심 개선 한 줄

한국어로.`,
  };

  const prompt = systemPrompts[context] || '이 업무에 대해 엄격하고 실용적인 피드백을 주세요. 한국어로.';
  addAIMessage('평가 중...', true);
  callClaude(prompt);
}

function addAIMessage(text, loading = false) {
  const msgs = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = 'ai-msg' + (loading ? ' loading' : '');
  div.innerHTML = `<div class="ai-label">✦ AI COACH</div>${text}`;
  msgs.appendChild(div); msgs.scrollTop = msgs.scrollHeight;
  return div;
}

async function sendToAI() {
  const input = document.getElementById('aiInput');
  const text  = input.value.trim(); if (!text) return;
  const userDiv = document.createElement('div');
  userDiv.className = 'ai-msg';
  userDiv.style.cssText = 'background:#eff6ff;border-color:#bfdbfe';
  userDiv.innerHTML = `<div class="ai-label" style="color:#2563eb">YOU</div>${text}`;
  document.getElementById('aiMessages').appendChild(userDiv);
  input.value = '';
  aiContext.push({ role: 'user', content: text });
  const loadDiv = addAIMessage('생각 중...', true);
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 300,
        system: '인턴+ 업무 시뮬레이터 AI 코치. 마케팅팀 신입을 돕는 실용적 코치. 한국어로 간결하게.',
        messages: aiContext
      })
    });
    const data  = await resp.json();
    const reply = data.content?.[0]?.text || '응답 오류';
    loadDiv.className = 'ai-msg'; loadDiv.innerHTML = `<div class="ai-label">✦ AI COACH</div>${reply}`;
    aiContext.push({ role: 'assistant', content: reply });
  } catch (e) {
    loadDiv.className = 'ai-msg'; loadDiv.innerHTML = `<div class="ai-label">✦ AI COACH</div>연결 오류`;
  }
  document.getElementById('aiMessages').scrollTop = 9999;
}

async function callClaude(prompt) {
  const msgs    = document.getElementById('aiMessages');
  const loadDiv = msgs.lastElementChild;
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
    });
    const data  = await resp.json();
    const reply = data.content?.[0]?.text || '피드백 오류';
    if (loadDiv) { loadDiv.className = 'ai-msg'; loadDiv.innerHTML = `<div class="ai-label">✦ AI COACH</div>${reply}`; }
  } catch (e) {
    if (loadDiv) { loadDiv.className = 'ai-msg'; loadDiv.innerHTML = `<div class="ai-label">✦ AI COACH</div>오류`; }
  }
  msgs.scrollTop = 9999;
}

// ── START ──
function startGame() {
  document.getElementById('intro').style.display = 'none';
  document.getElementById('gameWrap').classList.add('active');
  const tu = document.getElementById('timerUI');
  tu.style.display = 'flex';
  loadRound(1);
}
