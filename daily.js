/* ===== 🥚 전기 정령 + 오늘의 한 판 =====
   설계 원칙:
   1. 홈은 "정령 + 큰 버튼 하나"다. 뭘 배울지는 앱이 정한다 — 선택지가 없어야 여는 문턱이 낮다.
   2. 정령은 오직 공부로만 자란다. 단계는 저장하지 않고 S.srs에서 매번 계산한다
      (마스터한 개념 수 = 성장). 수집·뽑기 축을 만들지 않는다 — 조사 문서의 원칙.
   3. 한 판 = 복습(정령 밥주기, 최대 3개) → 새 개념 1개(여정 다음 단계) → 완료 축하.
      틀려도 잃는 것 없음. */
'use strict';

/* ---------- 정령 ---------- */
var SPIRIT_STAGES = [
  { at: 0, emoji: '🥚', name: '찌릿알', line: '아직 알 속에서 잠자고 있어요' },
  { at: 3, emoji: '⚡', name: '꼬마 스파키', line: '알을 깨고 나왔어요!' },
  { at: 10, emoji: '✨', name: '스파키', line: '반짝반짝 빛나기 시작했어요' },
  { at: 25, emoji: '🔥', name: '볼트', line: '뜨겁게 타오르고 있어요' },
  { at: 45, emoji: '🌟', name: '썬더', line: '별처럼 눈부셔요' },
  { at: 70, emoji: '🌩️', name: '스톰', line: '폭풍을 부르는 힘!' },
  { at: 100, emoji: '🐉', name: '볼트 드래곤', line: '전설의 모습이 되었어요!' }
];

/* 마스터한 개념 수 = 정령의 먹이. 새 저장 구조 없이 S.srs만 읽는다 */
function spiritFood() {
  var n = 0;
  for (var k in S.srs) if (S.srs[k] && S.srs[k].lvl >= 3) n++;
  return n;
}
function spiritStage(food) {
  var st = SPIRIT_STAGES[0], next = null;
  for (var i = 0; i < SPIRIT_STAGES.length; i++) {
    if (food >= SPIRIT_STAGES[i].at) st = SPIRIT_STAGES[i];
    else { next = SPIRIT_STAGES[i]; break; }
  }
  return { st: st, next: next };
}

window.spiritHomeHtml = function () {
  var food = spiritFood();
  var info = spiritStage(food);
  var today = S.daily[todayStr()] || { answered: 0, correct: 0 };
  var doneToday = S.dailyDone === todayStr();

  // 진화 순간 축하 (단계 인덱스만 저장)
  var idx = SPIRIT_STAGES.indexOf(info.st);
  if (typeof S.spiritStage !== 'number') { S.spiritStage = idx; saveState(); }
  var evolved = idx > S.spiritStage;
  if (evolved) {
    S.spiritStage = idx; saveState();
    if (window.celebrate) celebrate('big');
    if (typeof SFX !== 'undefined') SFX.levelup();
  }

  var say = evolved ? '🎉 진화했어요! ' + info.st.name + '이(가) 되었어요!' :
    doneToday ? '오늘 약속 지켰어요! 최고예요 🎉' :
    today.answered === 0 ? '배고파요… 오늘의 한 판으로 밥 주세요!' :
    today.answered < 10 ? '냠냠! 조금만 더 먹고 싶어요' :
    '오늘 많이 먹었어요! 고마워요';

  var growHtml = '';
  if (info.next) {
    var span = info.next.at - info.st.at;
    var cur = food - info.st.at;
    growHtml = '<div class="sp-grow"><div class="sp-grow-bar"><i style="width:' + Math.round(cur / span * 100) + '%"></i></div>' +
      '<span>' + info.next.emoji + ' ' + esc(info.next.name) + '까지 개념 <b>' + (info.next.at - food) + '개</b></span></div>';
  } else {
    growHtml = '<div class="sp-grow"><span>👑 최종 진화! 모든 걸 해냈어요</span></div>';
  }

  return '<div class="spirit-card' + (evolved ? ' evolved' : '') + '">' +
    '<div class="sp-say">' + esc(say) + '</div>' +
    '<div class="sp-body" id="spBody">' + info.st.emoji + '</div>' +
    '<div class="sp-name">' + esc(info.st.name) + ' <span class="sp-food">개념 ' + food + '개 먹음</span></div>' +
    growHtml + '</div>';
};

/* ---------- 오늘의 한 판 ---------- */
var dailyPhase = null;      // 'review' | 'learn' | null
var dailyReviewCount = 0;

