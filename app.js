/* ===== 전기산업기사 필기 스터디 앱 ===== */
'use strict';

var DATA = window.EXAM_DATA || { subjects: [] };
var LS_KEY = 'jeongi-study-v1';
var SET_SIZE = 5;

/* ---------- 상태 ---------- */
function defaultState() {
  return {
    examDate: null,
    attempts: {},   // qid -> {tries, correct, last:'o'|'x', ts}
    wrong: {},      // unitKey -> {overcame, wrongQ:'m'|'t', ts}
    daily: {},      // 'YYYY-MM-DD' -> {answered, correct}
    srs: {},        // unitKey -> {lvl, due:'YYYY-MM-DD'} 간격 반복
    goal: 15,       // 하루 목표 문제 수
    celebrated: '', // 목표 달성 축하를 보여준 날짜
    totalSets: 0,
    xp: 0,          // 경험치
    badges: {},     // badgeId -> 획득 날짜
    lessonProg: {}, // unitKey -> {done, date}
    labSeen: {},    // simId -> true
    goalDays: 0,    // 목표 달성한 날 수
    bossDefeated: {}, // subjKey -> date
    mute: false,
    node: {},       // "subjKey-ui" -> {taught, solved} 여정 노드 진행
    onboarded: false,
    formulaLearned: {}, // "subjKey-idx" -> true 공식 수집
    dq: {}          // 'YYYY-MM-DD' -> 일일 퀘스트 진행 카운터
  };
}
function loadState() {
  try {
    var raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultState();
    var s = JSON.parse(raw);
    var d = defaultState();
    for (var k in d) if (!(k in s)) s[k] = d[k];
    return s;
  } catch (e) { return defaultState(); }
}
function saveState() { localStorage.setItem(LS_KEY, JSON.stringify(S)); }
var S = loadState();
var session = null;

/* ---------- 유틸 ---------- */
function $(sel) { return document.querySelector(sel); }
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function todayStr() { return fmtDate(new Date()); }
function addDays(dateStr, n) {
  var d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}
var SRS_INTERVALS = [1, 3, 7, 14, 30]; // 연속 정답 횟수에 따른 재등장 간격(일)
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function subjectByKey(key) {
  for (var i = 0; i < DATA.subjects.length; i++) if (DATA.subjects[i].key === key) return DATA.subjects[i];
  return null;
}
// 실제 시험 과목만 (전기 기초 등 foundational 제외)
function examSubjects() { return DATA.subjects.filter(function (s) { return !s.foundational; }); }
function qidOf(subjKey, ui, which) { return subjKey + '-' + ui + '-' + which; }
function unitKeyOf(subjKey, ui) { return subjKey + '-' + ui; }
function getQuestion(item) {
  var subj = subjectByKey(item.subjKey);
  if (!subj) return null;
  var unit = subj.units[item.ui];
  if (!unit) return null;
  return { unit: unit, q: item.which === 'm' ? unit.main : unit.twin, subj: subj };
}
var CIRCLED = ['①', '②', '③', '④'];

var CHEERS = [
  '오늘 푸는 한 문제가 합격의 한 걸음이에요.',
  '20점에서 시작해도 괜찮아요. 방향만 맞으면 도착해요.',
  '어제의 나보다 한 문제만 더. 그게 전부예요.',
  '이해 안 되던 게 어느 날 갑자기 풀려요. 그날까지 같이 가요.',
  '틀리는 건 공부가 되고 있다는 증거예요.',
  '합격하고 웃는 모습, 부모님이 곧 보시게 될 거예요.',
  '천천히 가도 멈추지만 않으면 돼요.'
];
function todayCheer() {
  var d = new Date();
  var idx = (d.getFullYear() * 366 + (d.getMonth() + 1) * 31 + d.getDate()) % CHEERS.length;
  return CHEERS[idx];
}

/* ---------- XP · 레벨 · 배지 ---------- */
var LEVELS = [
  { xp: 0, title: '⚡ 전기 입문자' },
  { xp: 100, title: '🔌 견습 전기공' },
  { xp: 250, title: '🔋 회로 탐험가' },
  { xp: 450, title: '🧲 전자기 마법사' },
  { xp: 700, title: '⚙️ 변압기 조련사' },
  { xp: 1000, title: '🗼 송전 마스터' },
  { xp: 1500, title: '🎯 합격 사정권' },
  { xp: 2200, title: '👑 전기의 신' }
];
function levelInfo() {
  var lv = 0;
  for (var i = 0; i < LEVELS.length; i++) if (S.xp >= LEVELS[i].xp) lv = i;
  var cur = LEVELS[lv];
  var next = LEVELS[lv + 1] || null;
  return {
    n: lv + 1, title: cur.title,
    cur: S.xp - cur.xp,
    span: next ? next.xp - cur.xp : 1,
    max: !next
  };
}
function toast(msg, big) {
  var wrap = document.getElementById('toastWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toastWrap';
    document.body.appendChild(wrap);
  }
  var t = document.createElement('div');
  t.className = 'toast' + (big ? ' big' : '');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(function () { t.classList.add('show'); }, 20);
  setTimeout(function () { t.classList.remove('show'); }, big ? 3600 : 2200);
  setTimeout(function () { t.remove(); }, big ? 4200 : 2800);
}
function addXP(n, silent) {
  var before = levelInfo().n;
  S.xp += n;
  saveState();
  if (!silent) toast('+' + n + ' XP ✨');
  var after = levelInfo();
  if (after.n > before) {
    toast('🎉 레벨 업! Lv.' + after.n + ' ' + after.title, true);
    if (window.celebrate) celebrate('big');
    if (window.haptic) haptic('big');
    if (window.SFX && SFX.levelup) SFX.levelup();
  }
}
var BADGES = [
  { id: 'first_set', name: '첫 발걸음', icon: '👣', desc: '첫 세트 완료', check: function () { return S.totalSets >= 1; } },
  { id: 'first_overcome', name: '첫 극복', icon: '🌱', desc: '오답을 쌍둥이 문제로 극복', check: function () { for (var k in S.wrong) if (S.wrong[k].overcame) return true; return false; } },
  { id: 'overcome10', name: '오답 사냥꾼', icon: '🏹', desc: '오답 10개 극복', check: function () { var n = 0; for (var k in S.wrong) if (S.wrong[k].overcame) n++; return n >= 10; } },
  { id: 'streak3', name: '3일 연속', icon: '🔥', desc: '3일 연속 공부', check: function () { return streakDays() >= 3; } },
  { id: 'streak7', name: '일주일 개근', icon: '🚀', desc: '7일 연속 공부', check: function () { return streakDays() >= 7; } },
  { id: 'streak14', name: '2주 폭주', icon: '🌋', desc: '14일 연속 공부', check: function () { return streakDays() >= 14; } },
  { id: 'goal5', name: '약속을 지키는 사람', icon: '🤝', desc: '하루 목표 5번 달성', check: function () { return (S.goalDays || 0) >= 5; } },
  { id: 'lesson10', name: '이야기 수집가', icon: '📖', desc: '레슨 10개 완주', check: function () { var n = 0; for (var k in S.lessonProg) if (S.lessonProg[k].done) n++; return n >= 10; } },
  { id: 'lesson_all', name: '백과사전', icon: '📚', desc: '레슨 50개 완주', check: function () { var n = 0; for (var k in S.lessonProg) if (S.lessonProg[k].done) n++; return n >= 50; } },
  { id: 'lab_all', name: '실험 정신', icon: '🧪', desc: '실험실 전부 체험', check: function () { return window.SIMS && Object.keys(S.labSeen).length >= window.SIMS.length; } },
  { id: 'q100', name: '백문백답', icon: '💯', desc: '100문제 풀기', check: function () { var n = 0; for (var d in S.daily) n += S.daily[d].answered; return n >= 100; } },
  { id: 'mock_pass', name: '합격 예감', icon: '🎊', desc: '미니 모의고사 합격권', check: function () { return !!S.mockPassed; } },
  { id: 'boss1', name: '보스 슬레이어', icon: '⚔️', desc: '보스 1마리 처치', check: function () { return Object.keys(S.bossDefeated || {}).length >= 1; } },
  { id: 'boss_all', name: '5대 보스 정복자', icon: '👑', desc: '보스 5마리 전부 처치', check: function () { return Object.keys(S.bossDefeated || {}).length >= 5; } },
  { id: 'combo10', name: '콤보 마스터', icon: '🔥', desc: '보스전 10콤보 달성', check: function () { return (S.maxComboEver || 0) >= 10; } },
  { id: 'formula5', name: '공식 수집가', icon: '📐', desc: '공식 5개 외우기', check: function () { var n = 0; for (var k in (S.formulaLearned || {})) if (S.formulaLearned[k]) n++; return n >= 5; } },
  { id: 'formula_all', name: '공식 마스터', icon: '🧠', desc: '모든 공식 외우기', check: function () { var n = 0; for (var k in (S.formulaLearned || {})) if (S.formulaLearned[k]) n++; var tot = window.FORMULA_DATA ? (FORMULA_DATA.subjects || []).reduce(function (a, s) { return a + s.cards.length; }, 0) : 99; return tot > 0 && n >= tot; } },
  { id: 'dojo10', name: '계산 수련생', icon: '⚡', desc: '계산 도장 10문제 완주', check: function () { return (S.dojoCleared || 0) >= 10; } },
  { id: 'drill10', name: '지수 감별사', icon: '🔢', desc: '지수 훈련 10연속 정답', check: function () { return (S.drillBest || 0) >= 10; } }
];
function checkBadges() {
  BADGES.forEach(function (b) {
    if (S.badges[b.id]) return;
    var ok = false;
    try { ok = b.check(); } catch (e) { }
    if (ok) {
      S.badges[b.id] = todayStr();
      saveState();
      toast('🏅 배지 획득: ' + b.icon + ' ' + b.name + ' — ' + b.desc, true);
      addXP(25, true);
      if (window.celebrate) celebrate();
      if (window.haptic) haptic('big');
    }
  });
}

