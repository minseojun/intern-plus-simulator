// ─────────────────────────────────────────────
//  evaluation.js  —  라운드 평가 & 최종 리포트
//  실시간 피드백 없음 — 라운드 종료 시 종합 평가
// ─────────────────────────────────────────────

// ── ROUND EVALUATION ──
async function showRoundEvaluation() {
  const overlay = document.getElementById('evalOverlay');
  overlay.classList.add('active');
  document.getElementById('evalLoading').style.display  = 'flex';
  document.getElementById('evalContent').style.display  = 'none';

  const rd              = ROUND_DATA[currentRound];
  const repliesSent     = actionLog.filter(a => a.type === 'reply'    && a.round === currentRound);
  const reportSubmitted = actionLog.filter(a => a.type === 'report'   && a.round === currentRound);
  const tasksDone       = actionLog.filter(a => a.type === 'task_done'&& a.round === currentRound);
  const npcTalks        = actionLog.filter(a => a.type === 'npc_talk' && a.round === currentRound);
  const emailsRead      = EMAILS.filter(e => !e.unread).length;
  const requiredEmails  = rd.emails.filter(e => e.required);
  const requiredReplied = repliesSent.filter(r => requiredEmails.some(e => e.id === r.emailId));
  const timeUsed        = ROUND_DURATION_REAL - roundTimeLeft;
  const reportContent   = reportSubmitted[0]?.detail || '';

  const prompt = `당신은 인턴+ 업무 시뮬레이터의 전문 평가관입니다.
회사: ${COMPANY.name} (${COMPANY.size})
제품: ${COMPANY.product}
직무: ${COMPANY.playerRole}
라운드: ${currentRound} (${rd.difficulty} 난이도)
${rd.reportContext}

[행동 데이터]
- 이메일 열람: ${emailsRead}/${rd.emails.length}개
- 필수 이메일 답장: ${requiredReplied.length}/${requiredEmails.length}개
- 답장 내용 목록: ${repliesSent.map((r, i) => `\n  답장${i+1}: "${r.detail?.slice(0, 150)}"`).join('') || '없음'}
- 보고서 제출: ${reportContent ? `제출함\n  내용: "${reportContent}"` : '미제출'}
- 칸반 업무 완료: ${tasksDone.length}개
- NPC 대화 횟수: ${npcTalks.length}번
- 소요 시간: ${Math.floor(timeUsed/60)}분 ${timeUsed%60}초

[보고서 평가 기준 — 매우 엄격하게 적용]
다음 항목을 체크하고 점수에 반영하세요:
1. 분량: 미제출 또는 80자 미만이면 quality 점수 10 이하
2. 데이터 인용: CTR, CVR, ROAS, MAU 등 구체적 수치 없으면 -20점
3. 원인 분석: "왜 그런 결과가 나왔는지" 설명 없으면 -15점
4. 전략 제안: 다음 단계 제안 없으면 -15점
5. 논리 구조: 두루뭉술하고 구체성 없으면 -10점
대충 쓴 보고서에 높은 점수를 주지 마세요. quality가 핵심입니다.

[이메일 답장 평가 기준]
- 한 줄짜리나 의례적인 답장은 responsiveness 낮게 평가
- 질문에 명확한 답변 없으면 감점
- 결정사항 없이 "검토하겠습니다"만 반복하면 감점

다음 JSON만 반환 (다른 텍스트 없이):
{
  "scores": {
    "responsiveness": 0~100,
    "report_quality": 0~100,
    "decision_making": 0~100,
    "time_management": 0~100
  },
  "overall": 0~100,
  "grade": "S/A/B/C/D",
  "report_feedback": {
    "rating": "🔴미흡/🟡보통/🟢우수",
    "strengths": "잘된 점 (없으면 '없음')",
    "weaknesses": "부족한 점 2~3가지",
    "example": "이렇게 썼어야 했다 (짧게 예시)"
  },
  "email_feedback": "이메일 답장 전반에 대한 평가 1~2문장",
  "key_insight": "이 라운드에서 가장 중요한 피드백 1가지",
  "summary": "종합 평가 2문장"
}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': CONFIG.API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: CONFIG.MODEL, max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
    });
    const data   = await resp.json();
    const text   = data.content?.[0]?.text || '{}';
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());
    result.round = currentRound; result.timeUsed = timeUsed;
    roundScores.push(result);
    renderEvaluation(result);
  } catch (e) {
    console.error('Eval error:', e);
    const fallback = buildFallbackEval(timeUsed);
    roundScores.push(fallback);
    renderEvaluation(fallback);
  }
}

function buildFallbackEval(timeUsed) {
  const reportSubmitted = actionLog.filter(a => a.type === 'report' && a.round === currentRound);
  const repliesSent     = actionLog.filter(a => a.type === 'reply'  && a.round === currentRound);
  const reportLen       = reportSubmitted[0]?.detail?.length || 0;

  const rq = reportLen > 300 ? 65 : reportLen > 80 ? 40 : 15;
  const rs = repliesSent.length >= 2 ? 70 : repliesSent.length === 1 ? 50 : 25;
  const overall = Math.round((rq + rs + 60 + 65) / 4);

  return {
    scores: { responsiveness: rs, report_quality: rq, decision_making: 60, time_management: 65 },
    overall, grade: overall >= 80 ? 'A' : overall >= 65 ? 'B' : overall >= 50 ? 'C' : 'D',
    round: currentRound, timeUsed,
    report_feedback: {
      rating: rq >= 65 ? '🟡보통' : '🔴미흡',
      strengths: reportLen > 200 ? '분량은 적절했습니다.' : '없음',
      weaknesses: reportLen < 80 ? '보고서를 제출하지 않았거나 내용이 너무 짧습니다.' : '데이터 인용과 원인 분석이 부족할 수 있습니다.',
      example: 'CTR 3.2%는 업계 평균(1.8%) 대비 +1.4%p로, 인스타 릴스 알고리즘 개편으로 도달 증가한 것으로 분석됩니다.'
    },
    email_feedback: repliesSent.length === 0 ? '필수 이메일에 답장하지 않았습니다. 다음엔 우선순위 높은 메일부터 처리하세요.' : '답장을 보냈습니다. 명확한 의사결정이 담겼는지 확인하세요.',
    key_insight: '이메일 우선순위 판단과 보고서의 구체적 데이터 인용이 핵심입니다.',
    summary: '라운드를 완료했습니다. AI 평가 연결에 오류가 발생했습니다.'
  };
}

function renderEvaluation(result) {
  document.getElementById('evalLoading').style.display = 'none';
  document.getElementById('evalContent').style.display = 'block';

  const gradeColor = { S: '#7c3aed', A: '#2563eb', B: '#16a34a', C: '#d97706', D: '#dc2626' };
  const gc = gradeColor[result.grade] || '#6b7280';
  const rd = ROUND_DATA[currentRound];

  const scoreItems = [
    ['대응력', result.scores?.responsiveness, '이메일 열람·답장 적시성'],
    ['보고서 품질', result.scores?.report_quality, '내용·데이터·논리 구조'],
    ['의사결정', result.scores?.decision_making, '판단의 명확성·근거'],
    ['시간 관리', result.scores?.time_management, '우선순위·효율'],
  ];

  document.getElementById('evalContent').innerHTML = `
    <div class="fade-in">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-size:0.72rem;color:#6b7280;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px">${rd.label} 완료</div>
          <div style="font-size:1.4rem;font-weight:800;color:#111827">라운드 ${result.round} 평가</div>
        </div>
        <div style="width:68px;height:68px;border-radius:50%;background:${gc};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 16px ${gc}44">
          <span style="font-size:1.8rem;font-weight:900;color:#fff;line-height:1">${result.grade}</span>
          <span style="font-size:0.65rem;color:rgba(255,255,255,0.8)">${result.overall}점</span>
        </div>
      </div>

      <!-- 점수 바 -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:16px">
        ${scoreItems.map(([label, score, desc]) => `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
              <div>
                <span style="font-size:0.8rem;font-weight:600;color:#374151">${label}</span>
                <span style="font-size:0.68rem;color:#9ca3af;margin-left:6px">${desc}</span>
              </div>
              <span style="font-size:0.88rem;font-weight:700;color:${score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'}">${score}</span>
            </div>
            <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${score}%;background:${score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'};border-radius:3px;transition:width 0.8s ease"></div>
            </div>
          </div>`).join('')}
      </div>

      <!-- 보고서 피드백 -->
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em">📄 보고서 평가</span>
          <span style="font-size:0.85rem">${result.report_feedback?.rating || ''}</span>
        </div>
        <div style="font-size:0.8rem;color:#374151;line-height:1.7;margin-bottom:8px">
          <strong style="color:#dc2626">부족한 점:</strong> ${result.report_feedback?.weaknesses || '없음'}
        </div>
        <div style="font-size:0.8rem;color:#374151;line-height:1.7;margin-bottom:8px">
          <strong style="color:#16a34a">잘된 점:</strong> ${result.report_feedback?.strengths || '없음'}
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:10px;font-size:0.78rem;color:#166534;line-height:1.6">
          <strong>이렇게 썼어야 했다:</strong><br>${result.report_feedback?.example || ''}
        </div>
      </div>

      <!-- 이메일 피드백 -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;margin-bottom:12px">
        <div style="font-size:0.72rem;font-weight:700;color:#2563eb;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em">📧 이메일 대응</div>
        <div style="font-size:0.82rem;color:#1e40af;line-height:1.7">${result.email_feedback}</div>
      </div>

      <!-- 핵심 인사이트 -->
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:0.72rem;font-weight:700;color:#d97706;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em">💡 핵심 피드백</div>
        <div style="font-size:0.85rem;color:#92400e;line-height:1.7">${result.key_insight}</div>
      </div>

      <div style="font-size:0.82rem;color:#6b7280;line-height:1.7;padding:14px;background:#f9fafb;border-radius:10px;margin-bottom:20px">${result.summary}</div>

      <div style="display:flex;justify-content:flex-end">
        ${currentRound < 3
          ? `<button onclick="startNextRound()" style="padding:12px 28px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:0.88rem;font-weight:700;cursor:pointer">다음 라운드 →</button>`
          : `<button onclick="showFinalReport()" style="padding:12px 28px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:0.88rem;font-weight:700;cursor:pointer">최종 리포트 보기 ✦</button>`
        }
      </div>
    </div>`;
}

// ── FINAL REPORT ──
async function showFinalReport() {
  document.getElementById('evalOverlay').classList.remove('active');
  document.getElementById('finalReport').classList.add('active');
  document.getElementById('finalLoading').style.display  = 'flex';
  document.getElementById('finalContent').style.display  = 'none';

  const avgOverall = Math.round(roundScores.reduce((s, r) => s + r.overall, 0) / roundScores.length);
  const avgScores  = {
    responsiveness:  Math.round(roundScores.reduce((s, r) => s + (r.scores?.responsiveness  || 0), 0) / roundScores.length),
    report_quality:  Math.round(roundScores.reduce((s, r) => s + (r.scores?.report_quality  || 0), 0) / roundScores.length),
    decision_making: Math.round(roundScores.reduce((s, r) => s + (r.scores?.decision_making || 0), 0) / roundScores.length),
    time_management: Math.round(roundScores.reduce((s, r) => s + (r.scores?.time_management || 0), 0) / roundScores.length),
  };

  const prompt = `당신은 인턴+ 업무 시뮬레이터의 최종 평가관입니다.
회사: ${COMPANY.name} / 직무: ${COMPANY.playerRole}

[라운드별 결과]
${roundScores.map(r => `R${r.round}(${ROUND_DATA[r.round].difficulty}): ${r.overall}점 ${r.grade}등급 — ${r.summary}`).join('\n')}

[평균 점수]
대응력: ${avgScores.responsiveness} / 보고서품질: ${avgScores.report_quality} / 의사결정: ${avgScores.decision_making} / 시간관리: ${avgScores.time_management}
종합: ${avgOverall}

보고서 품질 점수가 낮으면 이를 핵심 개선 과제로 반드시 언급하세요.
마케팅 직무에 특화된 피드백을 주세요.

JSON만 반환:
{
  "overall_grade": "S/A/B/C/D",
  "overall_score": 0~100,
  "headline": "이 사람을 한 줄로 정의 (예: '위기에 강한 마케터' / '분석력은 높으나 실행이 아쉬운 마케터')",
  "type": "마케팅 업무 스타일 유형명",
  "growth_curve": "3라운드 걸쳐 어떻게 변화했는지 2문장",
  "marketing_strengths": "마케팅 직무 관점 강점 (구체적으로)",
  "marketing_weakness": "마케팅 직무 관점 핵심 개선점 (구체적으로)",
  "report_verdict": "보고서 작성 능력에 대한 직접적인 평가 1~2문장",
  "job_fit": ["잘 맞는 마케팅 세부 직무1", "잘 맞는 마케팅 세부 직무2"],
  "action_plan": ["즉시 실천 액션1", "즉시 실천 액션2", "장기 성장 방향"],
  "final_message": "진심 어린 응원 메시지 2~3문장"
}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': CONFIG.API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: CONFIG.MODEL, max_tokens: 900, messages: [{ role: 'user', content: prompt }] })
    });
    const data   = await resp.json();
    const result = JSON.parse(data.content?.[0]?.text?.replace(/```json|```/g,'').trim() || '{}');
    result.avgScores = avgScores; result.avgOverall = avgOverall;
    renderFinalReport(result);
  } catch (e) {
    renderFinalReport({
      overall_grade: avgOverall >= 75 ? 'B' : 'C', overall_score: avgOverall,
      headline: '성장 중인 마케터', type: '실행형 마케터',
      growth_curve: '라운드를 거치며 상황 파악 속도가 빨라졌습니다.',
      marketing_strengths: '빠른 상황 인식과 실행력',
      marketing_weakness: '데이터 기반 보고서 작성과 명확한 의사결정',
      report_verdict: avgScores.report_quality < 60 ? '보고서 품질이 가장 큰 과제입니다. 데이터 인용과 원인 분석 연습이 필요합니다.' : '보고서 구조는 잡혀 있으나 인사이트 깊이를 높여야 합니다.',
      job_fit: ['퍼포먼스 마케팅', '콘텐츠 전략'],
      action_plan: ['데이터 기반 보고서 작성 연습', '이메일 답장 시 결정사항 명확히 명시', '위기 상황 우선순위 판단 훈련'],
      final_message: '3라운드를 완주했습니다. 계속 연습하면 분명 성장할 수 있습니다.',
      avgScores, avgOverall
    });
  }
}

