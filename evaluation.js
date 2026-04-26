// ─────────────────────────────────────────────
//  evaluation.js  —  라운드 평가 & 최종 리포트
// ─────────────────────────────────────────────

// ── ROUND EVALUATION ──
async function showRoundEvaluation() {
  const overlay = document.getElementById('evalOverlay');
  overlay.style.display = 'flex';
  document.getElementById('evalLoading').style.display  = 'flex';
  document.getElementById('evalContent').style.display  = 'none';

  const rd             = ROUND_DATA[currentRound];
  const repliesSent    = actionLog.filter(a => a.type === 'reply'  && a.round === currentRound);
  const reportSubmitted= actionLog.filter(a => a.type === 'report' && a.round === currentRound);
  const emailsRead     = EMAILS.filter(e => !e.unread).length;
  const requiredEmails = rd.emails.filter(e => e.required);
  const requiredReplied= repliesSent.filter(r => requiredEmails.some(e => e.id === r.emailId));
  const timeUsed       = ROUND_DURATION_REAL - roundTimeLeft;

  const prompt = `당신은 인턴+ 업무 시뮬레이터의 평가 AI입니다.
라운드 ${currentRound} (${rd.difficulty} 난이도) 평가를 해주세요.

[행동 데이터]
- 이메일 열람: ${emailsRead}/${rd.emails.length}개
- 필수 이메일 답장: ${requiredReplied.length}/${requiredEmails.length}개
- 답장 내용들: ${repliesSent.map(r => `"${r.detail}"`).join(', ') || '없음'}
- 보고서 제출: ${reportSubmitted.length > 0 ? `제출함 (내용: "${reportSubmitted[0]?.detail?.slice(0, 100)}...")` : '미제출'}
- 업무 완료 처리: ${TASKS.done.length}개
- 소요 시간: ${Math.floor(timeUsed/60)}분 ${timeUsed%60}초

[라운드 상황]
${rd.context}

JSON만 반환 (다른 텍스트 없이):
{
  "scores": { "responsiveness": 0~100, "quality": 0~100, "priority": 0~100, "speed": 0~100 },
  "overall": 0~100,
  "grade": "S/A/B/C/D",
  "summary": "2문장 이내 종합 평가",
  "strengths": ["강점1", "강점2"],
  "improvements": ["개선점1", "개선점2"],
  "key_insight": "이 라운드에서 가장 중요한 한 가지 피드백"
}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600, messages: [{ role: 'user', content: prompt }] })
    });
    const data   = await resp.json();
    const text   = data.content?.[0]?.text || '{}';
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());
    result.round = currentRound; result.timeUsed = timeUsed;
    roundScores.push(result);
    renderEvaluation(result);
  } catch (e) {
    const fallback = {
      scores: { responsiveness: 60, quality: 65, priority: 55, speed: 70 },
      overall: 63, grade: 'B', round: currentRound, timeUsed,
      summary: '라운드를 완료했습니다. AI 평가 연결에 일시적 문제가 있었습니다.',
      strengths: ['라운드를 끝까지 진행했습니다'],
      improvements: ['더 많은 이메일 대응이 필요합니다'],
      key_insight: '중요 이메일 우선 처리 연습이 필요합니다'
    };
    roundScores.push(fallback);
    renderEvaluation(fallback);
  }
}

function renderEvaluation(result) {
  document.getElementById('evalLoading').style.display = 'none';
  document.getElementById('evalContent').style.display = 'block';

  const gradeColor = { S: '#7c3aed', A: '#2563eb', B: '#16a34a', C: '#d97706', D: '#dc2626' };
  const gc = gradeColor[result.grade] || '#2563eb';
  const rd = ROUND_DATA[currentRound];

  document.getElementById('evalContent').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div>
        <div style="font-size:0.75rem;color:#6b7280;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px">${rd.label} 완료</div>
        <div style="font-size:1.5rem;font-weight:700;color:#111827">라운드 ${result.round} 평가 결과</div>
      </div>
      <div style="width:72px;height:72px;border-radius:50%;background:${gc};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <span style="font-size:2rem;font-weight:800;color:#fff">${result.grade}</span>
      </div>
    </div>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:20px">
      <div style="font-size:0.72rem;color:#6b7280;font-weight:600;margin-bottom:12px;letter-spacing:0.06em;text-transform:uppercase">종합 점수</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <div style="flex:1;height:10px;background:#e5e7eb;border-radius:5px;overflow:hidden">
          <div style="height:100%;width:${result.overall}%;background:${gc};border-radius:5px;transition:width 1s"></div>
        </div>
        <span style="font-size:1.2rem;font-weight:700;color:${gc};min-width:40px">${result.overall}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
        ${[['대응력', result.scores?.responsiveness], ['작성 품질', result.scores?.quality], ['우선순위 판단', result.scores?.priority], ['처리 속도', result.scores?.speed]].map(([label, score]) => `
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px">
            <div style="font-size:0.7rem;color:#6b7280;margin-bottom:4px">${label}</div>
            <div style="display:flex;align-items:center;gap:6px">
              <div style="flex:1;height:5px;background:#e5e7eb;border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${score}%;background:#2563eb;border-radius:3px"></div>
              </div>
              <span style="font-size:0.82rem;font-weight:600;color:#374151">${score}</span>
            </div>
          </div>`).join('')}
      </div>
    </div>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="font-size:0.72rem;font-weight:700;color:#2563eb;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em">💡 핵심 인사이트</div>
      <div style="font-size:0.85rem;color:#1e40af;line-height:1.6">${result.key_insight}</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px">
        <div style="font-size:0.72rem;font-weight:700;color:#16a34a;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em">✓ 잘한 점</div>
        ${(result.strengths || []).map(s => `<div style="font-size:0.8rem;color:#166534;margin-bottom:4px;line-height:1.5">• ${s}</div>`).join('')}
      </div>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px">
        <div style="font-size:0.72rem;font-weight:700;color:#d97706;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em">△ 개선점</div>
        ${(result.improvements || []).map(s => `<div style="font-size:0.8rem;color:#92400e;margin-bottom:4px;line-height:1.5">• ${s}</div>`).join('')}
      </div>
    </div>

    <div style="padding:14px;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:20px">
      <div style="font-size:0.8rem;color:#374151;line-height:1.7">${result.summary}</div>
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end">
      ${currentRound < 3
        ? `<button onclick="startNextRound()" style="padding:12px 28px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:0.88rem;font-weight:600;cursor:pointer">다음 라운드 시작 →</button>`
        : `<button onclick="showFinalReport()" style="padding:12px 28px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:0.88rem;font-weight:600;cursor:pointer">최종 피드백 리포트 보기 ✦</button>`
      }
    </div>`;
}