/* ---------- 통계 계산 ---------- */
function subjectStats(subj) {
  var attempted = 0, lastCorrect = 0, total = subj.units.length * 2;
  for (var ui = 0; ui < subj.units.length; ui++) {
    var whichs = ['m', 't'];
    for (var w = 0; w < 2; w++) {
      var a = S.attempts[qidOf(subj.key, ui, whichs[w])];
      if (a && a.tries > 0) {
        attempted++;
        if (a.last === 'o') lastCorrect++;
      }
    }
  }
  return {
    total: total,
    attempted: attempted,
    accuracy: attempted ? lastCorrect / attempted : null,
    expected: attempted ? Math.round((lastCorrect / attempted) * 100) : null
  };
}
function wrongList() {
  var out = [];
  for (var key in S.wrong) {
    var parts = key.split('-');
    var subjKey = parts[0], ui = parseInt(parts[1], 10);
    var subj = subjectByKey(subjKey);
    if (!subj || !subj.units[ui]) continue;
    out.push({ unitKey: key, subjKey: subjKey, ui: ui, info: S.wrong[key], topic: subj.units[ui].topic, subjName: subj.name });
  }
  out.sort(function (a, b) { return b.info.ts - a.info.ts; });
  return out;
}
function needReviewCount() {
  return wrongList().filter(function (w) { return !w.info.overcame; }).length;
}
function streakDays() {
  var n = 0;
  var d = new Date();
  while (true) {
    var key = fmtDate(d);
    var day = S.daily[key];
    var studied = (day && day.answered > 0);
    var shielded = !!(S.shieldUsed && S.shieldUsed[key]);  // 🛡 방패로 메운 날도 연속으로 인정
    if (studied || shielded) { n++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return n;
}

/* ---------- 문제 선택 ---------- */
function priorityOfUnit(subjKey, ui) {
  var am = S.attempts[qidOf(subjKey, ui, 'm')];
  var at = S.attempts[qidOf(subjKey, ui, 't')];
  var ukey = unitKeyOf(subjKey, ui);
  var srs = S.srs[ukey];
  if (S.illusion && S.illusion[ukey]) return -1;                     // 🔴 착각 구역 → 무조건 최우선
  if ((am || at) && srs && srs.due && srs.due <= todayStr()) return 0; // 복습 시간이 된 유닛 → 최우선
  if (!am && !at) return 1;                       // 한 번도 안 본 유닛
  if ((am && am.last === 'x') || (at && at.last === 'x')) return 2; // 최근에 틀림
  return 3;                                        // 맞혔던 유닛
}
function dueReviewCount() {
  var n = 0, t = todayStr();
  DATA.subjects.forEach(function (subj) {
    subj.units.forEach(function (u, ui) {
      var srs = S.srs[unitKeyOf(subj.key, ui)];
      if (srs && srs.due && srs.due <= t && lastSeenOfUnit(subj.key, ui) > 0) n++;
    });
  });
  return n;
}
/* 이미 잘 맞히는(마스터한) 쉬운 유닛 n개 — 연속 오답 후 착지용 */
function easyUnits(n, preferSubj) {
  var pool = [];
  DATA.subjects.forEach(function (subj) {
    subj.units.forEach(function (u, ui) {
      var srs = S.srs[unitKeyOf(subj.key, ui)];
      var am = S.attempts[qidOf(subj.key, ui, 'm')];
      if (!srs || srs.lvl < 2) return;
      if (!am || am.last !== 'o') return;
      pool.push({ subjKey: subj.key, ui: ui, which: whichToServe(subj.key, ui), isFollowup: false, isEasy: true,
        pri: subj.key === preferSubj ? 0 : 1 });
    });
  });
  pool.sort(function (a, b) { return a.pri - b.pri || Math.random() - 0.5; });
  return pool.slice(0, n);
}

function weakUnits() {
  var out = [];
  DATA.subjects.forEach(function (subj) {
    subj.units.forEach(function (u, ui) {
      var ukey = unitKeyOf(subj.key, ui);
      var am = S.attempts[qidOf(subj.key, ui, 'm')];
      var at = S.attempts[qidOf(subj.key, ui, 't')];
      var tries = (am ? am.tries : 0) + (at ? at.tries : 0);
      if (!tries) return;
      var corr = (am ? am.correct : 0) + (at ? at.correct : 0);
      var acc = corr / tries;
      var wrongNow = !!(S.wrong[ukey] && !S.wrong[ukey].overcame);
      if (wrongNow || acc < 0.6) {
        out.push({ subjKey: subj.key, ui: ui, topic: u.topic, subjName: subj.name, acc: acc, wrongNow: wrongNow });
      }
    });
  });
  out.sort(function (a, b) { return (b.wrongNow - a.wrongNow) || (a.acc - b.acc); });
  return out;
}
function lastSeenOfUnit(subjKey, ui) {
  var am = S.attempts[qidOf(subjKey, ui, 'm')];
  var at = S.attempts[qidOf(subjKey, ui, 't')];
  return Math.max(am ? am.ts : 0, at ? at.ts : 0);
}
function whichToServe(subjKey, ui) {
  var am = S.attempts[qidOf(subjKey, ui, 'm')];
  var at = S.attempts[qidOf(subjKey, ui, 't')];
  if (!am || am.tries === 0) return 'm';
  if (am.last === 'o' && (!at || at.last !== 'o')) return 't';
  if (am.last === 'x') return 'm';
  // 둘 다 맞혔으면 더 오래된 쪽
  if (at && am.ts > at.ts) return 't';
  return 'm';
}
function pickUnits(subjKey, n) {
  var pool = [];
  var subjects = subjKey ? [subjectByKey(subjKey)] : DATA.subjects;
  subjects.forEach(function (subj) {
    if (!subj) return;
    subj.units.forEach(function (u, ui) {
      pool.push({ subjKey: subj.key, ui: ui, pr: priorityOfUnit(subj.key, ui), seen: lastSeenOfUnit(subj.key, ui) });
    });
  });
  pool = shuffle(pool);
  pool.sort(function (a, b) { return a.pr - b.pr || a.seen - b.seen; });
  return pool.slice(0, n).map(function (p) {
    return { subjKey: p.subjKey, ui: p.ui, which: whichToServe(p.subjKey, p.ui), isFollowup: false };
  });
}

/* ---------- 세션 ---------- */
function startSession(mode, subjKey) {
  var queue = [];
  if (mode === 'subject' || mode === 'random') {
    queue = pickUnits(mode === 'subject' ? subjKey : null, SET_SIZE);
  } else if (mode === 'review') {
    var wl = wrongList().filter(function (w) { return !w.info.overcame; }).slice(0, 10);
    queue = wl.map(function (w) {
      var other = w.info.wrongQ === 'm' ? 't' : 'm';
      return { subjKey: w.subjKey, ui: w.ui, which: other, isFollowup: false, isReview: true };
    });
    if (!queue.length) { alert('복습할 오답이 없어요! 아주 잘하고 있다는 뜻이에요. 🎉'); return; }
  } else if (mode === 'exam') {
    examSubjects().forEach(function (subj) {
      var picks = shuffle(subj.units.map(function (u, ui) { return ui; })).slice(0, 5);
      picks.forEach(function (ui) {
        queue.push({ subjKey: subj.key, ui: ui, which: Math.random() < 0.5 ? 'm' : 't', isFollowup: false });
      });
    });
    queue = shuffle(queue);
  }
  if (!queue.length) { alert('아직 문제은행이 준비되지 않았어요.'); return; }
  session = {
    mode: mode, subjKey: subjKey || null,
    queue: queue, idx: 0, followups: [],
    answered: [], followupStart: -1,
    locked: false, startTs: Date.now()
  };
  renderQuiz();
}

/* 🔴 착각 구역만 모아서 풀기 */
function startIllusionSession() {
  var keys = Object.keys(S.illusion || {});
  if (!keys.length) { toast('착각 구역이 없어요! 아주 좋은 상태예요 👍'); return; }
  var queue = [];
  keys.slice(0, 10).forEach(function (k) {
    var p = k.split('-'), sk = p[0], ui = parseInt(p[1], 10);
    var subj = subjectByKey(sk);
    if (!subj || !subj.units[ui]) return;
    queue.push({ subjKey: sk, ui: ui, which: whichToServe(sk, ui), isFollowup: false, isReview: true });
  });
  if (!queue.length) { toast('착각 구역이 없어요!'); return; }
  session = { mode: 'review', subjKey: null, queue: queue, idx: 0, followups: [], answered: [], followupStart: -1, locked: false, startTs: Date.now() };
  renderQuiz();
}

function startFocusSession() {
  var weak = weakUnits().slice(0, 5);
  if (!weak.length) { alert('아직 약한 주제가 없어요. 문제를 더 풀면 찾아드릴게요!'); return; }
  session = {
    mode: 'focus', subjKey: null,
    queue: weak.map(function (w) {
      return { subjKey: w.subjKey, ui: w.ui, which: whichToServe(w.subjKey, w.ui), isFollowup: false };
    }),
    idx: 0, followups: [], answered: [], followupStart: -1,
    locked: false, startTs: Date.now()
  };
  renderQuiz();
}

var MODE_NAMES = { subject: '과목 공부', random: '오늘의 공부', review: '오답 복습', exam: '미니 모의고사', focus: '약점 집중 공부', single: '개념 확인' };

function currentItem() { return session.queue[session.idx]; }

function advance() {
  session.idx++;
  session.locked = false;
  if (session.idx >= session.queue.length) {
    if (session.followups.length) {
      session.followupStart = session.queue.length;
      session.queue = session.queue.concat(session.followups);
      session.followups = [];
      renderQuiz();
      return;
    }
    renderSetResult();
    return;
  }
  renderQuiz();
}

// 공용 채점·기록 (퀴즈/보스 공용). opts: {isRetry, xp, silentXp, countGoal}
function recordAttempt(subjKey, ui, which, ok, opts) {
  opts = opts || {};
  var qid = qidOf(subjKey, ui, which);
  var ukey = unitKeyOf(subjKey, ui);
  var now = Date.now();

  var a = S.attempts[qid] || { tries: 0, correct: 0, last: null, ts: 0 };
  a.tries++; if (ok) a.correct++;
  a.last = ok ? 'o' : 'x'; a.ts = now;
  S.attempts[qid] = a;

  var today = todayStr();
  var day = S.daily[today] || { answered: 0, correct: 0 };
  day.answered++; if (ok) day.correct++;
  S.daily[today] = day;

  if (!ok) {
    var w = S.wrong[ukey] || { overcame: false, wrongQ: which, ts: now };
    w.overcame = false; w.wrongQ = which; w.ts = now;
    S.wrong[ukey] = w;
  } else if (opts.isRetry && S.wrong[ukey] && !S.wrong[ukey].overcame) {
    S.wrong[ukey].overcame = true;
    S.wrong[ukey].ts = now;
  }
  // 착각 구역 해제: 확신 있게 다시 맞히면 벗어남
  if (ok && opts.conf !== 'guess' && S.illusion && S.illusion[ukey]) delete S.illusion[ukey];

  var srs = S.srs[ukey] || { lvl: 0, due: null };
  if (ok) {
    if (opts.conf === 'guess') {
      // 찍어서 맞힌 건 "아는 것"이 아니므로 레벨을 올리지 않고 내일 다시 확인
      srs.due = addDays(todayStr(), 1);
    } else {
      var otherA = S.attempts[qidOf(subjKey, ui, which === 'm' ? 't' : 'm')];
      var firstExposure = a.tries === 1 && (!otherA || otherA.tries === 0);
      srs.lvl = firstExposure && srs.lvl === 0 ? 2 : Math.min(srs.lvl + 1, SRS_INTERVALS.length);
      srs.due = addDays(todayStr(), SRS_INTERVALS[srs.lvl - 1]);
    }
  } else {
    srs.lvl = 0;
    srs.due = addDays(todayStr(), 1);
    // 확실하다고 했는데 틀림 = "착각 구역" → 최우선 복습
    if (opts.conf === 'sure') {
      S.illusion = S.illusion || {};
      S.illusion[ukey] = todayStr();
    }
  }
  S.srs[ukey] = srs;

  if (opts.countGoal !== false && day.answered === (S.goal || 15)) S.goalDays = (S.goalDays || 0) + 1;
  saveState();

  if (typeof opts.xp === 'number') addXP(opts.xp, opts.silentXp);
  else if (ok) addXP(Math.round((opts.isRetry ? 20 : 10) * (opts.conf === 'sure' ? 2 : opts.conf === 'guess' ? 0.3 : 1)));
  else addXP(2, true);
  checkBadges();
  if (window.haptic) haptic(ok ? 'ok' : 'no');
  if (window.dqCheckRewards) dqCheckRewards();
}
window.recordAttempt = recordAttempt;

/* 확신도 베팅: 답을 고르면 채점 전에 "얼마나 확신하나" 물어봄 */
function askConfidence(pickIdx) {
  session.pendingPick = pickIdx;
  var v = document.querySelector('.choices');
  if (!v) { answer(pickIdx, 'mid'); return; }
  document.querySelectorAll('[data-pick]').forEach(function (b) { b.disabled = true; });
  var box = document.createElement('div');
  box.className = 'conf-wrap';
  box.innerHTML = '<div class="conf-q">얼마나 확신하나요?</div><div class="conf-btns">' +
    '<button class="conf-btn sure" data-conf="sure">💪 확실해요</button>' +
    '<button class="conf-btn mid" data-conf="mid">🤔 반반</button>' +
    '<button class="conf-btn guess" data-conf="guess">🎲 찍었어요</button>' +
    '</div>';
  v.parentNode.insertBefore(box, v.nextSibling);
  box.querySelectorAll('[data-conf]').forEach(function (b) {
    b.onclick = function () { answer(session.pendingPick, b.getAttribute('data-conf')); };
  });
}

function answer(pickIdx, conf) {
  if (session.locked) return;
  // 확신도를 아직 안 물었으면 먼저 물어보기 (모르겠어요·모의고사는 건너뜀)
  if (!conf && pickIdx !== -1 && session.mode !== 'exam' && !session.pendingPick0) {
    session.pendingPick0 = true;
    askConfidence(pickIdx);
    return;
  }
  session.pendingPick0 = false;
  session.locked = true;
  var item = currentItem();
  var g = getQuestion(item);
  var ok = pickIdx === g.q.answer;
  session.lastConf = conf || (pickIdx === -1 ? 'guess' : 'mid');

  recordAttempt(item.subjKey, item.ui, item.which, ok, {
    isRetry: item.isFollowup || item.isReview,
    conf: session.lastConf
  });

  if (!ok && session.mode !== 'exam' && !item.isFollowup && !item.isReview) {
    session.followups.push({ subjKey: item.subjKey, ui: item.ui, which: item.which === 'm' ? 't' : 'm', isFollowup: true });
  }

  // 정서 안전장치: 3연속 오답이면 쉬운 문제로 착지시켜 세션을 정답으로 끝내기
  session.wrongRun = ok ? 0 : (session.wrongRun || 0) + 1;
  if (!ok && session.wrongRun >= 3 && !session.rescued && session.mode !== 'exam') {
    session.rescued = true;
    var easy = easyUnits(2, item.subjKey);
    if (easy.length) {
      session.queue = session.queue.concat(easy);
      session.rescueBanner = true;
    }
  }

  session.answered.push({ item: item, pick: pickIdx, ok: ok, topic: g.unit.topic, subjKey: item.subjKey });
  renderQuiz(pickIdx);
}

/* ---------- 렌더: 홈 ---------- */
function renderHome() {
  session = null;
  var v = $('#view');
  if (!DATA.subjects.length) {
    v.innerHTML =
      '<div class="card loading-bank">' +
      '<div class="spin">📚</div>' +
      '<h2 style="margin:12px 0 6px">문제은행을 준비하고 있어요</h2>' +
      '<p class="muted">잠시 후 다시 열어주세요.</p></div>';
    updateBadge();
    return;
  }
  var today = S.daily[todayStr()] || { answered: 0, correct: 0 };
  var streak = streakDays();
  var need = needReviewCount();
  var due = dueReviewCount();

  var ddayHtml;
  if (S.examDate) {
    var diff = Math.ceil((new Date(S.examDate + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000);
    var label = diff > 0 ? 'D-' + diff : (diff === 0 ? '🔥 오늘이 시험날!' : '시험일 지남');
    ddayHtml = '<div class="dday-chip" id="ddayChip" title="클릭해서 수정">📅 시험까지 <b>&nbsp;' + label + '</b></div>';
  } else {
    ddayHtml = '<div class="dday-chip" id="ddayChip">📅 시험 날짜 설정하기</div>';
  }

  var subjCards = DATA.subjects.map(function (subj) {
    var st = subjectStats(subj);
    var pct = Math.round((st.attempted / st.total) * 100);
    var accTxt = st.expected == null ? '아직 안 풀었어요' : '최근 정답률 ' + st.expected + '%';
    return '<div class="subject-card">' +
      '<div class="subject-info">' +
      '<div class="subject-name">' + esc(subj.name) + '</div>' +
      '<div class="subject-meta">' + st.attempted + ' / ' + st.total + '문제 학습 · ' + accTxt + '</div>' +
      '<div class="subject-bar"><i style="width:' + pct + '%"></i></div>' +
      '</div>' +
      '<span style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="btn btn-ghost btn-sm" data-map="' + esc(subj.key) + '">📖 레슨·맵</button>' +
      '<button class="btn btn-ghost btn-sm" data-subj="' + esc(subj.key) + '">✏️ 문제 ➜</button>' +
      '</span>' +
      '</div>';
  }).join('');

  var li = levelInfo();
  var lvlPct = li.max ? 100 : Math.round(li.cur / li.span * 100);
  var mas = window.mascotFor ? window.mascotFor(li.n) : null;
  var levelHtml =
    (mas ? '<div class="mascot"><div class="mascot-emoji">' + mas.emoji + '</div>' +
      '<div class="mascot-say"><b>' + esc(mas.name) + '</b><br>' + esc(mas.line) + '</div></div>' : '') +
    '<div class="level-line">Lv.' + li.n + ' <b>' + esc(li.title) + '</b>' +
    '<div class="xp-bar"><i style="width:' + lvlPct + '%"></i></div>' +
    '<span class="xp-txt">' + (li.max ? 'MAX 레벨!' : S.xp + ' XP · 다음 레벨까지 ' + (li.span - li.cur) + ' XP') + '</span></div>';

  v.innerHTML =
    '<div class="card hero">' +
    '<h1>오늘도 잘 왔어요! 👋</h1>' +
    '<p class="cheer">' + esc(todayCheer()) + '</p>' +
    levelHtml +
    ddayHtml +
    '<div id="ddayEditWrap"></div>' +
    '<div class="today-line">' +
    '<span class="today-pill" id="goalPill" title="클릭해서 하루 목표 바꾸기" style="cursor:pointer">🎯 오늘 <b>' + today.answered + ' / ' + (S.goal || 15) + '문제</b>' + (today.answered >= (S.goal || 15) ? ' 달성! ✨' : '') + '</span>' +
    (due > 0 ? '<span class="today-pill">🔄 복습할 개념 <b>' + due + '개</b></span>' : '') +
    (streak > 1 ? '<span class="today-pill">🔥 <b>' + streak + '일</b> 연속 공부 중</span>' : '') +
    '</div>' +
    '</div>' +

    ((function () {
      var ill = Object.keys(S.illusion || {}).length;
      return ill ? '<div class="illusion-bar" id="illusionBar">🔴 <b>착각 구역 ' + ill + '개</b> — 안다고 생각했는데 틀린 문제예요. 시험에서 제일 위험해요!<span class="wg-go">바로 잡기 ▶</span></div>' : '';
    })()) +
    (need ? '<div class="wrong-gauge" id="wrongGauge">' +
      '<div class="wg-left"><b>❗ 아직 극복 못 한 문제 ' + need + '개</b>' +
      '<div class="wg-sub">이것만 없애면 실력이 확 올라가요</div></div>' +
      '<span class="wg-go">바로 풀기 ▶</span></div>' : '') +
    (window.piggyHtml ? window.piggyHtml() : '') +
    (window.journeyHeroHtml ? window.journeyHeroHtml() : '') +
    (window.questCardHtml ? window.questCardHtml() : '') +

    '<div class="section-title">다른 방법으로 공부하기</div>' +
    '<div class="mode-grid">' +
    '<button class="btn btn-primary btn-big" id="btnRandom">▶ 오늘의 공부 시작<br><small style="font-weight:500">복습 우선 + 새 문제 ' + SET_SIZE + '개</small></button>' +
    '<button class="btn btn-ghost btn-big" id="btnExam">📝 미니 모의고사<br><small style="font-weight:500">과목별 5문제, 합격 판정</small></button>' +
    '<button class="btn ' + (need ? 'btn-warm' : 'btn-ghost') + ' btn-big" id="btnReview">📌 오답 복습' + (need ? ' (' + need + ')' : '') + '<br><small style="font-weight:500">틀린 개념 다시 확인</small></button>' +
    '<button class="btn btn-ghost btn-big" id="btnLab">🧪 전기 실험실<br><small style="font-weight:500">만지면서 이해하는 물리</small></button>' +
    '<button class="btn btn-boss btn-big" id="btnBoss">⚔️ 보스 레이드' + (Object.keys(S.bossDefeated || {}).length ? ' <small>(' + Object.keys(S.bossDefeated).length + '/5)</small>' : '') + '<br><small style="font-weight:500">문제로 보스와 전투!</small></button>' +
    '<button class="btn btn-ghost btn-big" id="btnCodex">📐 공식 도감<br><small style="font-weight:500">공식을 수집하며 배우기</small></button>' +
    '<button class="btn btn-warm btn-big" id="btnDojo">⚡ 계산 도장<br><small style="font-weight:500">풀이를 단계별로 조립!</small></button>' +
    '<button class="btn btn-boss btn-big" id="btnGames">🎮 미니 게임<br><small style="font-weight:500">등반·소거법·버그헌트·빈칸</small></button>' +
    '</div>' +

    '<details class="card strategy"><summary>🎯 합격 전략 (꼭 한 번 읽어보세요)</summary>' +
    '<div class="pass-rule">합격 공식 = 5과목 평균 60점 이상 + 모든 과목 40점 이상</div>' +
    '<p>100점을 받을 필요가 전혀 없어요. 과목당 20문제 중 <b>12개</b>씩만 맞히면 합격이고, 어려운 과목은 <b>8개(40점)</b>만 지켜도 돼요.</p>' +
    '<p>추천 전략: 암기 과목인 <b>전기설비기술기준</b>에서 70~80점을 벌고, <b>전력공학·전기기기</b>에서 60점을 만들고, 계산이 어려운 <b>전기자기학·회로이론</b>은 과락(40점)만 피하면 합격이에요.</p>' +
    '<p>이 앱의 사용법: 틀리면 해설과 개념 카드를 읽고, 잠시 후 나오는 <b>쌍둥이 확인 문제</b>를 맞혀서 "진짜 이해했는지" 확인하세요. 오답노트의 문제를 모두 ✅로 만드는 게 목표예요.</p>' +
    '</details>' +

    '<div class="section-title">나를 위한 것들</div>' +
    '<div class="tool-grid">' +
    '<button class="tool-btn" id="btnReport">📄<span>주간 성적표</span></button>' +
    '<button class="tool-btn" id="btnLetter">💌<span>시험 전날 편지</span></button>' +
    '<button class="tool-btn" id="btnCalm">🫂<span>흔들릴 때</span></button>' +
    '</div>' +

    '<div class="section-title">과목별 공부</div>' +
    '<div class="subject-list">' + subjCards + '</div>';

  $('#btnRandom').onclick = function () { startSession('random'); };
  $('#btnExam').onclick = function () { startSession('exam'); };
  $('#btnReview').onclick = function () { startSession('review'); };
  $('#btnLab').onclick = function () { if (window.renderLab) window.renderLab(); };
  $('#btnBoss').onclick = function () { if (window.renderBossHub) window.renderBossHub(); };
  $('#btnDojo').onclick = function () { if (window.renderDojoHub) window.renderDojoHub(); };
  $('#btnGames').onclick = function () { if (window.renderGames) window.renderGames(); };
  var wg = $('#wrongGauge'); if (wg) wg.onclick = function () { startSession('review'); };
  var ib = $('#illusionBar'); if (ib) ib.onclick = function () { startIllusionSession(); };
  $('#btnReport').onclick = function () { if (window.renderReport) window.renderReport(); };
  $('#btnLetter').onclick = function () { if (window.renderLetter) window.renderLetter(); };
  $('#btnCalm').onclick = function () { if (window.renderCalm) window.renderCalm(); };
  if (window.grantShield) window.grantShield();
  document.querySelectorAll('[data-subj]').forEach(function (b) {
    b.onclick = function () { startSession('subject', b.getAttribute('data-subj')); };
  });
  document.querySelectorAll('[data-map]').forEach(function (b) {
    b.onclick = function () { renderMap(b.getAttribute('data-map')); };
  });
  $('#goalPill').onclick = function () {
    var val = prompt('하루 목표 문제 수를 정해주세요 (추천: 15문제)', String(S.goal || 15));
    if (val == null) return;
    var n = parseInt(val, 10);
    if (n >= 1 && n <= 200) { S.goal = n; saveState(); renderHome(); }
  };
  $('#ddayChip').onclick = function () {
    var wrap = $('#ddayEditWrap');
    if (wrap.innerHTML) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = '<div class="dday-edit"><input type="date" id="ddayInput" value="' + (S.examDate || '') + '">' +
      '<button class="btn btn-primary btn-sm" id="ddaySave">저장</button></div>';
    $('#ddaySave').onclick = function () {
      var val = $('#ddayInput').value;
      S.examDate = val || null;
      saveState(); renderHome();
    };
  };
  updateBadge();
}

/* ---------- 틀린 이유 태그 ---------- */
var REASONS = [
  { id: 'formula', label: '공식을 몰랐다', icon: '📐' },
  { id: 'calc', label: '계산·대입 실수', icon: '🧮' },
  { id: 'unit', label: '단위·지수 실수', icon: '🔢' },
  { id: 'read', label: '문제를 잘못 읽음', icon: '👀' },
  { id: 'concept', label: '개념이 헷갈림', icon: '🌀' }
];
function reasonTagHtml(ukey) {
  var cur = (S.wrong[ukey] || {}).reason;
  var btns = REASONS.map(function (r) {
    return '<button class="reason-btn' + (cur === r.id ? ' on' : '') + '" data-reason="' + r.id + '" data-rukey="' + esc(ukey) + '">' +
      r.icon + ' ' + esc(r.label) + '</button>';
  }).join('');
  return '<div class="reason-wrap"><div class="reason-q">왜 틀렸을까요? <span class="muted">(눌러두면 약점 분석에 쓰여요)</span></div>' +
    '<div class="reason-btns">' + btns + '</div></div>';
}
function bindReasonTags() {
  document.querySelectorAll('[data-reason]').forEach(function (b) {
    b.onclick = function () {
      var ukey = b.getAttribute('data-rukey'), rid = b.getAttribute('data-reason');
      if (!S.wrong[ukey]) return;
      S.wrong[ukey].reason = rid;
      saveState();
      document.querySelectorAll('[data-rukey="' + ukey + '"]').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      if (window.haptic) haptic();
    };
  });
}
function reasonStats() {
  var c = {};
  REASONS.forEach(function (r) { c[r.id] = 0; });
  var total = 0;
  for (var k in S.wrong) {
    var rr = S.wrong[k].reason;
    if (rr && c[rr] !== undefined) { c[rr]++; total++; }
  }
  return { counts: c, total: total };
}

/* ---------- 렌더: 퀴즈 ---------- */
function renderQuiz(pickedIdx) {
  var item = currentItem();
  var g = getQuestion(item);
  if (!g) { advance(); return; }
  var total = session.queue.length + session.followups.length;
  var answered = typeof pickedIdx === 'number';
  var v = $('#view');

  var banner = '';
  if (item.isFollowup && session.followupStart === session.idx && !answered) {
    banner = '<div class="followup-banner">🔁 아까 틀렸던 개념이에요. 비슷한 문제로 제대로 이해했는지 확인해봐요!</div>';
  } else if (item.isFollowup) {
    banner = '<div class="followup-banner">🔁 다시 확인하는 문제예요.</div>';
  } else if (item.isReview) {
    banner = '<div class="review-banner">📌 오답노트 복습이에요. 이번에 맞히면 "극복 완료"가 돼요!</div>';
  }
  if (item.isEasy && !answered) {
    banner = '<div class="rescue-banner">💚 잠깐! 이 유형은 원래 어려워요. 숨 고르게 <b>이미 맞혔던 쉬운 문제</b>로 한 번 갈게요. 감 되찾고 가요!</div>';
  }

  var subjName = g.subj.name;
  var modeName = MODE_NAMES[session.mode] + (session.mode === 'subject' ? ' · ' + subjName : '');

  var choicesHtml = g.q.choices.map(function (c, i) {
    var cls = 'choice';
    if (answered) {
      if (i === g.q.answer) cls += (i === pickedIdx ? ' picked-right' : ' reveal-right');
      else if (i === pickedIdx) cls += ' picked-wrong';
      else cls += ' dim';
    }
    return '<button class="' + cls + '" data-pick="' + i + '"' + (answered ? ' disabled' : '') + '>' +
      '<span class="num">' + CIRCLED[i] + '</span><span>' + esc(c) + '</span></button>';
  }).join('');

  var isRetry = item.isFollowup || item.isReview;
  var verdictHtml = '';
  if (answered) {
    var ok = pickedIdx === g.q.answer;
    var conceptHtml = isRetry ? '' :
      '<div class="concept-box" style="margin-top:14px;margin-bottom:0">' +
      '<b class="cb-title">💡 개념 카드 — ' + esc(g.unit.topic) + '</b>' + esc(g.unit.concept) + '</div>';
    if (ok) {
      var praise = item.isFollowup ? '🎉 극복 완료! 이제 이 개념은 사용자님 거예요.' :
        (item.isReview ? '🎉 오답 극복 성공! 정말 잘했어요.' :
          (session.lastConf === 'sure' ? '💪 확신하고 정답! XP 2배 — 이게 진짜 아는 거예요' :
            session.lastConf === 'guess' ? '🎲 찍어서 맞혔네요! 운이 좋았지만 아직 내 것은 아니에요. 내일 다시 확인할게요' :
              '⭕ 정답이에요! 잘했어요.'));
      verdictHtml = '<div class="verdict ok"><div class="verdict-title">' + praise + '</div>' +
        '<div class="explain">' + esc(g.q.explain) + '</div></div>';
    } else {
      var note = (session.mode !== 'exam' && !item.isFollowup && !item.isReview) ?
        '<div class="followup-note">🔁 이 개념은 잠시 후 비슷한 문제로 한 번 더 확인할 거예요!</div>' : '';
      note += reasonTagHtml(unitKeyOf(item.subjKey, item.ui));
      var title = pickedIdx === -1 ? '🤷 몰라도 괜찮아요. 모른다고 말하는 게 찍는 것보다 백배 나아요!' :
        (session.lastConf === 'sure' ? '🔴 착각 구역! 확실하다고 했는데 틀렸어요 — 이런 게 시험에서 제일 위험해요' :
          '❌ 괜찮아요, 지금 배우면 돼요.');
      verdictHtml = '<div class="verdict no"><div class="verdict-title">' + title + '</div>' +
        '<div class="answer-line">정답: ' + CIRCLED[g.q.answer] + ' ' + esc(g.q.choices[g.q.answer]) + '</div>' +
        '<div class="explain">' + esc(g.q.explain) + '</div>' +
        conceptHtml + note + '</div>';
    }
  }

  var conceptTop = isRetry ?
    '<div class="concept-box"><b class="cb-title">💡 아까 틀렸던 개념이에요 — 읽고 다시 풀어봐요</b>' + esc(g.unit.concept) + '</div>' : '';
  var dunnoHtml = answered ? '' :
    '<div class="dunno-wrap"><button class="dunno-btn" id="dunnoBtn">🤷 모르겠어요 — 정답과 설명 보여주세요</button></div>';

  var timerHtml = session.mode === 'exam' ? '<span id="examTimer"></span> · ' : '';
  v.innerHTML =
    '<div class="quiz-head"><span class="quiz-mode">' + esc(modeName) + '</span>' +
    '<span class="quiz-progress">' + timerHtml + (session.idx + 1) + ' / ' + total + '</span></div>' +
    '<div class="qbar"><i style="width:' + Math.round((session.idx / Math.max(total, 1)) * 100) + '%"></i></div>' +
    banner +
    '<div class="card">' +
    '<span class="topic-chip">' + esc(subjName) + ' · ' + esc(g.unit.topic) + '</span>' +
    conceptTop +
    '<div class="qtext">' + esc(g.q.q) + '</div>' +
    '<div class="choices">' + choicesHtml + '</div>' +
    dunnoHtml +
    verdictHtml +
    (answered ? '<div class="quiz-next"><button class="btn btn-primary" id="nextBtn">다음 ➜</button></div>' : '') +
    '</div>' +
    '<div class="key-hint">⌨️ 키보드로도 풀 수 있어요: <b>1~4</b> 답 선택 · <b>0</b> 모르겠어요 · <b>Enter</b> 다음</div>';

  if (!answered) {
    document.querySelectorAll('[data-pick]').forEach(function (b) {
      b.onclick = function () { answer(parseInt(b.getAttribute('data-pick'), 10)); };
    });
    $('#dunnoBtn').onclick = function () { answer(-1); };
  } else {
    $('#nextBtn').onclick = advance;
    bindReasonTags();
  }
  updateBadge();
  window.scrollTo(0, 0);
}

/* ---------- 렌더: 세트 결과 ---------- */
function goalBannerHtml() {
  var t = S.daily[todayStr()];
  var goal = S.goal || 15;
  if (t && t.answered >= goal && S.celebrated !== todayStr()) {
    S.celebrated = todayStr();
    saveState();
    return '<div class="goal-banner">🎯 오늘 목표 ' + goal + '문제 달성! 오늘 할 일을 해낸 사람이 결국 합격해요. 정말 잘했어요!</div>';
  }
  return '';
}

function renderSetResult() {
  S.totalSets++;
  saveState();
  checkBadges();
  var v = $('#view');
  var list = session.answered;
  var right = list.filter(function (r) { return r.ok; }).length;

  if (session.mode === 'exam') { renderExamResult(); return; }

  var pct = list.length ? right / list.length : 0;
  var msg;
  if (pct === 1) msg = '완벽해요! 이 기세라면 합격은 시간문제예요. 🏆';
  else if (pct >= 0.8) msg = '아주 잘하고 있어요! 틀린 것만 다시 보면 돼요.';
  else if (pct >= 0.5) msg = '좋아요, 절반 이상 맞혔어요. 오답 해설을 꼭 읽어보세요.';
  else msg = '지금은 틀리는 게 당연한 단계예요. 해설과 개념 카드를 읽은 것만으로 이미 공부가 됐어요. 내일 다시 만나면 분명 더 맞힐 거예요.';

  var rows = list.map(function (r) {
    var subj = subjectByKey(r.subjKey);
    return '<div class="result-row"><span class="rmark ' + (r.ok ? 'o' : 'x') + '">' + (r.ok ? '⭕' : '❌') + '</span>' +
      '<span>' + esc(subj ? subj.name : '') + ' · ' + esc(r.topic) + (r.item.isFollowup ? ' <small>(확인 문제)</small>' : '') + '</span></div>';
  }).join('');

  v.innerHTML =
    goalBannerHtml() +
    '<div class="card result-hero">' +
    '<div class="big">' + right + ' / ' + list.length + '</div>' +
    '<div class="msg">' + esc(msg) + '</div>' +
    '<div class="result-actions">' +
    '<button class="btn btn-primary" id="btnMore">한 세트 더 풀기 ▶</button>' +
    '<button class="btn btn-ghost" id="btnHome">홈으로</button>' +
    '</div></div>' +
    '<div class="section-title">이번 세트 돌아보기</div>' +
    '<div class="result-list">' + rows + '</div>';

  $('#btnMore').onclick = function () {
    if (session.mode === 'focus') startFocusSession();
    else if (session.mode === 'single') renderMap(session.queue[0].subjKey);
    else startSession(session.mode, session.subjKey);
  };
  $('#btnHome').onclick = renderHome;
  updateBadge();
  window.scrollTo(0, 0);
}

function renderExamResult() {
  var v = $('#view');
  var tally = {};
  examSubjects().forEach(function (s) { tally[s.key] = { right: 0, total: 0 }; });
  session.answered.forEach(function (r) {
    if (!tally[r.subjKey]) return;
    tally[r.subjKey].total++;
    if (r.ok) tally[r.subjKey].right++;
  });

  var scores = [], anyFail = false, sum = 0, cnt = 0;
  var rows = examSubjects().map(function (s) {
    var t = tally[s.key];
    if (!t.total) return '';
    var score = Math.round((t.right / t.total) * 100);
    scores.push(score); sum += score; cnt++;
    if (score < 40) anyFail = true;
    return '<tr><td style="text-align:left">' + esc(s.name) + '</td><td>' + t.right + ' / ' + t.total + '</td>' +
      '<td class="' + (score >= 60 ? 'score-good' : (score < 40 ? 'score-bad' : '')) + '">' + score + '점</td>' +
      '<td>' + (score < 40 ? '⚠️ 과락' : (score >= 60 ? '✅ 안정' : '△ 보통')) + '</td></tr>';
  }).join('');

  var avg = cnt ? Math.round(sum / cnt) : 0;
  var pass = !anyFail && avg >= 60;
  if (pass) S.mockPassed = true;
  saveState();
  addXP(30);
  checkBadges();
  var verdict = pass ?
    '<div class="pass-verdict yes">🎊 합격권이에요! 이대로만 가요!</div>' :
    '<div class="pass-verdict no">아직 ' + (anyFail ? '과락 과목이 있어요' : '평균이 조금 모자라요') + ' — 하지만 어디를 보완할지 알았으니 절반은 온 거예요!</div>';

  var secs = Math.max(1, Math.floor((Date.now() - session.startTs) / 1000));
  var avgSec = Math.round(secs / Math.max(session.answered.length, 1));
  var timeLine = '⏱ 총 ' + Math.floor(secs / 60) + '분 ' + (secs % 60) + '초 · 문제당 평균 ' + avgSec + '초 ' +
    (avgSec <= 90 ? '(실전 페이스 90초보다 빨라요 👍)' : '(실전은 문제당 90초예요. 조금만 더 속도를 올려봐요)');

  v.innerHTML =
    goalBannerHtml() +
    '<div class="card result-hero">' +
    '<div class="big">평균 ' + avg + '점</div>' +
    '<div class="msg">미니 모의고사 결과 (과목별 5문제 기준의 어림 점수예요)</div>' +
    '<div class="muted" style="margin-top:8px">' + esc(timeLine) + '</div>' +
    verdict + '</div>' +
    '<div class="card"><table class="exam-table">' +
    '<tr><th style="text-align:left">과목</th><th>맞힌 수</th><th>환산 점수</th><th>판정</th></tr>' + rows +
    '</table><p class="muted" style="margin-top:10px">※ 실제 시험은 과목당 20문제예요. 5문제 기준이라 오차가 있지만, 약한 과목을 찾는 데는 충분해요.</p></div>' +
    '<div class="result-actions">' +
    '<button class="btn btn-warm" id="btnReviewNow">📌 틀린 문제 바로 복습하기</button>' +
    '<button class="btn btn-ghost" id="btnHome">홈으로</button></div>';

  $('#btnHome').onclick = renderHome;
  $('#btnReviewNow').onclick = function () { startSession('review'); };
  updateBadge();
  window.scrollTo(0, 0);
}

/* ---------- 렌더: 이론 레슨 ---------- */
var lessonRun = null;

function lessonFor(subjKey, ui) {
  var arr = (window.LESSON_DATA || {})[subjKey] || [];
  for (var i = 0; i < arr.length; i++) if (arr[i].ui === ui) return arr[i];
  return null;
}
function startLesson(subjKey, ui, journey) {
  var l = lessonFor(subjKey, ui);
  if (!l || !l.steps || !l.steps.length) { toast('이 개념의 레슨은 아직 준비 중이에요!'); return; }
  session = null;
  lessonRun = { subjKey: subjKey, ui: ui, idx: 0, picks: {}, steps: l.steps, journey: !!journey };
  renderLesson();
}
function startUnitQuiz(subjKey, ui) {
  lessonRun = null;
  session = {
    mode: 'single', subjKey: subjKey,
    queue: [{ subjKey: subjKey, ui: ui, which: whichToServe(subjKey, ui), isFollowup: false }],
    idx: 0, followups: [], answered: [], followupStart: -1,
    locked: false, startTs: Date.now()
  };
  renderQuiz();
}

function lessonBubble(step, i, isCurrent) {
  var pick = lessonRun.picks[i];
  var art = step.art ? '<div class="l-art">' + esc(step.art) + '</div>' : '';
  var html = '<div class="l-step">' + art + '<div class="l-bubble">' + esc(step.text) + '</div>';
  if (step.kind === 'choice' && step.options) {
    var opts = step.options.map(function (o, oi) {
      var cls = 'l-opt';
      var dis = '';
      if (pick) {
        dis = ' disabled';
        if (oi === step.answer) cls += ' right';
        else if (oi === pick.pick) cls += ' wrong';
        else cls += ' dim';
      } else if (!isCurrent) { dis = ' disabled'; }
      return '<button class="' + cls + '" data-lopt="' + oi + '"' + dis + '>' + esc(o) + '</button>';
    }).join('');
    html += '<div class="l-opts">' + opts + '</div>';
    if (pick) {
      var reaction = pick.ok ? (step.right || '정답이에요!') : (step.wrong || '괜찮아요!');
      html += '<div class="l-reaction ' + (pick.ok ? 'ok' : 'no') + '">' + (pick.ok ? '🎉 ' : '💪 ') + esc(reaction) + '</div>';
    }
  }
  return html + '</div>';
}

function renderLesson() {
  var subj = subjectByKey(lessonRun.subjKey);
  var unit = subj.units[lessonRun.ui];
  var steps = lessonRun.steps;
  var v = $('#view');
  var done = lessonRun.idx >= steps.length;

  var bubbles = '';
  for (var i = 0; i <= Math.min(lessonRun.idx, steps.length - 1); i++) {
    bubbles += lessonBubble(steps[i], i, i === lessonRun.idx);
  }

  var footer = '';
  if (done) {
    var ukey = unitKeyOf(lessonRun.subjKey, lessonRun.ui);
    var firstTime = !(S.lessonProg[ukey] && S.lessonProg[ukey].done);
    if (firstTime) {
      S.lessonProg[ukey] = { done: true, date: todayStr() };
      saveState();
      addXP(15);
      checkBadges();
      if (window.dqBump) { dqBump('lesson'); dqCheckRewards(); }
      if (window.celebrate) celebrate('small');
    }
    if (lessonRun.journey && window.journeyMarkTaught) window.journeyMarkTaught(lessonRun.subjKey, lessonRun.ui);
    footer = '<div class="card result-hero" style="padding:26px 20px">' +
      '<div style="font-size:2rem">🎓</div>' +
      '<div style="font-weight:800;font-size:1.1rem;margin-top:6px">' + (lessonRun.journey ? '개념 배우기 완료!' : '레슨 완료!') + ' ' + (firstTime ? '+15 XP' : '(복습)') + '</div>' +
      '<div class="msg">' + (lessonRun.journey ? '이제 방금 배운 걸 바로 문제로 확인해요. 맞히면 다음 단계가 열려요!' : '배운 걸 바로 문제로 확인하면 기억에 2배로 남아요!') + '</div>' +
      '<div class="result-actions">' +
      (lessonRun.journey ?
        '<button class="btn btn-primary btn-big" id="lJourneyQ">▶ 배운 걸로 문제 풀기</button>' :
        '<button class="btn btn-primary" id="lQuiz">✏️ 이 개념 문제로 확인</button>' +
        '<button class="btn btn-ghost" id="lMap">🗺 맵으로</button>') +
      '</div></div>';
  } else {
    var cur = steps[lessonRun.idx];
    var showNext = cur.kind !== 'choice' || !!lessonRun.picks[lessonRun.idx];
    footer = showNext ?
      '<div class="l-next"><button class="btn btn-primary" id="lNext">' + (lessonRun.idx === steps.length - 1 ? '레슨 끝내기 🎓' : '계속 ▶') + '</button></div>' :
      '<div class="l-next muted" style="text-align:center">👆 골라보세요!</div>';
  }

  v.innerHTML =
    '<div class="quiz-head"><span class="quiz-mode">📖 이론 레슨 · ' + esc(subj.name) + '</span>' +
    '<span class="quiz-progress">' + Math.min(lessonRun.idx + 1, steps.length) + ' / ' + steps.length + '</span></div>' +
    '<div class="qbar"><i style="width:' + Math.round(Math.min(lessonRun.idx, steps.length) / steps.length * 100) + '%"></i></div>' +
    '<div class="card"><span class="topic-chip">' + esc(unit.topic) + '</span>' +
    '<div class="l-steps">' + bubbles + '</div></div>' + footer;

  if (done) {
    if (lessonRun.journey) {
      $('#lJourneyQ').onclick = function () { window.journeyPractice(lessonRun.subjKey, lessonRun.ui); };
    } else {
      $('#lQuiz').onclick = function () { startUnitQuiz(lessonRun.subjKey, lessonRun.ui); };
      $('#lMap').onclick = function () { renderMap(lessonRun.subjKey); };
    }
  } else {
    var nx = $('#lNext');
    if (nx) nx.onclick = function () { lessonRun.idx++; renderLesson(); };
    document.querySelectorAll('[data-lopt]:not([disabled])').forEach(function (b) {
      b.onclick = function () {
        var oi = parseInt(b.getAttribute('data-lopt'), 10);
        var step = lessonRun.steps[lessonRun.idx];
        var ok = oi === step.answer;
        lessonRun.picks[lessonRun.idx] = { pick: oi, ok: ok };
        if (ok) addXP(3);
        renderLesson();
      };
    });
  }
  window.scrollTo(0, document.body.scrollHeight);
}

/* ---------- 렌더: 과목 진행 맵 ---------- */
function unitStatus(subjKey, ui) {
  var ukey = unitKeyOf(subjKey, ui);
  if (S.wrong[ukey] && !S.wrong[ukey].overcame) return 'red';
  var am = S.attempts[qidOf(subjKey, ui, 'm')];
  var at = S.attempts[qidOf(subjKey, ui, 't')];
  var srs = S.srs[ukey];
  var lastOk = (!am || am.last !== 'x') && (!at || at.last !== 'x') && (am || at);
  if (lastOk && srs && srs.lvl >= 3) return 'green';
  if (am || at || (S.lessonProg[ukey] && S.lessonProg[ukey].done)) return 'blue';
  return 'gray';
}
var STATUS_LABEL = { red: '극복 필요', green: '마스터', blue: '배우는 중', gray: '' };

function renderMap(subjKey) {
  session = null; lessonRun = null;
  var subj = subjectByKey(subjKey);
  if (!subj) { renderHome(); return; }
  var v = $('#view');
  var lessonsDone = 0, mastered = 0;
  var rows = subj.units.map(function (u, ui) {
    var st = unitStatus(subjKey, ui);
    var ukey = unitKeyOf(subjKey, ui);
    var lDone = S.lessonProg[ukey] && S.lessonProg[ukey].done;
    if (lDone) lessonsDone++;
    if (st === 'green') mastered++;
    var hasLesson = !!lessonFor(subjKey, ui);
    return '<div class="station">' +
      '<div class="st-dot ' + st + '">' + (st === 'green' ? '★' : (ui + 1)) + '</div>' +
      '<div class="st-info"><div class="st-topic">' + esc(u.topic) + '</div>' +
      (STATUS_LABEL[st] ? '<div class="st-status ' + st + '">' + STATUS_LABEL[st] + '</div>' : '') + '</div>' +
      '<div class="st-actions">' +
      (hasLesson ? '<button class="btn btn-ghost btn-sm" data-lesson="' + ui + '">📖 레슨' + (lDone ? ' ✓' : '') + '</button>' : '') +
      '<button class="btn btn-ghost btn-sm" data-quiz="' + ui + '">✏️ 문제</button>' +
      '</div></div>';
  }).join('');

  v.innerHTML =
    '<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">' +
    '<div><b style="font-size:1.1rem">🗺 ' + esc(subj.name) + '</b>' +
    '<div class="muted">레슨 완주 ' + lessonsDone + ' / ' + subj.units.length + ' · 마스터 ⭐ ' + mastered + '개</div></div>' +
    '<span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-boss btn-sm" id="mapBoss">⚔️ 보스전</button>' +
    '<button class="btn btn-primary btn-sm" id="mapQuiz">▶ 5문제</button></span></div>' +
    '<div class="map-path">' + rows + '</div>';

  $('#mapQuiz').onclick = function () { startSession('subject', subjKey); };
  $('#mapBoss').onclick = function () { if (window.startBossBattle) window.startBossBattle(subjKey); };
  document.querySelectorAll('[data-lesson]').forEach(function (b) {
    b.onclick = function () { startLesson(subjKey, parseInt(b.getAttribute('data-lesson'), 10)); };
  });
  document.querySelectorAll('[data-quiz]').forEach(function (b) {
    b.onclick = function () { startUnitQuiz(subjKey, parseInt(b.getAttribute('data-quiz'), 10)); };
  });
  updateBadge();
  window.scrollTo(0, 0);
}

/* ---------- 렌더: 오답노트 ---------- */
function renderNotebook() {
  session = null;
  var v = $('#view');
  var wl = wrongList();
  var need = wl.filter(function (w) { return !w.info.overcame; });

  if (!wl.length) {
    v.innerHTML = '<div class="card empty-note"><div style="font-size:2.2rem">🌱</div>' +
      '<h2 style="margin:10px 0 6px">오답노트가 비어 있어요</h2>' +
      '<p class="muted">문제를 풀다 틀리면 여기에 자동으로 모여요.<br>틀리는 건 부끄러운 게 아니라 합격 재료예요!</p>' +
      '<div style="margin-top:18px"><button class="btn btn-primary" id="goStudy">공부하러 가기 ▶</button></div></div>';
    $('#goStudy').onclick = function () { startSession('random'); };
    updateBadge();
    return;
  }

  var bySubj = {};
  wl.forEach(function (w) {
    (bySubj[w.subjName] = bySubj[w.subjName] || []).push(w);
  });

  var groups = Object.keys(bySubj).map(function (name) {
    var items = bySubj[name].map(function (w) {
      var st = w.info.overcame ?
        '<span class="wstatus done">✅ 극복 완료</span>' :
        '<span class="wstatus need">❗ 복습 필요</span>';
      return '<div class="wrong-item"><span class="wtopic">' + esc(w.topic) + '</span>' +
        '<span style="display:flex;gap:8px;align-items:center">' + st +
        '<button class="btn btn-ghost btn-sm" data-retry="' + esc(w.unitKey) + '">다시 풀기</button></span></div>';
    }).join('');
    return '<div class="wrong-group-title">' + esc(name) + '</div>' + items;
  }).join('');

  // 약점 레이더 (틀린 이유 통계 + 처방)
  var rs = reasonStats();
  var radarHtml = '';
  if (rs.total >= 3) {
    var top = null;
    REASONS.forEach(function (r) { if (!top || rs.counts[r.id] > rs.counts[top.id]) top = r; });
    var bars = REASONS.map(function (r) {
      var pct = Math.round(rs.counts[r.id] / rs.total * 100);
      return '<div class="rad-row"><span class="rad-lab">' + r.icon + ' ' + esc(r.label) + '</span>' +
        '<div class="rad-bar"><i style="width:' + pct + '%"></i></div>' +
        '<span class="rad-pct">' + pct + '%</span></div>';
    }).join('');
    var rx = { formula: ['📐 공식 도감에서 공식부터 잡기', 'codex'], calc: ['⚡ 계산 도장에서 단계 연습', 'dojo'],
      unit: ['🔢 지수·단위 훈련하기', 'drill'], read: ['👀 문제를 끝까지 읽는 연습 — 천천히 풀기', 'review'],
      concept: ['📚 개념 사전에서 다시 읽기', 'dict'] }[top.id];
    radarHtml = '<div class="card"><b style="display:block;margin-bottom:10px">🎯 내가 틀리는 이유</b>' +
      bars +
      '<div class="rad-fix">가장 많은 원인: <b>' + esc(top.label) + '</b><br>' +
      '<button class="btn btn-warm btn-sm" id="radarFix" data-fix="' + rx[1] + '" style="margin-top:8px">' + esc(rx[0]) + '</button></div></div>';
  }

  v.innerHTML =
    radarHtml +
    '<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">' +
    '<div><b style="font-size:1.05rem">📌 오답노트</b><div class="muted">복습 필요 ' + need.length + '개 · 극복 완료 ' + (wl.length - need.length) + '개</div></div>' +
    (need.length ? '<button class="btn btn-warm" id="btnReviewAll">몰아서 복습하기 (' + Math.min(need.length, 10) + '문제) ▶</button>' : '<span class="wstatus done">모두 극복! 🎉</span>') +
    '</div>' + groups;

  if (need.length) $('#btnReviewAll').onclick = function () { startSession('review'); };
  var rf = $('#radarFix');
  if (rf) rf.onclick = function () {
    var f = rf.getAttribute('data-fix');
    if (f === 'codex' && window.renderCodex) renderCodex();
    else if (f === 'dojo' && window.startDojo) window.startDojo();
    else if (f === 'drill' && window.startDrill) window.startDrill();
    else if (f === 'dict') renderDict();
    else startSession('review');
  };
  document.querySelectorAll('[data-retry]').forEach(function (b) {
    b.onclick = function () {
      var key = b.getAttribute('data-retry');
      var w = wl.filter(function (x) { return x.unitKey === key; })[0];
      if (!w) return;
      var other = w.info.wrongQ === 'm' ? 't' : 'm';
      session = {
        mode: 'review', subjKey: null,
        queue: [{ subjKey: w.subjKey, ui: w.ui, which: other, isFollowup: false, isReview: true }],
        idx: 0, followups: [], answered: [], followupStart: -1, locked: false
      };
      renderQuiz();
    };
  });
  updateBadge();
}

/* ---------- 렌더: 개념 사전 ---------- */
var dictState = { subj: 'all', q: '', formula: false };

function buildDictList() {
  var items = [];
  DATA.subjects.forEach(function (subj) {
    if (dictState.subj !== 'all' && subj.key !== dictState.subj) return;
    subj.units.forEach(function (u) {
      var text = (u.topic + ' ' + u.concept).toLowerCase();
      if (dictState.q && text.indexOf(dictState.q.toLowerCase()) === -1) return;
      var body;
      if (dictState.formula) {
        var sents = u.concept.split(/(?<=[다요]\.)\s+/);
        var f = sents.filter(function (s) { return s.indexOf('공식') !== -1; });
        if (!f.length) return;
        body = f.map(esc).join('<br>');
      } else {
        body = esc(u.concept);
      }
      var open = (dictState.q || dictState.formula) ? ' open' : '';
      items.push('<details class="dict-card"' + open + '><summary><b>' + esc(u.topic) + '</b><span class="dict-subj">' + esc(subj.name) + '</span></summary>' +
        '<div class="dict-body">' + body + '</div></details>');
    });
  });
  if (!items.length) return '<div class="empty-note">검색 결과가 없어요. 다른 말로 찾아볼까요?</div>';
  return items.join('');
}

function renderDict() {
  session = null;
  var v = $('#view');
  var chips = [{ k: 'all', n: '전체' }].concat(DATA.subjects.map(function (s) { return { k: s.key, n: s.name }; }));
  var chipHtml = chips.map(function (c) {
    return '<button class="chip' + (dictState.subj === c.k ? ' on' : '') + '" data-chip="' + esc(c.k) + '">' + esc(c.n) + '</button>';
  }).join('');

  v.innerHTML =
    '<div class="card">' +
    '<b style="font-size:1.05rem">📚 개념 사전</b>' +
    '<p class="muted" style="margin-top:4px">시험에 나오는 핵심 개념 100개를 아주 쉬운 말로 정리했어요. 자기 전에 몇 개씩 읽기만 해도 공부가 돼요.</p>' +
    '<div class="dict-tools">' +
    '<input type="search" id="dictSearch" placeholder="🔍 검색 (예: 콘덴서, 슬립, 접지...)" value="' + esc(dictState.q) + '">' +
    '<button class="chip' + (dictState.formula ? ' on' : '') + '" id="formulaToggle">∑ 공식만 모아보기</button>' +
    '</div>' +
    '<div class="chip-row">' + chipHtml + '</div>' +
    '</div>' +
    '<div id="dictList">' + buildDictList() + '</div>';

  document.querySelectorAll('[data-chip]').forEach(function (b) {
    b.onclick = function () { dictState.subj = b.getAttribute('data-chip'); renderDict(); };
  });
  $('#formulaToggle').onclick = function () { dictState.formula = !dictState.formula; renderDict(); };
  $('#dictSearch').oninput = function () {
    dictState.q = this.value.trim();
    $('#dictList').innerHTML = buildDictList();
  };
  updateBadge();
}

/* ---------- 렌더: 성적 ---------- */
function renderStats() {
  session = null;
  var v = $('#view');
  var withData = [], sum = 0;
  var rows = DATA.subjects.map(function (subj) {
    var st = subjectStats(subj);
    var score = st.expected;
    var cls = score == null ? '' : (score < 40 ? 'c-bad' : (score < 60 ? 'c-warn' : 'c-good'));
    if (score != null && !subj.foundational) { withData.push(score); sum += score; }
    var fillW = score == null ? 0 : score;
    return '<div class="stat-row">' +
      '<div class="stat-label"><span>' + esc(subj.name) + (subj.foundational ? ' <small class="muted">(기초·평균 제외)</small>' : '') + '</span>' +
      '<span class="score ' + cls + '">' + (score == null ? '기록 없음' : score + '점 예상') + '</span></div>' +
      '<div class="stat-track">' +
      '<div class="stat-fill ' + cls + '" style="width:' + fillW + '%"></div>' +
      '<div class="stat-mark" style="left:40%"><span>과락 40</span></div>' +
      '<div class="stat-mark" style="left:60%"><span>합격 60</span></div>' +
      '</div>' +
      '<div class="stat-note">' + st.attempted + ' / ' + st.total + '문제 학습</div>' +
      '</div>';
  }).join('');

  var avg = withData.length ? Math.round(sum / withData.length) : null;
  var msg;
  if (avg == null) msg = '아직 데이터가 없어요. 첫 세트를 풀면 예상 점수가 나와요!';
  else if (avg >= 70) msg = '지금 실력이면 여유 있게 합격이에요. 이 감각을 시험날까지 유지해요! 🏆';
  else if (avg >= 60) msg = '합격선을 넘고 있어요! 빨간 과목만 조심하면 돼요.';
  else if (avg >= 45) msg = '합격까지 정말 얼마 안 남았어요. 오답 복습이 가장 빠른 지름길이에요.';
  else msg = '시작이 반이에요. 지금 점수는 "현재 위치"일 뿐, "도착지"가 아니에요. 매일 조금씩 올라가는 걸 여기서 확인해요.';

  var totalAnswered = 0, totalCorrect = 0;
  for (var d in S.daily) { totalAnswered += S.daily[d].answered; totalCorrect += S.daily[d].correct; }

  // 약한 주제 TOP 5
  var weak = weakUnits().slice(0, 5);
  var weakHtml = '';
  if (weak.length) {
    var weakRows = weak.map(function (w) {
      var tag = w.wrongNow ? '<span class="wstatus need">❗ 오답 미극복</span>' :
        '<span class="wstatus need">정답률 ' + Math.round(w.acc * 100) + '%</span>';
      return '<div class="wrong-item"><span class="wtopic">' + esc(w.subjName) + ' · ' + esc(w.topic) + '</span>' + tag + '</div>';
    }).join('');
    weakHtml = '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">' +
      '<b>⚠️ 지금 가장 약한 주제</b>' +
      '<button class="btn btn-warm btn-sm" id="btnFocus">이 주제들 집중 공부 ▶</button></div>' +
      weakRows + '</div>';
  }

  // 최근 14일 학습 그래프
  var goal = S.goal || 15;
  var days = [];
  var gd = new Date(); gd.setDate(gd.getDate() - 13);
  for (var i = 0; i < 14; i++) {
    var key = fmtDate(gd);
    days.push({ key: key, n: (S.daily[key] || { answered: 0 }).answered });
    gd.setDate(gd.getDate() + 1);
  }
  var maxN = Math.max(goal, Math.max.apply(null, days.map(function (x) { return x.n; })));
  var barsHtml = days.map(function (x) {
    var h = x.n ? Math.max(6, Math.round(x.n / maxN * 100)) : 2;
    var cls = x.n >= goal ? ' hit' : (x.n > 0 ? ' some' : '');
    return '<div class="gcol" title="' + esc(x.key) + ' · ' + x.n + '문제"><i class="gbar' + cls + '" style="height:' + h + '%"></i></div>';
  }).join('');
  var graphHtml = '<div class="card">' +
    '<b style="display:block;margin-bottom:4px">📈 최근 14일 공부 기록</b>' +
    '<span class="muted">초록 막대 = 하루 목표(' + goal + '문제) 달성한 날 · 그래프가 빈칸 없이 채워지는 게 합격 비결이에요</span>' +
    '<div class="graph">' + barsHtml + '</div>' +
    '<div class="graph-x"><span>' + esc(days[0].key.slice(5)) + '</span><span>오늘</span></div>' +
    '</div>';

  // 배지 진열장
  var earnedN = Object.keys(S.badges).length;
  var badgeCells = BADGES.map(function (b) {
    var got = S.badges[b.id];
    return '<div class="badge-cell' + (got ? ' got' : '') + '" title="' + esc(b.desc) + (got ? ' · ' + got : '') + '">' +
      '<div class="badge-icon">' + b.icon + '</div>' +
      '<div class="badge-name">' + esc(b.name) + '</div>' +
      '<div class="badge-desc">' + esc(got ? '획득!' : b.desc) + '</div></div>';
  }).join('');
  var badgesHtml = '<div class="card">' +
    '<b style="display:block;margin-bottom:12px">🏅 배지 진열장 <span class="muted" style="font-weight:400">(' + earnedN + ' / ' + BADGES.length + ')</span></b>' +
    '<div class="badge-grid">' + badgeCells + '</div></div>';

  v.innerHTML =
    '<div class="card overall-box">' +
    '<div class="muted">지금 실력으로 예상 평균</div>' +
    '<div class="avg" style="color:' + (avg == null ? 'var(--ink-faint)' : (avg >= 60 ? 'var(--good)' : (avg >= 40 ? 'var(--warn)' : 'var(--bad)'))) + '">' + (avg == null ? '—' : avg + '점') + '</div>' +
    '<div class="avg-msg">' + esc(msg) + '</div>' +
    '<div class="today-line" style="margin-top:14px">' +
    '<span class="today-pill">지금까지 <b>' + totalAnswered + '문제</b></span>' +
    '<span class="today-pill">전체 정답률 <b>' + (totalAnswered ? Math.round(totalCorrect / totalAnswered * 100) : 0) + '%</b></span>' +
    (streakDays() > 1 ? '<span class="today-pill">🔥 <b>' + streakDays() + '일</b> 연속</span>' : '') +
    '</div></div>' +
    '<div class="card">' +
    '<b style="display:block;margin-bottom:16px">과목별 예상 점수 <span class="muted" style="font-weight:400">(최근에 푼 결과 기준)</span></b>' +
    rows + '</div>' +
    weakHtml +
    graphHtml +
    badgesHtml +
    '<div class="danger-zone"><button id="btnReset">기록 전체 초기화</button></div>';

  if (weak.length) $('#btnFocus').onclick = startFocusSession;
  $('#btnReset').onclick = function () {
    if (confirm('정말 모든 학습 기록을 지울까요? 되돌릴 수 없어요.')) {
      localStorage.removeItem(LS_KEY);
      S = loadState();
      renderHome();
    }
  };
  updateBadge();
}

/* ---------- 공통 ---------- */
function updateBadge() {
  var n = needReviewCount();
  $('#wrongBadge').textContent = n ? String(n) : '';
}
function confirmLeave() {
  if (session && session.answered.length < session.queue.length) {
    return confirm('풀던 세트를 그만두고 이동할까요? (푼 문제 기록은 저장돼 있어요)');
  }
  return true;
}
document.querySelectorAll('.nav-btn').forEach(function (b) {
  b.onclick = function () {
    if (!confirmLeave()) return;
    var to = b.getAttribute('data-nav');
    if (to === 'home') renderHome();
    else if (to === 'journey') { if (window.renderJourney) window.renderJourney(); }
    else if (to === 'games') { if (window.renderGames) window.renderGames(); }
    else if (to === 'dojo') { if (window.renderDojoHub) window.renderDojoHub(); }
    else if (to === 'codex') { if (window.renderCodex) window.renderCodex(); }
    else if (to === 'dict') renderDict();
    else if (to === 'notebook') renderNotebook();
    else renderStats();
  };
});
$('#logoHome').onclick = function () { if (confirmLeave()) renderHome(); };

/* 키보드 단축키: 1~4 답 선택, 0 모르겠어요, Enter/Space 다음 */
document.addEventListener('keydown', function (e) {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
  // 지수 훈련 키보드
  if (typeof drill !== 'undefined' && drill) {
    var drNext = document.getElementById('drNext');
    if (drNext) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drNext.click(); } return; }
    if (e.key >= '1' && e.key <= '4' && window.__drillKey) { window.__drillKey(parseInt(e.key, 10)); return; }
  }
  // 계산 도장 키보드
  if (typeof dojo !== 'undefined' && dojo) {
    var djn = document.getElementById('djStepNext') || document.getElementById('djNext');
    if (djn) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); djn.click(); } return; }
    var djp = document.querySelectorAll('[data-djpick]');
    if (djp.length && !djp[0].disabled && e.key >= '1' && e.key <= '4' && djp[parseInt(e.key, 10) - 1]) { djp[parseInt(e.key, 10) - 1].click(); return; }
  }
  // 보스전 키보드
  if (typeof battle !== 'undefined' && battle && !battle.over) {
    var bnext = document.getElementById('bNext');
    if (bnext) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bnext.click(); } return; }
    var bpicks = document.querySelectorAll('[data-bpick]');
    if (bpicks.length && !bpicks[0].disabled && e.key >= '1' && e.key <= '4') bpicks[parseInt(e.key, 10) - 1].click();
    return;
  }
  if (!session) return;
  var next = document.getElementById('nextBtn');
  if (next) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next.click(); }
    return;
  }
  var picks = document.querySelectorAll('[data-pick]');
  if (picks.length && !picks[0].disabled) {
    if (e.key >= '1' && e.key <= '4') picks[parseInt(e.key, 10) - 1].click();
    else if (e.key === '0') { var dn = document.getElementById('dunnoBtn'); if (dn) dn.click(); }
  }
});

/* 모의고사 경과 시간 표시 */
setInterval(function () {
  var el = document.getElementById('examTimer');
  if (el && session && session.startTs) {
    var s = Math.floor((Date.now() - session.startTs) / 1000);
    el.textContent = '⏱ ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
}, 1000);

renderHome();