/* 복습거리 고르기: 착각 구역 > 미극복 오답 > SRS 만기. 최대 3개 */
function dailyPickReviews() {
  var seen = {}, out = [];
  function push(subjKey, ui) {
    var k = unitKeyOf(subjKey, ui);
    if (seen[k] || out.length >= 3) return;
    var subj = subjectByKey(subjKey);
    if (!subj || !subj.units[ui]) return;
    seen[k] = 1;
    out.push({ subjKey: subjKey, ui: ui, which: whichToServe(subjKey, ui), isFollowup: false, isReview: true });
  }
  Object.keys(S.illusion || {}).forEach(function (k) {
    var p = k.split('-'); push(p[0], parseInt(p[1], 10));
  });
  wrongList().filter(function (w) { return !w.info.overcame; }).forEach(function (w) { push(w.subjKey, w.ui); });
  if (window.gardenPlants) {
    window.gardenPlants().filter(function (p) { return p.over >= 0; }).forEach(function (p) { push(p.subjKey, p.ui); });
  }
  return out;
}

window.startDailyRun = function () {
  if (typeof actx === 'function') actx();
  var reviews = dailyPickReviews();
  dailyReviewCount = reviews.length;
  if (reviews.length) {
    dailyPhase = 'review';
    session = {
      mode: 'daily', subjKey: null, dailyChain: true,
      queue: reviews, idx: 0, followups: [], answered: [], followupStart: -1,
      locked: false, startTs: Date.now()
    };
    renderQuiz();
  } else {
    dailyLearnPhase();
  }
};

/* 복습 세트가 끝나면 renderSetResult 가 이리로 보낸다 */
window.dailyAfterReview = function (s) {
  var right = s.answered.filter(function (r) { return r.ok; }).length;
  var food = spiritFood();
  var info = spiritStage(food);
  $('#view').innerHTML =
    '<div class="card daily-mid">' +
    '<div class="sp-body eat">' + info.st.emoji + '</div>' +
    '<div class="dm-title">냠냠! 복습 ' + right + '개를 맛있게 먹었어요</div>' +
    '<p class="muted">이제 오늘의 새 개념을 배우러 가요. 처음 보는 건 개념부터 보여드려요!</p>' +
    '<button class="btn btn-primary btn-big" id="dmGo">▶ 새 개념 배우기</button>' +
    '</div>';
  $('#dmGo').onclick = function () { dailyLearnPhase(); };
  window.scrollTo(0, 0);
};

function dailyLearnPhase() {
  dailyPhase = 'learn';
  if (!window.journeyFlat) { renderHome(); return; }
  var flat = window.journeyFlat(), cur = window.journeyCur();
  if (cur >= flat.length) { window.dailyFinish(true); return; }
  window.journeyPlayNode(flat[cur].subjKey, flat[cur].ui);
}

/* journeyNodeComplete 가 호출한다. 한 판 중이면 true 를 돌려 완료 화면을 가로챈다 */
window.dailyOnNodeDone = function () {
  if (dailyPhase !== 'learn') return false;
  window.dailyFinish(false);
  return true;
};

window.dailyFinish = function (allDone) {
  dailyPhase = null;
  var first = S.dailyDone !== todayStr();
  S.dailyDone = todayStr();
  saveState();
  if (window.celebrate) celebrate('big');
  if (typeof SFX !== 'undefined') SFX.victory();

  var food = spiritFood();
  var info = spiritStage(food);
  var streak = streakDays();
  var flat = window.journeyFlat ? window.journeyFlat() : [];
  var cur = window.journeyCur ? window.journeyCur() : 0;
  var nextTopic = cur < flat.length ? flat[cur].topic : null;

  $('#view').innerHTML =
    '<div class="card daily-done">' +
    '<div class="vn-stamp">한 판 완료</div>' +
    '<div class="sp-body happy">' + info.st.emoji + '</div>' +
    '<div class="dd-title">' + (allDone ? '모든 단계를 다 배웠어요! 이제 복습만 하면 돼요' : '오늘 몫을 다 했어요!') + '</div>' +
    '<div class="ld-stats">' +
    '<div><b>' + dailyReviewCount + '</b><span>복습</span></div>' +
    '<div><b>' + (allDone ? 0 : 1) + '</b><span>새 개념</span></div>' +
    '<div><b>' + (streak || 1) + '일</b><span>연속</span></div>' +
    '</div>' +
    (nextTopic ? '<p class="muted">내일의 한 판: <b>' + esc(nextTopic) + '</b></p>' : '') +
    '<div class="result-actions">' +
    '<button class="btn btn-primary btn-big" id="ddMore">한 판 더! ▶</button>' +
    '<button class="btn btn-ghost" id="ddHome">정령한테 가기</button>' +
    '</div></div>';
  $('#ddMore').onclick = function () { window.startDailyRun(); };
  $('#ddHome').onclick = function () { renderHome(); };
  window.scrollTo(0, 0);
};
