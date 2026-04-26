// ─────────────────────────────────────────────
//  npc.js  —  NPC 대화 트리
// ─────────────────────────────────────────────

// ── NPC 기본 정보 ──
const NPC_INFO = [
  {
    id: 'kim',
    x: 2, y: 3,
    name: '김지훈',
    role: '마케팅팀장',
    color: '#f87171',
    personality: '꼼꼼하고 데이터 중심적. 신입에게 엄하지만 성장을 진심으로 원함.',
    avatar: '👔'
  },
  {
    id: 'park',
    x: 6, y: 3,
    name: '박소연',
    role: '마케팅 대리',
    color: '#34d399',
    personality: '친절하고 협조적. 콘텐츠 감각이 뛰어남. 과부하 상태.',
    avatar: '💼'
  },
  {
    id: 'jung',
    x: 10, y: 3,
    name: '정하늘',
    role: '마케팅 사원',
    color: '#fbbf24',
    personality: '입사 6개월차. 열정적이지만 판단력 부족. 민서를 많이 따름.',
    avatar: '🌟'
  },
  {
    id: 'choi',
    x: 10, y: 8,
    name: '최현우',
    role: '개발팀 과장',
    color: '#a78bfa',
    personality: '논리적이고 직설적. 마케팅팀과 갈등이 잦음.',
    avatar: '💻'
  },
  {
    id: 'lee',
    x: 14, y: 8,
    name: '이수진',
    role: '고객경험팀 대리',
    color: '#38bdf8',
    personality: '고객 관점에서 생각하는 공감 능력이 높음. 마케팅팀에 우호적.',
    avatar: '🎯'
  },
];

// ── 대화 트리 ──
// type: 'greeting' | 'advice' | 'conflict' | 'gossip' | 'support'
// trigger: 어떤 상황에서 나오는지 (round, condition)
// choices: 플레이어 응답 선택지 (없으면 단방향)

