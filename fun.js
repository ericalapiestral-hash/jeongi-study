/* ===== 🎉 재미 레이어 — 컨페티·진동·일일 퀘스트·마스코트 ===== */
'use strict';

/* ---------- 진동 (안드로이드 폰) ---------- */
window.haptic = function (kind) {
  if (S.mute) return;
  if (!navigator.vibrate) return;
  try {
    if (kind === 'ok') navigator.vibrate(18);
    else if (kind === 'no') navigator.vibrate([28, 45, 28]);
    else if (kind === 'big') navigator.vibrate([22, 40, 22, 40, 60]);
    else navigator.vibrate(14);
  } catch (e) { }
};

/* ---------- 컨페티 ---------- */
var confettiCv = null, confettiPieces = [], confettiRAF = null;
function ensureCanvas() {
  if (confettiCv) return confettiCv;
  confettiCv = document.createElement('canvas');
  confettiCv.id = 'confettiCanvas';
  document.body.appendChild(confettiCv);
  return confettiCv;
}
window.celebrate = function (power) {
  var cv = ensureCanvas();
  var w = cv.width = window.innerWidth;
  var h = cv.height = window.innerHeight;
  var ctx = cv.getContext('2d');
  var colors = ['#ffd23f', '#3457d5', '#14915f', '#e4574a', '#7b2ff2', '#ff9f43'];
  var n = power === 'big' ? 130 : (power === 'small' ? 35 : 70);
  for (var i = 0; i < n; i++) {
    confettiPieces.push({
      x: w / 2 + (Math.random() - 0.5) * w * 0.5,
      y: h * 0.35 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 11,
      vy: Math.random() * -11 - 4,
      s: Math.random() * 7 + 4,
      c: colors[Math.floor(Math.random() * colors.length)],
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1
    });
  }
  if (confettiRAF) return;
  (function loop() {
    ctx.clearRect(0, 0, w, h);
    var alive = false;
    confettiPieces.forEach(function (p) {
      if (p.life <= 0) return;
      alive = true;
      p.vy += 0.32;           // 중력
      p.vx *= 0.995;
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      if (p.y > h + 30) p.life = 0;
      p.life -= 0.004;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    });
    if (alive) { confettiRAF = requestAnimationFrame(loop); }
    else {
      confettiPieces = [];
      ctx.clearRect(0, 0, w, h);
      cancelAnimationFrame(confettiRAF);
      confettiRAF = null;
    }
  })();
};

/* ---------- 마스코트 (레벨에 따라 성장) ---------- */
var MASCOTS = [
  { at: 1, emoji: '🔌', name: '콘센트', line: '아직 아무것도 안 꽂혔지만, 곧 불이 들어올 거예요!' },
  { at: 2, emoji: '💡', name: '꼬마전구', line: '작지만 확실하게 빛나기 시작했어요!' },
  { at: 3, emoji: '🔦', name: '손전등', line: '어두운 문제도 비춰볼 수 있게 됐어요.' },
  { at: 4, emoji: '🪫', name: '충전 중 배터리', line: '실력이 차오르는 중! 조금만 더요.' },
  { at: 5, emoji: '🔋', name: '완충 배터리', line: '이제 웬만한 문제는 감당할 수 있어요!' },
  { at: 6, emoji: '⚡', name: '번개', line: '문제를 보면 답이 번쩍 떠오르기 시작해요!' },
  { at: 7, emoji: '🗼', name: '송전탑', line: '합격이 코앞이에요. 흔들리지 않아요.' },
  { at: 8, emoji: '👑', name: '전기의 신', line: '당신은 이미 합격자입니다.' }
];
window.mascotFor = function (lv) {
  var m = MASCOTS[0];
  MASCOTS.forEach(function (x) { if (lv >= x.at) m = x; });
  return m;
};

/* ---------- 일일 퀘스트 ---------- */
function dqToday() {
  var t = todayStr();
  S.dq = S.dq || {};
  if (!S.dq[t]) S.dq[t] = { lesson: 0, formula: 0, dojo: 0, boss: 0, drill: 0, claimed: {} };
  if (!S.dq[t].claimed) S.dq[t].claimed = {};
  // 오래된 기록 정리 (7일치만)
  var keys = Object.keys(S.dq);
  if (keys.length > 7) keys.sort().slice(0, keys.length - 7).forEach(function (k) { delete S.dq[k]; });
  return S.dq[t];
}
window.dqBump = function (field, n) {
  var d = dqToday();
  d[field] = (d[field] || 0) + (n || 1);
  saveState();
};