function renderFinalReport(r) {
  document.getElementById('finalLoading').style.display = 'none';
  document.getElementById('finalContent').style.display = 'block';
  const gradeColor = { S: '#7c3aed', A: '#2563eb', B: '#16a34a', C: '#d97706', D: '#dc2626' };
  const gc = gradeColor[r.overall_grade] || '#6b7280';

  document.getElementById('finalContent').innerHTML = `
    <div class="fade-in">
      <!-- 헤더 -->
      <div style="text-align:center;padding:20px 0 24px;border-bottom:1px solid #e5e7eb;margin-bottom:24px">
        <div style="font-size:0.7rem;color:#9ca3af;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">인턴+ 최종 피드백 리포트</div>
        <div style="font-size:0.78rem;color:#6b7280;margin-bottom:12px">${COMPANY.name} · ${COMPANY.playerRole}</div>
        <div style="font-size:1.5rem;font-weight:800;color:#111827;margin-bottom:8px">${r.headline}</div>
        <div style="display:inline-block;padding:5px 16px;background:${gc}18;color:${gc};border-radius:20px;font-size:0.82rem;font-weight:700">${r.type}</div>
      </div>

      <!-- 종합 점수 -->
      <div style="display:flex;align-items:center;gap:20px;background:#f9fafb;border-radius:14px;padding:20px;margin-bottom:20px">
        <div style="width:80px;height:80px;border-radius:50%;background:${gc};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 16px ${gc}44">
          <span style="font-size:1.8rem;font-weight:900;color:#fff;line-height:1">${r.overall_grade}</span>
          <span style="font-size:0.68rem;color:rgba(255,255,255,0.85)">${r.overall_score}점</span>
        </div>
        <div style="flex:1">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${[['대응력', r.avgScores.responsiveness], ['보고서', r.avgScores.report_quality], ['의사결정', r.avgScores.decision_making], ['시간관리', r.avgScores.time_management]].map(([l, v]) => `
              <div>
                <div style="display:flex;justify-content:space-between;font-size:0.7rem;margin-bottom:3px">
                  <span style="color:#6b7280">${l}</span>
                  <span style="font-weight:700;color:${v >= 70 ? '#16a34a' : v >= 50 ? '#d97706' : '#dc2626'}">${v}</span>
                </div>
                <div style="height:5px;background:#e5e7eb;border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${v}%;background:${v >= 70 ? '#16a34a' : v >= 50 ? '#d97706' : '#dc2626'};border-radius:3px"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- 라운드별 성적 -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px">
        ${roundScores.map(rs => {
          const gc2 = gradeColor[rs.grade] || '#6b7280';
          return `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:0.65rem;color:#9ca3af;font-weight:700;margin-bottom:6px">R${rs.round} · ${ROUND_DATA[rs.round].difficulty}</div>
            <div style="font-size:1.5rem;font-weight:900;color:${gc2}">${rs.grade}</div>
            <div style="font-size:0.78rem;color:#374151;font-weight:600">${rs.overall}점</div>
          </div>`;
        }).join('')}
      </div>

      <!-- 보고서 역량 -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:12px">
        <div style="font-size:0.72rem;font-weight:700;color:#dc2626;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em">📄 보고서 작성 역량</div>
        <div style="font-size:0.83rem;color:#7f1d1d;line-height:1.7">${r.report_verdict}</div>
      </div>

      <!-- 강점 / 약점 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px">
          <div style="font-size:0.72rem;font-weight:700;color:#16a34a;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em">✦ 강점</div>
          <div style="font-size:0.82rem;color:#166534;line-height:1.7">${r.marketing_strengths}</div>
        </div>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px">
          <div style="font-size:0.72rem;font-weight:700;color:#d97706;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em">⚡ 핵심 과제</div>
          <div style="font-size:0.82rem;color:#92400e;line-height:1.7">${r.marketing_weakness}</div>
        </div>
      </div>

      <!-- 성장 궤적 + 액션 플랜 -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px">
        <div style="font-size:0.72rem;font-weight:700;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em">📈 성장 궤적</div>
        <div style="font-size:0.82rem;color:#374151;line-height:1.7;margin-bottom:12px">${r.growth_curve}</div>
        <div style="font-size:0.72rem;font-weight:700;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em">다음 단계 액션 플랜</div>
        ${(r.action_plan || []).map((s, i) => `
          <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px">
            <span style="width:20px;height:20px;border-radius:50%;background:${gc};color:#fff;font-size:0.65rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">${i+1}</span>
            <span style="font-size:0.8rem;color:#374151;line-height:1.5">${s}</span>
          </div>`).join('')}
      </div>

      <!-- 추천 직무 -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;margin-bottom:20px">
        <div style="font-size:0.72rem;font-weight:700;color:#2563eb;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em">💼 추천 마케팅 세부 직무</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${(r.job_fit || []).map(j => `<span style="padding:5px 14px;background:#2563eb;color:#fff;border-radius:20px;font-size:0.8rem;font-weight:600">${j}</span>`).join('')}
        </div>
      </div>

      <!-- 마무리 메시지 -->
      <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:14px;padding:22px;color:#fff;margin-bottom:24px">
        <div style="font-size:0.68rem;opacity:0.65;margin-bottom:8px;letter-spacing:0.08em;text-transform:uppercase">FINAL MESSAGE</div>
        <div style="font-size:0.88rem;line-height:1.8">${r.final_message}</div>
      </div>

      <div style="text-align:center">
        <button onclick="location.reload()" style="padding:12px 36px;background:#111827;color:#fff;border:none;border-radius:8px;font-size:0.9rem;font-weight:700;cursor:pointer">다시 플레이하기</button>
      </div>
    </div>`;
}
