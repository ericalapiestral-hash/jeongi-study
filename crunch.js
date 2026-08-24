/* ===== 🔥 벼락치기 코스 — 며칠 안 남았을 때의 전략 ===== */
'use strict';

function daysLeft() {
  if (!S.examDate) return null;
  return Math.ceil((new Date(S.examDate + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000);
}

/* 남은 일수에 따른 "오늘 할 일" 플랜 (D-day 카운트다운) */
var CRUNCH_PLAN = [
  { d: 7, title: '전기설비기술기준 시작', sub: '가장 점수가 빨리 오르는 과목부터. 오늘부터 이틀은 여기만 파요.', acts: ['kec', 'codex'] },
  { d: 6, title: '전기설비기술기준 몰아치기', sub: '어제 것 복습 + 새 문제. 이 과목에서 70~80점을 벌어야 해요.', acts: ['kec'] },
  { d: 5, title: '전기설비기술기준 몰빵', sub: '암기 과목이라 점수가 제일 빨리 올라요. 여기서 70점 이상을 노려요.', acts: ['kec', 'codex'] },
  { d: 4, title: '전기설비 + 전력공학', sub: '설비 복습하고, 전력공학 암기 부분으로 넘어가요.', acts: ['kec', 'power'] },
  { d: 3, title: '전력공학 + 전기기기', sub: '전력공학 마무리, 전기기기는 공식 3개(동기속도·슬립·권수비)부터.', acts: ['power', 'machine', 'codex'] },
  { d: 2, title: '전기기기 + 과락 방어', sub: '전기기기 마무리, 자기학·회로는 쉬운 유형만 골라 과락(40점)만 지켜요.', acts: ['machine', 'elim'] },
  { d: 1, title: '총정리 + 모의고사', sub: '미니 모의고사로 실전 감각, 틀린 것만 빠르게 복습. 소거법 연습.', acts: ['exam', 'elim'] },
  { d: 0, title: '시험 당일!', sub: '새로 외우려 하지 마세요. 아침에 공식 도감 한 번 훑고, 아래 시험장 전략만 기억해요.', acts: ['codex'] }
];

var ACT_LABEL = {
  kec: { icon: '📜', name: '전기설비기술기준 풀기', go: function () { startSession('subject', 'kec'); } },
  power: { icon: '🗼', name: '전력공학 풀기', go: function () { startSession('subject', 'power'); } },
  machine: { icon: '⚙️', name: '전기기기 풀기', go: function () { startSession('subject', 'machine'); } },
  codex: { icon: '📐', name: '공식 도감 보기', go: function () { if (window.renderCodex) renderCodex(); } },
  elim: { icon: '✂️', name: '소거법 훈련(찍기 기술)', go: function () { if (window.startElim) startElim(); } },
  exam: { icon: '📝', name: '미니 모의고사', go: function () { startSession('exam'); } }
};

function renderCrunch() {
  session = null; lessonRun = null;
  var v = $('#view');
  var dl = daysLeft();

  // 남은 일수에 맞는 플랜 항목 고르기 (없으면 5일치 그대로)
  var todayPlan = null;
  if (dl !== null) {
    todayPlan = CRUNCH_PLAN.find(function (p) { return p.d === dl; });
    if (!todayPlan && dl > 5) todayPlan = CRUNCH_PLAN[0];
    if (!todayPlan && dl < 0) todayPlan = null;
  }

  var ddayHtml;
  if (dl === null) {
    ddayHtml = '<div class="crunch-dday no-date" id="crunchSetDate">📅 시험 날짜를 정하면 <b>남은 날짜에 맞춘 오늘 할 일</b>을 정해드려요<br><span class="muted">여기를 눌러 시험날 입력</span></div>';
  } else if (dl < 0) {
    ddayHtml = '<div class="crunch-dday">시험이 지났어요. 결과가 좋기를 바라요! 🍀</div>';
  } else {
    ddayHtml = '<div class="crunch-dday">🔥 시험까지 <b>' + (dl === 0 ? '오늘!' : 'D-' + dl) + '</b></div>';
  }

  // 오늘 할 일
  var todayHtml = '';
  if (todayPlan) {
    var acts = todayPlan.acts.map(function (a) {
      var A = ACT_LABEL[a];
      return '<button class="crunch-act" data-act="' + a + '">' + A.icon + ' ' + esc(A.name) + ' ▶</button>';
    }).join('');
    todayHtml = '<div class="card crunch-today">' +
      '<div class="ct-badge">오늘 할 일</div>' +
      '<div class="ct-title">' + esc(todayPlan.title) + '</div>' +
      '<div class="ct-sub">' + esc(todayPlan.sub) + '</div>' +
      '<div class="ct-acts">' + acts + '</div></div>';
  }

  v.innerHTML =
    '<div class="card crunch-hero">' +
    '<div class="crunch-h1">🔥 벼락치기 코스</div>' +
    ddayHtml +
    '<p class="crunch-intro">며칠 안 남았을 때는 <b>다 공부하면 안 돼요.</b> 점수가 빨리 오르는 것부터 잡고, 어려운 건 과락(40점)만 지키는 게 정답이에요.</p>' +
    '</div>' +

    todayHtml +

    '<div class="card">' +
    '<b style="font-size:1.02rem">🎯 남은 며칠, 이 전략만 기억해요</b>' +
    '<div class="strat-row gold"><span class="strat-medal">🥇</span><div><b>전기설비기술기준 (KEC)</b> — 순수 암기! 계산 없음. 여기서 <b>70~80점</b>을 벌어요. 최우선.</div></div>' +
    '<div class="strat-row"><span class="strat-medal">🥈</span><div><b>전력공학</b> — 암기 위주 + 반복 계산 몇 개. <b>60점</b> 목표.</div></div>' +
    '<div class="strat-row"><span class="strat-medal">🥉</span><div><b>전기기기</b> — 암기 + 공식 3개(동기속도·슬립·권수비). <b>55점</b>.</div></div>' +
    '<div class="strat-row shield"><span class="strat-medal">🛡</span><div><b>전기자기학·회로이론</b> — 다 버려도 돼요. <b>과락(40점=8문제)만 방어.</b> 쉬운 유형 + 소거법으로.</div></div>' +
    '<div class="strat-sum">이렇게만 해도 → 평균 <b>60점</b> 넘어서 합격이에요. 계산 과목 붙잡다 암기 과목 놓치는 게 제일 흔한 불합격 이유예요.</div>' +
    '</div>' +

    '<div class="card">' +
    '<b style="font-size:1.02rem">📋 5일 코스 한눈에 보기</b>' +
    CRUNCH_PLAN.filter(function (p) { return p.d >= 0; }).map(function (p) {
      var isToday = dl !== null && p.d === dl;
      return '<div class="plan-row' + (isToday ? ' now' : '') + '">' +
        '<span class="plan-d">' + (p.d === 0 ? '당일' : 'D-' + p.d) + '</span>' +
        '<span class="plan-t">' + esc(p.title) + (isToday ? ' <b>← 오늘</b>' : '') + '</span></div>';
    }).join('') +
    '</div>' +

    '<div class="card exam-strat">' +
    '<b style="font-size:1.02rem">🏫 시험장에서 (당일 이것만!)</b>' +
    '<div class="es-row">1️⃣ <b>아는 것부터</b> 풀고, 모르는 건 별표 치고 넘어가요. 한 문제에 붙잡히지 마세요.</div>' +
    '<div class="es-row">2️⃣ 모르는 문제는 <b>소거법</b>! 확실히 아닌 보기 2개를 지우면 확률이 50%로 올라요. 빈칸은 절대 남기지 말고 <b>무조건 찍기.</b></div>' +
    '<div class="es-row">3️⃣ <b>과락 계산</b>: 한 과목에서 최소 8개(40점)는 맞혀야 해요. 어려운 과목도 8개는 사수!</div>' +
    '<div class="es-row">4️⃣ 시간은 과목당 30분. 계산 문제는 <b>뒤로 미루고</b> 암기 문제부터 빠르게.</div>' +
    '<div class="es-row">5️⃣ 두 번 떨어진 건 실패가 아니라 <b>세 번째를 준비한 경험</b>이에요. 아는 것만 침착하게 풀면 돼요.</div>' +
    '</div>' +
    '<div id="crunchDateWrap"></div>';

  document.querySelectorAll('[data-act]').forEach(function (b) {
    b.onclick = function () { ACT_LABEL[b.getAttribute('data-act')].go(); };
  });
  var sd = $('#crunchSetDate');
  if (sd) sd.onclick = function () {
    var wrap = $('#crunchDateWrap');
    wrap.innerHTML = '<div class="card" style="text-align:center"><b>시험 날짜를 골라주세요</b><br>' +
      '<input type="date" id="crunchDate" style="font-family:inherit;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;margin-top:10px;font-size:1rem">' +
      '<br><button class="btn btn-primary btn-sm" id="crunchDateSave" style="margin-top:10px">저장</button></div>';
    $('#crunchDateSave').onclick = function () {
      var val = $('#crunchDate').value;
      if (val) { S.examDate = val; saveState(); renderCrunch(); }
    };
    wrap.scrollIntoView({ behavior: 'smooth' });
  };
  updateBadge();
  window.scrollTo(0, 0);
}
window.renderCrunch = renderCrunch;
window.daysLeft = daysLeft;

/* 홈 상단 벼락치기 배너 — 시험이 14일 이내일 때만 크게 표시 */
window.crunchBannerHtml = function () {
  var dl = daysLeft();
  if (dl === null || dl < 0 || dl > 14) return '';
  var label = dl === 0 ? '오늘이 시험날!' : 'D-' + dl;
  return '<div class="crunch-banner" id="crunchBanner">' +
    '<div class="cb-dday">🔥 ' + label + '</div>' +
    '<div class="cb-text"><b>벼락치기 코스</b>로 남은 시간 딱 맞게 공부해요<br>' +
    '<span>다 하려 말고, 점수 잘 나오는 것부터!</span></div>' +
    '<span class="cb-go">시작 ▶</span></div>';
};