var QUEST_POOL = [
  { id: 'answer10', text: '문제 10개 풀기', target: 10, xp: 30, prog: function () { return (S.daily[todayStr()] || {}).answered || 0; } },
  { id: 'answer20', text: '문제 20개 풀기', target: 20, xp: 50, prog: function () { return (S.daily[todayStr()] || {}).answered || 0; } },
  { id: 'correct8', text: '정답 8개 맞히기', target: 8, xp: 35, prog: function () { return (S.daily[todayStr()] || {}).correct || 0; } },
  { id: 'lesson1', text: '이론 레슨 1개 완주', target: 1, xp: 30, prog: function () { return dqToday().lesson; } },
  { id: 'lesson2', text: '이론 레슨 2개 완주', target: 2, xp: 45, prog: function () { return dqToday().lesson; } },
  { id: 'formula2', text: '공식 2개 외우기', target: 2, xp: 30, prog: function () { return dqToday().formula; } },
  { id: 'dojo2', text: '계산 도장 2문제 완주', target: 2, xp: 40, prog: function () { return dqToday().dojo; } },
  { id: 'boss1', text: '보스 1마리 쓰러뜨리기', target: 1, xp: 60, prog: function () { return dqToday().boss; } },
  { id: 'drill8', text: '지수 훈련 8문제 맞히기', target: 8, xp: 35, prog: function () { return dqToday().drill; } },
  { id: 'review3', text: '오답 3개 극복하기', target: 3, xp: 45, prog: function () {
    var n = 0; for (var k in S.wrong) if (S.wrong[k].overcame && S.wrong[k].ts && fmtDate(new Date(S.wrong[k].ts)) === todayStr()) n++; return n;
  } }
];