// ── FINAL REPORT ──
async function showFinalReport() {
  document.getElementById('evalOverlay').style.display = 'none';
  const overlay = document.getElementById('finalReport');
  overlay.style.display = 'flex';
  document.getElementById('finalLoading').style.display  = 'flex';
  document.getElementById('finalContent').style.display  = 'none';

  const avgOverall = Math.round(roundScores.reduce((s, r) => s + r.overall, 0) / roundScores.length);
  const avgScores  = {
    responsiveness: Math.round(roundScores.reduce((s, r) => s + (r.scores?.responsiveness || 0), 0) / roundScores.length),
    quality:        Math.round(roundScores.reduce((s, r) => s + (r.scores?.quality        || 0), 0) / roundScores.length),
    priority:       Math.round(roundScores.reduce((s, r) => s + (r.scores?.priority       || 0), 0) / roundScores.length),
    speed:          Math.round(roundScores.reduce((s, r) => s + (r.scores?.speed          || 0), 0) / roundScores.length),
  };

  const prompt = `당신은 인턴+ 업무 시뮬레이터의 최종 평가 AI입니다.
3개 라운드 전체에 대한 종합 피드백 리포트를 작성해주세요.

[라운드별 점수]
${roundScores.map(r => `- R${r.round} (${ROUND_DATA[r.round].difficulty}): ${r.overall}점 (${r.grade}등급) / ${r.summary}`).join('\n')}

[평균 점수]
대응력: ${avgScores.responsiveness}, 작성품질: ${avgScores.quality}, 우선순위: ${avgScores.priority}, 처리속도: ${avgScores.speed}
종합 평균: ${avgOverall}

JSON만 반환:
{
  "overall_grade": "S/A/B/C/D",
  "overall_score": 0~100,
  "headline": "이 사람을 한 줄로 정의하는 문장",
  "personality_type": "업무 유형명",
  "growth_curve": "1→3라운드 변화 2문장",
  "top_strength": "가장 두드러진 강점 (구체적으로)",
  "critical_weakness": "가장 시급히 개선해야 할 약점 (구체적으로)",
  "job_fit": ["잘 맞는 직무1", "잘 맞는 직무2"],
  "next_steps": ["단기 액션1", "단기 액션2", "장기 성장 방향"],
  "final_message": "응원과 핵심 메시지 2~3문장"
}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
    });
    const data   = await resp.json();
    const text   = data.content?.[0]?.text || '{}';
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());
    result.avgScores = avgScores; result.avgOverall = avgOverall;
    renderFinalReport(result);
  } catch (e) {
    renderFinalReport({
      overall_grade: 'B', overall_score: avgOverall,
      headline: '성장 가능성 높은 마케터', personality_type: '착실한 실행가',
      growth_curve: '라운드를 거치며 점차 적응하는 모습을 보였습니다.',
      top_strength: '지속적으로 업무를 완수하려는 책임감',
      critical_weakness: '위기 상황에서의 빠른 의사결정',
      job_fit: ['마케팅 기획', '콘텐츠 전략'],
      next_steps: ['이메일 대응 속도 높이기', '우선순위 판단 연습', '보고서 구조화 훈련'],
      final_message: '3라운드를 완주한 것만으로도 대단합니다. 계속 연습하면 분명 성장할 수 있습니다.',
      avgScores, avgOverall
    });
  }
}

function renderFinalReport(r) {
  document.getElementById('finalLoading').style.display = 'none';
  document.getElementById('finalContent').style.display = 'block';
  const gradeColor = { S: '#7c3aed', A: '#2563eb', B: '#16a34a', C: '#d97706', D: '#dc2626' };
  const gc = gradeColor[r.overall_grade] || '#2563eb';

  document.getElementById('finalContent').innerHTML = `
    <div style="text-align:center;padding:28px 0 20px;border-bottom:1px solid #e5e7eb;margin-bottom:24px">
      <div style="font-size:0.72rem;color:#6b7280;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">인턴+ 최종 피드백 리포트</div>
      <div style="font-size:1.6rem;font-weight:800;color:#111827;margin-bottom:6px">${r.headline}</div>
      <div style="display:inline-block;padding:4px 14px;background:${gc}22;color:${gc};border-radius:20px;font-size:0.82rem;font-weight:600">${r.personality_type}</div>
    </div>

    <div style="display:flex;align-items:center;gap:20px;background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="width:80px;height:80px;border-radius:50%;background:${gc};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px ${gc}44">
        <span style="font-size:2rem;font-weight:800;color:#fff;line-height:1">${r.overall_grade}</span>
        <span style="font-size:0.7rem;color:rgba(255,255,255,0.8)">${r.overall_score}점</span>
      </div>
      <div style="flex:1">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${[['대응력', r.avgScores.responsiveness], ['작성품질', r.avgScores.quality], ['우선순위', r.avgScores.priority], ['처리속도', r.avgScores.speed]].map(([l, v]) => `
            <div>
              <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:#6b7280;margin-bottom:3px"><span>${l}</span><span style="font-weight:600;color:#374151">${v}</span></div>
              <div style="height:5px;background:#e5e7eb;border-radius:3px;overflow:hidden"><div style="height:100%;width:${v}%;background:${gc};border-radius:3px"></div></div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px">
      ${roundScores.map(rs => {
        const rd2 = ROUND_DATA[rs.round], gc2 = gradeColor[rs.grade] || '#2563eb';
        return `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:0.68rem;color:#6b7280;font-weight:600;margin-bottom:6px">R${rs.round} · ${rd2.difficulty}</div>
          <div style="font-size:1.6rem;font-weight:800;color:${gc2}">${rs.grade}</div>
          <div style="font-size:0.78rem;color:#374151;font-weight:600">${rs.overall}점</div>
        </div>`;
      }).join('')}
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="font-size:0.7rem;font-weight:700;color:#16a34a;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em">✦ 최대 강점</div>
      <div style="font-size:0.85rem;color:#166534;line-height:1.6">${r.top_strength}</div>
    </div>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="font-size:0.7rem;font-weight:700;color:#d97706;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em">⚡ 핵심 개선 과제</div>
      <div style="font-size:0.85rem;color:#92400e;line-height:1.6">${r.critical_weakness}</div>
    </div>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="font-size:0.7rem;font-weight:700;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em">📈 성장 궤적</div>
      <div style="font-size:0.82rem;color:#374151;line-height:1.6;margin-bottom:10px">${r.growth_curve}</div>
      <div style="font-size:0.7rem;font-weight:700;color:#374151;margin-bottom:6px">다음 단계</div>
      ${(r.next_steps || []).map((s, i) => `<div style="font-size:0.8rem;color:#374151;margin-bottom:4px;display:flex;gap:6px"><span style="color:#2563eb;font-weight:700">${i+1}.</span>${s}</div>`).join('')}
    </div>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;margin-bottom:20px">
      <div style="font-size:0.7rem;font-weight:700;color:#2563eb;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em">💼 추천 직무 적합도</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${(r.job_fit || []).map(j => `<span style="padding:4px 12px;background:#2563eb;color:#fff;border-radius:20px;font-size:0.78rem;font-weight:500">${j}</span>`).join('')}
      </div>
    </div>

    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:12px;padding:20px;color:#fff;margin-bottom:20px">
      <div style="font-size:0.72rem;opacity:0.7;margin-bottom:8px;letter-spacing:0.06em">FINAL MESSAGE</div>
      <div style="font-size:0.88rem;line-height:1.7">${r.final_message}</div>
    </div>

    <div style="text-align:center">
      <button onclick="location.reload()" style="padding:12px 32px;background:#111827;color:#fff;border:none;border-radius:8px;font-size:0.88rem;font-weight:600;cursor:pointer">다시 플레이하기</button>
    </div>`;
}