const NPC_DIALOGUES = {

  // ────────────────────────────────
  //  김지훈 팀장
  // ────────────────────────────────
  kim: {
    r1: [
      {
        id: 'kim_r1_1',
        type: 'advice',
        trigger: 'any',
        opening: '민서 씨, 잠깐요.',
        lines: [
          '보고서는 팀장이 읽기 편하게 써야 해요.',
          '수치 나열은 누구나 할 수 있어요. 팀장이 원하는 건 "그래서 우리가 뭘 해야 하는가"예요.',
          'ROAS가 낮은 채널이 있으면 왜 낮은지, 그리고 다음 달에 어떻게 할 건지까지 써줘야 해요.'
        ],
        choices: [
          { text: '네, 알겠습니다. 인사이트 중심으로 다시 써볼게요.', response: '그게 맞아요. 숫자는 근거고, 판단이 핵심이에요.', mood: 'positive' },
          { text: '지난달 보고서 어떤 부분이 부족했나요?', response: '채널별 수치는 잘 정리됐는데, "왜 이런 결과가 나왔는지"가 없었어요. 원인 분석이요.', mood: 'neutral' },
        ]
      },
      {
        id: 'kim_r1_2',
        type: 'conflict',
        trigger: 'report_not_submitted',
        opening: '(무표정으로) 보고서 마감 얼마 안 남았죠?',
        lines: [
          '오후 3시까지예요. 지금 몇 시인지 알고 있죠?',
        ],
        choices: [
          { text: '네, 지금 작성 중입니다.', response: '빠르게 해줘요. 내가 오후에 임원 보고 있어요.', mood: 'neutral' },
          { text: '죄송합니다. 다른 이메일들 처리하다 보니...', response: '우선순위 판단이 중요해요. 팀장 보고가 우선이에요.', mood: 'negative' },
        ]
      }
    ],
    r2: [
      {
        id: 'kim_r2_1',
        type: 'advice',
        trigger: 'any',
        opening: '(바쁜 표정으로) 잠깐.',
        lines: [
          '서버 상황이랑 예산 집행 건, 둘 다 내가 물어봤잖아요.',
          '이런 상황에서 중요한 건 내가 "결정"을 내릴 수 있게 정보를 정리해주는 거예요.',
          '선택지 A면 이런 리스크, B면 이런 리스크 — 명확하게 줘야 해요.'
        ],
        choices: [
          { text: '서버 증설 쪽이 더 나을 것 같은데, 추가 집행은 잠시 보류를 제안드리고 싶습니다.', response: '그 판단 맞아요. 이유를 메일로 정리해서 보내줘요.', mood: 'positive' },
          { text: '두 가지 다 지금 처리 중입니다.', response: '처리 중이라는 말 말고, 결론을 줘요. 결론.', mood: 'negative' },
        ]
      },
      {
        id: 'kim_r2_conflict',
        type: 'conflict',
        trigger: 'delayed_response',
        opening: '(날카롭게) 왜 아직도 회신이 없어요?',
        lines: [
          '개발팀 최현우 과장이 나한테 직접 연락했어요.',
          '담당자인 민서 씨가 결정을 안 해줘서 자기들이 판단해야 할 상황이라고요.',
          '이런 일이 반복되면 팀 전체 신뢰도 문제예요.'
        ],
        choices: [
          { text: '죄송합니다. 다른 급한 메일들을 먼저 처리하느라 늦었습니다.', response: '이해해요. 하지만 서버 관련 건은 내가 기다리고 있었어요. 다음엔 우선순위 먼저요.', mood: 'neutral' },
          { text: '지금 바로 결정해서 보내겠습니다.', response: '빠르게요. 그리고 앞으로는 긴급 메일 먼저 처리하는 습관 들여요.', mood: 'neutral' },
        ]
      }
    ],
    r3: [
      {
        id: 'kim_r3_1',
        type: 'support',
        trigger: 'any',
        opening: '(조용히) 민서 씨, 지금 많이 힘들죠?',
        lines: [
          '나도 이런 상황 처음엔 당황했어요.',
          '중요한 건 전부 다 완벽하게 하려고 하지 말고, 가장 급한 것 하나에 집중하는 거예요.',
          '지금은 대외 대응 메시지가 제일 중요해요. 그게 잘못되면 나머지가 다 의미 없어요.'
        ],
        choices: [
          { text: '알겠습니다. SNS 대응 메시지 먼저 작성하겠습니다.', response: '맞아요. 법무팀 지시 사항 꼭 지켜줘요. 결함 인정 표현은 절대 안 돼요.', mood: 'positive' },
          { text: '너무 많은 게 한꺼번에 터져서 어디서부터 해야 할지 모르겠어요.', response: '그 느낌 알아요. 리스트 쭉 써놓고, 대외 영향 큰 것 먼저예요. SNS가 지금 제일 급해요.', mood: 'support' },
        ]
      }
    ]
  },

  // ────────────────────────────────
  //  박소연 대리
  // ────────────────────────────────
  park: {
    r1: [
      {
        id: 'park_r1_1',
        type: 'greeting',
        trigger: 'any',
        opening: '민서 씨~ 바빠요?',
        lines: [
          'SNS 캘린더 건 도움 요청 드린 거 봤죠?',
          '사실 저도 릴스 vs 피드 비율 고민이 많아요. 요즘 알고리즘이 릴스를 너무 밀어주잖아요.',
          '근데 우리 타겟이 25~35세라서, 피드 콘텐츠도 포기하면 안 될 것 같아서요.'
        ],
        choices: [
          { text: '저는 릴스 7: 피드 3 정도가 좋을 것 같아요. 알고리즘 트렌드랑 타겟 특성 고려하면요.', response: '오, 그 비율 괜찮네요. 틱톡은요?', mood: 'positive' },
          { text: '저도 고민이에요. 경쟁사 분석 데이터 있으면 같이 볼까요?', response: '좋아요! 이따 잠깐 시간 되면 같이 봐요.', mood: 'positive' },
          { text: '솔직히 저도 아직 파악이 안 됐어요.', response: '그럼 나중에 얘기해요~ 천천히 같이 고민해봐요.', mood: 'neutral' },
        ]
      },
      {
        id: 'park_r1_gossip',
        type: 'gossip',
        trigger: 'any',
        opening: '(조용히) 민서 씨, 비밀인데요...',
        lines: [
          '팀장님이 요즘 임원진한테 마케팅 성과 압박을 엄청 받고 있대요.',
          '그래서 요즘 보고서에 더 예민한 거예요. 수치 하나하나 다 확인하신다니까요.',
          '이번 보고서 특히 꼼꼼하게 쓰면 좋을 것 같아요.'
        ],
        choices: [
          { text: '아, 그런 상황이었군요. 알려줘서 감사해요.', response: '쉿~ 저만 아는 거예요 ㅎㅎ. 힘내요!', mood: 'positive' },
          { text: '임원 보고가 언제예요?', response: '이번 주 금요일이래요. 그래서 오늘 보고서가 중요해요.', mood: 'neutral' },
        ]
      }
    ],
    r2: [
      {
        id: 'park_r2_1',
        type: 'support',
        trigger: 'any',
        opening: '민서 씨, 지금 완전 폭탄 맞은 거 알죠?',
        lines: [
          '경쟁사 필링스 출시에 서버 이슈까지... 저도 당황했어요.',
          '근데 솔직히 경쟁사 가격이 더 싸도, 우리 무드링 충성 유저들은 안 떠나요.',
          '무드링이 감정 기록의 "깊이"가 있잖아요. 그걸 지금 SNS에서 보여주면 좋을 것 같아요.'
        ],
        choices: [
          { text: '맞아요. 필링스는 가볍고 무드링은 깊이가 있죠. 그 포지셔닝으로 가야겠어요.', response: '정확해요! 커뮤니티 유저 후기 콘텐츠 활용하면 좋을 것 같아요.', mood: 'positive' },
          { text: '지금은 서버 문제가 더 급해요.', response: '그건 개발팀이 해결해야 하고요. 우리는 마케팅 대응 준비해야죠.', mood: 'neutral' },
        ]
      }
    ],
    r3: [
      {
        id: 'park_r3_1',
        type: 'support',
        trigger: 'any',
        opening: '(긴박하게) 민서 씨, 지금 트위터 봤어요?',
        lines: [
          '#무드링오류 실시간 트렌딩이에요.',
          '빨리 공식 계정에서 뭔가 올려야 할 것 같아요.',
          '근데 법무팀 지시가 결함 인정 금지잖아요. 어떻게 쓸지 막막해요.'
        ],
        choices: [
          { text: '"현재 일부 사용자 불편을 인지하고 있으며 기술팀이 확인 중입니다" 정도 어때요?', response: '완벽해요! 인정도 아니고 무시도 아닌 딱 그 선. 제가 초안 올려줄게요.', mood: 'positive' },
          { text: '제가 초안 작성 중이에요. 잠깐만 기다려줘요.', response: '알겠어요. 저도 같이 초안 써볼게요.', mood: 'neutral' },
        ]
      }
    ]
  },

  // ────────────────────────────────
  //  정하늘 사원
  // ────────────────────────────────
  jung: {
    r1: [
      {
        id: 'jung_r1_1',
        type: 'greeting',
        trigger: 'any',
        opening: '민서 선배! 선배는 보고서 어떻게 써요?',
        lines: [
          '저 아직 잘 모르겠어요. 수치 정리하면 끝인 줄 알았는데...',
          '팀장님이 지난번에 제 보고서 보시고 "이게 보고서야?" 하셨거든요 ㅠㅠ'
        ],
        choices: [
          { text: '수치보다 "왜 이런 결과가 나왔는지" 원인 분석이 핵심이에요.', response: '아!! 그렇구나요. 선배 진짜 대박이다. 그걸 몰랐어요 저는...', mood: 'positive' },
          { text: '나도 아직 배우는 중이에요. 같이 열심히 해봐요.', response: '선배도 그래요? 그럼 저만 힘든 게 아니구나 ㅠㅠ 감사해요!', mood: 'neutral' },
        ]
      }
    ],
    r2: [
      {
        id: 'jung_r2_1',
        type: 'greeting',
        trigger: 'any',
        opening: '선배, 저 틱톡 올려야 해요 말아야 해요?',
        lines: [
          '경쟁사 캠페인 타이밍이랑 겹치는데 어떻게 해야 할지 모르겠어요.',
          '팀장님한테 물어보려다가, 선배한테 먼저 물어보는 게 나을 것 같아서요.'
        ],
        choices: [
          { text: '서버 이슈 해결 전까지는 올리지 마요. 유저들이 앱 접속 안 되는데 홍보하면 역효과예요.', response: '아 맞다!! 그 생각을 못 했네요. 알겠어요 기다릴게요.', mood: 'positive' },
          { text: '일단 2시간 미루고 상황 보다가 결정해요.', response: '그게 나을 수도 있겠네요. 알겠어요 선배!', mood: 'neutral' },
        ]
      }
    ],
    r3: [
      {
        id: 'jung_r3_1',
        type: 'support',
        trigger: 'any',
        opening: '선배... 지금 많이 힘들죠?',
        lines: [
          '저 뭐 도와드릴 거 없어요?',
          '작은 것도 괜찮아요. 자료 찾는다든가, 메일 초안 같이 본다든가...'
        ],
        choices: [
          { text: '#무드링오류 관련 게시물 스크린샷이랑 반응 정리해줄 수 있어요?', response: '네! 지금 바로 할게요. 5분 안에 정리해 드릴게요!', mood: 'positive' },
          { text: '고마운데 지금은 혼자 하는 게 빠를 것 같아요.', response: '알겠어요. 필요하면 언제든 불러요 선배!', mood: 'neutral' },
        ]
      }
    ]
  },

  // ────────────────────────────────
  //  최현우 개발팀 과장
  // ────────────────────────────────
  choi: {
    r1: [
      {
        id: 'choi_r1_1',
        type: 'conflict',
        trigger: 'any',
        opening: '(차갑게) 마케팅팀이죠?',
        lines: [
          '저번 캠페인 때 트래픽 예측 수치 보내드렸는데, 실제로 2배나 초과했잖아요.',
          '우리 팀 야근 하루 꼬박 했어요.',
          '다음 캠페인 할 때는 제발 사전에 트래픽 예측 공유해 주세요.'
        ],
        choices: [
          { text: '죄송해요. 다음 캠페인 계획할 때 개발팀이랑 사전 조율할게요.', response: '그렇게 해주시면 저희도 준비할 수 있어요. 감사합니다.', mood: 'positive' },
          { text: '캠페인 성과가 예측보다 좋게 나온 건 좋은 일 아닌가요?', response: '(날카롭게) 그 좋은 결과를 위해 개발팀이 밤새 서버 붙잡고 있었다고요.', mood: 'negative', consequence: 'choi_conflict_escalated' },
        ]
      }
    ],
    r2: [
      {
        id: 'choi_r2_1',
        type: 'conflict',
        trigger: 'any',
        opening: '(바쁜 표정) 결정 내려줬어요?',
        lines: [
          '서버 15분 내로 결정해달라고 메일 보냈는데.',
          '시간 없어요. 우리 팀이 대기하고 있어요.'
        ],
        choices: [
          { text: '서버 증설로 가주세요. 캠페인은 지금 유지하겠습니다.', response: '알겠어요. 바로 시작할게요. 90분 정도 걸릴 거예요.', mood: 'positive' },
          { text: '캠페인 중단할게요. 즉시 트래픽 줄여드릴게요.', response: '알겠습니다. 처리할게요.', mood: 'neutral' },
          { text: '아직 결정 못 했어요.', response: '(무표정) 그럼 우리가 판단해서 처리할게요. 나중에 따지지 마세요.', mood: 'negative', consequence: 'choi_takes_over' },
        ]
      }
    ],
    r3: [
      {
        id: 'choi_r3_1',
        type: 'advice',
        trigger: 'any',
        opening: '(뜻밖에 조용히 다가와) 민서 씨.',
        lines: [
          '사용자들이 말하는 오류... 저도 확인해봤는데, 실제 버그예요.',
          'v2.1 업데이트에서 감정 기록 동기화 로직에 문제가 생겼어요.',
          '공식 메시지 쓸 때 "기술팀이 원인을 파악 중" 이라고 쓰면 정확한 표현이에요.'
        ],
        choices: [
          { text: '고마워요. 그 표현 사용할게요. 언제쯤 수정될 것 같아요?', response: '오늘 밤 안에 핫픽스 배포 예정이에요. 내일 아침엔 정상화돼요.', mood: 'positive' },
          { text: '법무팀에서 결함 인정 금지라고 했는데...', response: '"기술팀 확인 중"은 결함 인정이 아니에요. 사실 서술이에요. 법무도 OK할 거예요.', mood: 'positive' },
        ]
      }
    ]
  },

  // ────────────────────────────────
  //  이수진 고객경험팀 대리
  // ────────────────────────────────
  lee: {
    r1: [
      {
        id: 'lee_r1_1',
        type: 'advice',
        trigger: 'any',
        opening: '민서 씨, 저 고객경험팀 이수진이에요.',
        lines: [
          '무드링 유저들이 진짜 원하는 게 뭔지 궁금하지 않아요?',
          '저희 팀 데이터 보면, 유저들이 가장 많이 쓰는 기능은 "감정 일기"예요.',
          '근데 마케팅에서 주로 강조하는 건 "감정 분석 AI"고요. 갭이 있어요.'
        ],
        choices: [
          { text: '그 데이터 공유해 줄 수 있어요? 보고서에 활용하고 싶어요.', response: '물론이죠! 지금 바로 공유할게요. 같이 협업하면 좋을 것 같아요.', mood: 'positive' },
          { text: '흥미롭네요. 마케팅 메시지 방향 바꿀 수도 있겠는데요.', response: '맞아요! 유저가 이미 쓰는 기능을 강조하면 전환율도 올라갈 거예요.', mood: 'positive' },
        ]
      }
    ],
    r2: [
      {
        id: 'lee_r2_1',
        type: 'advice',
        trigger: 'any',
        opening: '민서 씨, 경쟁사 대응 어떻게 할지 생각해봤어요?',
        lines: [
          '저희 팀에서 유저 이탈률 모니터링하고 있는데, 아직은 유의미한 변화 없어요.',
          '충성 유저들은 무드링의 "감정 깊이"를 좋아하는 거거든요.',
          '가격 경쟁보다는 커뮤니티랑 스토리로 가는 게 맞는 것 같아요.'
        ],
        choices: [
          { text: '커뮤니티 UGC 콘텐츠 활용 전략이 좋겠네요. 같이 기획해볼까요?', response: '완전 찬성이에요! 유저 감정 일기 공유 캠페인 어때요?', mood: 'positive' },
          { text: '가격 프로모션도 병행해야 하지 않을까요?', response: '단기적으론 효과 있지만, 우리 브랜드 포지셔닝이랑 안 맞을 수 있어요.', mood: 'neutral' },
        ]
      }
    ],
    r3: [
      {
        id: 'lee_r3_1',
        type: 'support',
        trigger: 'any',
        opening: '민서 씨, SNS 위기 대응 메시지 쓰는 거 도와줄까요?',
        lines: [
          '고객경험팀 입장에서 조언드리면, 유저들은 지금 "불안"해하는 거예요.',
          '"우리가 알고 있고, 확인 중이다"라는 메시지가 제일 중요해요.',
          '"죄송합니다" 는 오히려 역효과예요. "함께 해결하겠다"는 톤이 맞아요.'
        ],
        choices: [
          { text: '그 방향으로 쓸게요. 초안 보여드릴게요.', response: '좋아요. 제가 피드백 드릴게요.', mood: 'positive' },
          { text: '법무팀이 너무 제약을 많이 걸어서 쓰기 어려워요.', response: '이해해요. 근데 "기술팀이 확인 중입니다, 불편을 드려 죄송합니다" 정도는 문제없을 거예요.', mood: 'positive' },
        ]
      }
    ]
  }
};

// ── NPC 상태 추적 ──
let npcStates = {};
NPC_INFO.forEach(n => { npcStates[n.id] = { talked: false, mood: 'neutral', history: [] }; });

// ── 현재 라운드에 맞는 대화 가져오기 ──
function getNpcDialogue(npcId, round) {
  const dialogues = NPC_DIALOGUES[npcId]?.[`r${round}`];
  if (!dialogues || dialogues.length === 0) return null;
  const state = npcStates[npcId];
  // 아직 안 한 대화 우선
  const unused = dialogues.filter(d => !state.history.includes(d.id));
  if (unused.length > 0) return unused[Math.floor(Math.random() * unused.length)];
  // 다 했으면 랜덤으로
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}

// ── NPC 대화 기록 ──
function recordNpcTalk(npcId, dialogueId, choiceIdx) {
  const state = npcStates[npcId];
  state.talked = true;
  if (!state.history.includes(dialogueId)) state.history.push(dialogueId);
  logAction('npc_talk', `${npcId}:${dialogueId}:${choiceIdx}`, 5);
}