/* 날짜로 고정된 3개 뽑기 (새로고침해도 안 바뀜) */
function dqSeed() {
  var t = todayStr(), h = 0;
  for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 100000;
  return h;
}
window.dailyQuests = function () {
  var seed = dqSeed();
  var pool = QUEST_POOL.slice();
  var picked = [];
  for (var i = 0; i < 3 && pool.length; i++) {
    var idx = (seed + i * 37) % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.map(function (q) {
    var p = Math.min(q.prog(), q.target);
    return { id: q.id, text: q.text, target: q.target, xp: q.xp, prog: p, done: p >= q.target };
  });
};

/* 완료된 퀘스트 자동 보상 지급 */
window.dqCheckRewards = function (silent) {
  var d = dqToday();
  var qs = window.dailyQuests();
  var newly = [];
  qs.forEach(function (q) {
    if (q.done && !d.claimed[q.id]) {
      d.claimed[q.id] = true;
      newly.push(q);
    }
  });
  if (!newly.length) { return 0; }
  saveState();
  var gained = 0;
  newly.forEach(function (q) { gained += q.xp; });
  if (!silent) {
    newly.forEach(function (q) { toast('✅ 퀘스트 완료: ' + q.text + ' +' + q.xp + ' XP', true); });
    addXP(gained, true);
    if (window.haptic) haptic('big');
    if (window.celebrate) celebrate('small');
  } else {
    addXP(gained, true);
  }
  // 3개 전부 완료 보너스
  var allDone = qs.every(function (q) { return q.done; });
  if (allDone && !d.claimed.__all) {
    d.claimed.__all = true;
    saveState();
    addXP(80, true);
    toast('🎊 오늘의 퀘스트 3개 전부 완료! 보너스 +80 XP', true);
    if (window.celebrate) celebrate('big');
    if (window.haptic) haptic('big');
  }
  return newly.length;
};

/* ---------- 📲 앱으로 설치하기 ---------- */
window.isStandalone = function () {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
};
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
window.installBarHtml = function () {
  if (window.isStandalone()) return '';              // 이미 앱으로 실행 중
  if (S.installHidden === todayStr()) return '';     // 오늘은 닫아둠
  if (window.__installPrompt) {
    return '<div class="install-bar" id="installBar">' +
      '<div class="ib-left"><b>📲 앱으로 설치하기</b>' +
      '<div class="ib-sub">홈 화면 아이콘으로 열리고, 인터넷 없어도 공부할 수 있어요</div></div>' +
      '<span class="ib-go" id="installGo">설치 ▶</span>' +
      '<button class="ib-x" id="installX">✕</button></div>';
  }
  if (isIOS()) {
    return '<div class="install-bar ios" id="installBar">' +
      '<div class="ib-left"><b>📲 아이폰에 앱으로 설치</b>' +
      '<div class="ib-sub">사파리 아래 <b>공유 버튼</b> → <b>홈 화면에 추가</b> 를 누르면 앱이 돼요<br>' +
      '<span class="ib-warn">⚠️ 지금 사파리에서 푼 기록은 앱으로 안 넘어가요. 설치부터 하고 시작하세요!</span></div></div>' +
      '<button class="ib-x" id="installX">✕</button></div>';
  }
  return '';
};
window.bindInstallBar = function () {
  var go = document.getElementById('installGo');
  if (go) go.onclick = async function () {
    var p = window.__installPrompt;
    if (!p) return;
    p.prompt();
    try {
      var res = await p.userChoice;
      if (res.outcome === 'accepted') {
        window.__installPrompt = null;
        if (window.celebrate) celebrate('small');
      }
    } catch (e) { }
  };
  var x = document.getElementById('installX');
  if (x) x.onclick = function (e) {
    e.stopPropagation();
    S.installHidden = todayStr(); saveState();
    var b = document.getElementById('installBar');
    if (b) b.remove();
  };
};
window.refreshInstallBar = function () {
  // 홈 화면을 보고 있으면 다시 그려서 설치 배너를 띄운다
  if (document.querySelector('.quest-card') && typeof renderHome === 'function') renderHome();
};

/* ---------- 🛡 스트릭 방패 (하루 빠져도 지켜줌) ---------- */
window.applyShield = function () {
  S.shieldUsed = S.shieldUsed || {};
  S.shields = S.shields || 0;
  var t = todayStr();
  if (S.shieldCheckedOn === t) return null;
  S.shieldCheckedOn = t;

  // 어제 공부 안 했고, 그저께는 했다면(=오늘 끊길 위기) 방패 소모
  var y = addDays(t, -1), dby = addDays(t, -2);
  var studied = function (d) { return (S.daily[d] && S.daily[d].answered > 0) || S.shieldUsed[d]; };
  var saved = null;
  if (!studied(y) && studied(dby) && S.shields > 0) {
    S.shields--;
    S.shieldUsed[y] = true;
    saved = true;
  }
  saveState();
  return saved;
};
window.grantShield = function () {
  // 3일 연속마다 방패 1개 (최대 2개)
  var st = streakDays();
  S.shields = S.shields || 0;
  S.shieldMark = S.shieldMark || 0;
  if (st > 0 && st % 3 === 0 && S.shieldMark !== st && S.shields < 2) {
    S.shields++; S.shieldMark = st; saveState();
    toast('🛡 누전차단기 획득! 하루 빠져도 연속 기록을 지켜줘요 (보유 ' + S.shields + '개)', true);
    return true;
  }
  return false;
};

/* ---------- 🏦 60점 저금통 (확실히 아는 것만 입금) ---------- */
window.piggy = function () {
  var subs = (typeof examSubjects === 'function') ? examSubjects() : DATA.subjects;
  var total = 0, sure = 0;
  subs.forEach(function (s) {
    s.units.forEach(function (u, ui) {
      total++;
      var srs = S.srs[s.key + '-' + ui];
      if (srs && srs.lvl >= 3) sure++;   // 서로 다른 날 3번 이상 정답 = 확실
    });
  });
  var score = total ? Math.round(sure / total * 100) : 0;
  return { sure: sure, total: total, score: score };
};
window.piggyHtml = function () {
  var p = window.piggy();
  var gold = p.score >= 60;
  if (gold && !S.piggyGoldDate) { S.piggyGoldDate = todayStr(); saveState(); }
  return '<div class="piggy' + (gold ? ' gold' : '') + '">' +
    '<div class="piggy-top"><span>🏦 60점 저금통</span>' +
    '<span class="piggy-hint">확실히 아는 개념만 입금돼요</span></div>' +
    '<div class="piggy-score">' + p.score + '<span>점</span></div>' +
    '<div class="piggy-bar"><i style="width:' + Math.min(100, p.score) + '%"></i>' +
    '<span class="piggy-goal" style="left:60%"></span></div>' +
    '<div class="piggy-foot">' + p.sure + ' / ' + p.total + ' 개념 확정 · ' +
    (gold ? '🎉 합격선 60점 돌파! (' + esc(S.piggyGoldDate) + ')' : '60점까지 ' + (60 - p.score) + '점') + '</div>' +
    '</div>';
};

/* ---------- 🚪 문지기: 앱을 열면 딱 한 문제 ---------- */
var gateRun = null;
function gatePick() {
  // 복습 시기가 된 것 우선, 없으면 최근 틀린 것
  var best = null;
  DATA.subjects.forEach(function (s) {
    s.units.forEach(function (u, ui) {
      var am = S.attempts[qidOf(s.key, ui, 'm')], at = S.attempts[qidOf(s.key, ui, 't')];
      if (!am && !at) return;                       // 한 번도 안 본 건 제외
      var srs = S.srs[unitKeyOf(s.key, ui)];
      if (!srs || !srs.due) return;
      var overdue = srs.due <= todayStr();
      var score = (overdue ? 0 : 1) * 1000 + (srs.lvl || 0);
      if (!best || score < best.score) best = { subjKey: s.key, ui: ui, score: score };
    });
  });
  return best;
}
window.maybeShowGate = function () {
  var t = todayStr();
  S.gate = S.gate || {};
  if (S.gate.date === t) return false;             // 오늘 이미 함
  var pick = gatePick();
  if (!pick) return false;                          // 아직 푼 문제가 없으면 패스
  gateRun = { subjKey: pick.subjKey, ui: pick.ui, which: whichToServe(pick.subjKey, pick.ui), locked: false };
  renderGate();
  return true;
};
function renderGate(picked) {
  var g = getQuestion(gateRun);
  if (!g) { S.gate = { date: todayStr(), done: true }; saveState(); renderHome(); return; }
  var q = g.q;
  var answered = typeof picked === 'number';
  var v = $('#view');
  var choices = q.choices.map(function (c, i) {
    var cls = 'choice';
    if (answered) {
      if (i === q.answer) cls += (i === picked ? ' picked-right' : ' reveal-right');
      else if (i === picked) cls += ' picked-wrong';
      else cls += ' dim';
    }
    return '<button class="' + cls + '" data-gpick="' + i + '"' + (answered ? ' disabled' : '') + '>' +
      '<span class="num">' + CIRCLED[i] + '</span><span>' + esc(c) + '</span></button>';
  }).join('');
  var fb = '';
  if (answered) {
    var ok = picked === q.answer;
    fb = '<div class="verdict ' + (ok ? 'ok' : 'no') + '">' +
      '<div class="verdict-title">' + (ok ? '⭕ 정답! 기억이 살아있네요 💪' : '❌ 이건 다시 봐야 해요') + '</div>' +
      (ok ? '' : '<div class="answer-line">정답: ' + CIRCLED[q.answer] + ' ' + esc(q.choices[q.answer]) + '</div>') +
      '<div class="explain">' + esc(q.explain) + '</div></div>' +
      '<div class="quiz-next"><button class="btn btn-primary btn-big" id="gateGo">홈으로 ▶</button></div>';
  }
  v.innerHTML =
    '<div class="gate-wrap">' +
    '<div class="gate-badge">🚪 오늘의 문지기</div>' +
    '<div class="gate-title">딱 한 문제만 풀고 들어가요</div>' +
    '<div class="gate-sub">잊어버리기 직전인 개념이에요. 1분도 안 걸려요!</div>' +
    '<div class="card" style="margin-top:16px;text-align:left">' +
    '<span class="topic-chip">' + esc(g.subj.name) + ' · ' + esc(g.unit.topic) + '</span>' +
    '<div class="qtext">' + esc(q.q) + '</div>' +
    '<div class="choices">' + choices + '</div>' +
    fb + '</div>' +
    (answered ? '' : '<button class="gate-skip" id="gateSkip">오늘은 그냥 들어갈게요</button>') +
    '</div>';
  if (!answered) {
    document.querySelectorAll('[data-gpick]').forEach(function (b) {
      b.onclick = function () {
        if (gateRun.locked) return;
        gateRun.locked = true;
        var pick = parseInt(b.getAttribute('data-gpick'), 10);
        recordAttempt(gateRun.subjKey, gateRun.ui, gateRun.which, pick === q.answer, {});
        S.gate = { date: todayStr(), done: true };
        saveState();
        if (pick === q.answer && window.celebrate) celebrate('small');
        renderGate(pick);
      };
    });
    $('#gateSkip').onclick = function () {
      S.gate = { date: todayStr(), skipped: true };
      saveState();
      renderHome();
    };
  } else {
    $('#gateGo').onclick = function () { renderHome(); };
  }
  window.scrollTo(0, 0);
}

/* 홈에 붙일 퀘스트 카드 HTML */
window.questCardHtml = function () {
  var qs = window.dailyQuests();
  var doneN = qs.filter(function (q) { return q.done; }).length;
  var rows = qs.map(function (q) {
    var pct = Math.round(q.prog / q.target * 100);
    return '<div class="quest-row' + (q.done ? ' done' : '') + '">' +
      '<span class="quest-check">' + (q.done ? '✅' : '⬜') + '</span>' +
      '<div class="quest-body">' +
      '<div class="quest-text">' + esc(q.text) + ' <b>' + q.prog + '/' + q.target + '</b></div>' +
      '<div class="quest-bar"><i style="width:' + pct + '%"></i></div>' +
      '</div>' +
      '<span class="quest-xp">+' + q.xp + '</span>' +
      '</div>';
  }).join('');
  return '<div class="card quest-card">' +
    '<div class="quest-head"><b>🎯 오늘의 퀘스트</b><span class="quest-count">' + doneN + ' / 3</span></div>' +
    rows +
    (doneN === 3 ? '<div class="quest-all">🎊 오늘 퀘스트 전부 완료! 보너스 +80 XP</div>' : '') +
    '</div>';
};
