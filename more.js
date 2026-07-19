/* ===== 🎮 추가 게임 모드 & 도구 (전부 기존 데이터로 생성) ===== */
'use strict';

var CIRC3 = ['①', '②', '③', '④'];
function allUnitRefs() {
  var out = [];
  DATA.subjects.forEach(function (s) {
    s.units.forEach(function (u, ui) { out.push({ subjKey: s.key, subjName: s.name, ui: ui, unit: u }); });
  });
  return out;
}

/* ================= 1) 🧗 무한 등반 (서든데스) ================= */
var climb = null;
function startClimb() {
  session = null; lessonRun = null;
  climb = { floor: 0, lives: 3, pool: shuffle(allUnitRefs()), pi: 0, locked: false, cur: null };
  nextClimb();
}
function nextClimb() {
  if (climb.pi >= climb.pool.length) { climb.pool = shuffle(allUnitRefs()); climb.pi = 0; }
  var r = climb.pool[climb.pi];
  climb.cur = { subjKey: r.subjKey, ui: r.ui, which: Math.random() < 0.5 ? 'm' : 't', ref: r };
  climb.locked = false;
  renderClimb();
}
function renderClimb(picked) {
  var g = getQuestion(climb.cur);
  if (!g) { climb.pi++; nextClimb(); return; }
  var q = g.q, answered = typeof picked === 'number';
  var hearts = '';
  for (var i = 0; i < 3; i++) hearts += (i < climb.lives ? '❤️' : '🤍');
  var opts = q.choices.map(function (c, i) {
    var cls = 'choice';
    if (answered) {
      if (i === q.answer) cls += (i === picked ? ' picked-right' : ' reveal-right');
      else if (i === picked) cls += ' picked-wrong';
      else cls += ' dim';
    }
    return '<button class="' + cls + '" data-clpick="' + i + '"' + (answered ? ' disabled' : '') + '>' +
      '<span class="num">' + CIRC3[i] + '</span><span>' + esc(c) + '</span></button>';
  }).join('');
  var fb = '';
  if (answered) {
    var ok = picked === q.answer;
    fb = '<div class="verdict ' + (ok ? 'ok' : 'no') + '">' +
      '<div class="verdict-title">' + (ok ? '⛰️ ' + climb.floor + '층 도달!' : '💥 추락… 하트 1개를 잃었어요') + '</div>' +
      (ok ? '' : '<div class="answer-line">정답: ' + CIRC3[q.answer] + ' ' + esc(q.choices[q.answer]) + '</div>') +
      '<div class="explain">' + esc(q.explain) + '</div></div>' +
      '<div class="quiz-next"><button class="btn btn-primary btn-big" id="clNext">' +
      (climb.lives <= 0 ? '결과 보기 ▶' : '다음 층으로 ⛰️') + '</button></div>';
  }
  $('#view').innerHTML =
    '<div class="quiz-head"><span class="quiz-mode">🧗 무한 등반</span>' +
    '<span class="quiz-progress">' + hearts + '</span></div>' +
    '<div class="climb-floor">' + climb.floor + '<span>층</span>' +
    (S.climbBest ? '<span class="climb-best">최고 ' + S.climbBest + '층</span>' : '') + '</div>' +
    '<div class="card">' +
    '<span class="topic-chip">' + esc(g.subj.name) + ' · ' + esc(g.unit.topic) + '</span>' +
    '<div class="qtext">' + esc(q.q) + '</div>' +
    '<div class="choices">' + opts + '</div>' + fb + '</div>';
  if (!answered) {
    document.querySelectorAll('[data-clpick]').forEach(function (b) {
      b.onclick = function () {
        if (climb.locked) return; climb.locked = true;
        var p = parseInt(b.getAttribute('data-clpick'), 10);
        var ok = p === q.answer;
        recordAttempt(climb.cur.subjKey, climb.cur.ui, climb.cur.which, ok, {});
        if (ok) { climb.floor++; if (climb.floor > (S.climbBest || 0)) { S.climbBest = climb.floor; saveState(); } }
        else climb.lives--;
        renderClimb(p);
      };
    });
  } else {
    $('#clNext').onclick = function () {
      if (climb.lives <= 0) { renderClimbResult(); return; }
      climb.pi++; nextClimb();
    };
  }
  window.scrollTo(0, 0);
}
function renderClimbResult() {
  var best = S.climbBest || 0;
  var isNew = climb.floor >= best && climb.floor > 0;
  if (isNew && window.celebrate) celebrate('big');
  addXP(20); checkBadges();
  $('#view').innerHTML =
    '<div class="card result-hero">' +
    '<div style="font-size:2.6rem">⛰️</div>' +
    '<div class="big">' + climb.floor + '층</div>' +
    '<div class="msg">' + (isNew ? '🎉 신기록! 어제의 나를 이겼어요' : '최고 기록 ' + best + '층까지 ' + Math.max(0, best - climb.floor + 1) + '층 남았어요') + '</div>' +
    '<div class="result-actions">' +
    '<button class="btn btn-primary" id="clAgain">🧗 다시 도전</button>' +
    '<button class="btn btn-ghost" id="clHome">홈으로</button></div></div>';
  $('#clAgain').onclick = startClimb;
  $('#clHome').onclick = renderHome;
}

/* ================= 2) ✂️ 소거법 훈련 ================= */
var elim = null;
function startElim() {
  session = null; lessonRun = null;
  elim = { n: 0, total: 8, correct: 0, pool: shuffle(allUnitRefs()), pi: 0, picked: [], locked: false };
  nextElim();
}
function nextElim() {
  var r = elim.pool[elim.pi % elim.pool.length];
  elim.cur = { subjKey: r.subjKey, ui: r.ui, which: Math.random() < 0.5 ? 'm' : 't' };
  elim.picked = []; elim.locked = false;
  renderElim();
}
function renderElim(done) {
  var g = getQuestion(elim.cur);
  if (!g) { elim.pi++; nextElim(); return; }
  var q = g.q;
  var opts = q.choices.map(function (c, i) {
    var cls = 'choice elim-opt';
    if (elim.picked.indexOf(i) >= 0) cls += (done ? (i === q.answer ? ' picked-wrong' : ' struck-ok') : ' struck');
    if (done && i === q.answer) cls += ' reveal-right';
    return '<button class="' + cls + '" data-elpick="' + i + '"' + (done ? ' disabled' : '') + '>' +
      '<span class="num">' + CIRC3[i] + '</span><span>' + esc(c) + '</span></button>';
  }).join('');
  var fb = '';
  if (done) {
    var ok = elim.picked.indexOf(q.answer) === -1;
    fb = '<div class="verdict ' + (ok ? 'ok' : 'no') + '">' +
      '<div class="verdict-title">' + (ok ? '✂️ 완벽! 정답을 남기고 오답만 지웠어요' : '❌ 앗, 정답을 지워버렸어요') + '</div>' +
      '<div class="answer-line">정답: ' + CIRC3[q.answer] + ' ' + esc(q.choices[q.answer]) + '</div>' +
      '<div class="explain">' + esc(q.explain) + '</div></div>' +
      '<div class="quiz-next"><button class="btn btn-primary btn-big" id="elNext">' +
      (elim.n + 1 >= elim.total ? '결과 보기 ▶' : '다음 ▶') + '</button></div>';
  }
  $('#view').innerHTML =
    '<div class="quiz-head"><span class="quiz-mode">✂️ 소거법 훈련</span>' +
    '<span class="quiz-progress">' + (elim.n + 1) + ' / ' + elim.total + '</span></div>' +
    '<div class="elim-banner">🎯 정답을 고르지 마세요! <b>확실히 아닌 것 2개</b>를 지우는 게 목표예요. 모르는 문제도 이렇게 하면 확률이 2배가 돼요.</div>' +
    '<div class="card">' +
    '<span class="topic-chip">' + esc(g.subj.name) + ' · ' + esc(g.unit.topic) + '</span>' +
    '<div class="qtext">' + esc(q.q) + '</div>' +
    '<div class="choices">' + opts + '</div>' +
    (done ? '' : '<div class="muted" style="text-align:center;margin-top:12px">지운 개수: ' + elim.picked.length + ' / 2</div>') +
    fb + '</div>';
  if (!done) {
    document.querySelectorAll('[data-elpick]').forEach(function (b) {
      b.onclick = function () {
        if (elim.locked) return;
        var i = parseInt(b.getAttribute('data-elpick'), 10);
        var at = elim.picked.indexOf(i);
        if (at >= 0) elim.picked.splice(at, 1); else elim.picked.push(i);
        if (elim.picked.length >= 2) {
          elim.locked = true;
          var ok = elim.picked.indexOf(q.answer) === -1;
          if (ok) elim.correct++;
          if (window.haptic) haptic(ok ? 'ok' : 'no');
          addXP(ok ? 6 : 2, true); saveState();
          renderElim(true);
        } else renderElim();
      };
    });
  } else {
    $('#elNext').onclick = function () {
      elim.n++; elim.pi++;
      if (elim.n >= elim.total) {
        addXP(20); checkBadges();
        $('#view').innerHTML = '<div class="card result-hero"><div style="font-size:2.4rem">✂️</div>' +
          '<div class="big">' + elim.correct + ' / ' + elim.total + '</div>' +
          '<div class="msg">소거법은 몰라도 점수를 만드는 기술이에요. 시험장에서 이게 합격을 만들어요!</div>' +
          '<div class="result-actions"><button class="btn btn-primary" id="elAgain">한 판 더</button>' +
          '<button class="btn btn-ghost" id="elHome">홈으로</button></div></div>';
        $('#elAgain').onclick = startElim; $('#elHome').onclick = renderHome;
      } else nextElim();
    };
  }
  window.scrollTo(0, 0);
}

/* ================= 3) 🐞 버그 헌트 (틀린 풀이 줄 찾기) ================= */
var bug = null;
function dojoAll() {
  var out = [];
  ((window.DOJO_DATA || {}).subjects || []).forEach(function (s) {
    s.problems.forEach(function (p) { if (p.steps && p.steps.length >= 3) out.push({ subjName: s.name, p: p }); });
  });
  return out;
}
function makeBug(item) {
  var p = item.p;
  // 각 단계의 정답 보기로 "올바른 풀이"를 만들고, 한 줄만 그 단계의 오답 보기로 바꿔치기
  var lines = p.steps.map(function (st) { return st.options[st.answer]; });
  var candidates = [];
  p.steps.forEach(function (st, i) {
    st.options.forEach(function (o, oi) { if (oi !== st.answer) candidates.push({ i: i, text: o, why: st.why }); });
  });
  if (!candidates.length) return null;
  var pick = candidates[Math.floor(Math.random() * candidates.length)];
  lines[pick.i] = pick.text;
  return { subjName: item.subjName, topic: p.topic, question: p.question, lines: lines, badIdx: pick.i, why: pick.why, finalAnswer: p.finalAnswer };
}
function startBugHunt() {
  session = null; lessonRun = null;
  var pool = dojoAll();
  if (!pool.length) { toast('계산 도장 문제가 필요해요!'); return; }
  bug = { n: 0, total: 5, correct: 0, pool: shuffle(pool), pi: 0, cur: null, locked: false };
  nextBug();
}
function nextBug() {
  var made = null, guard = 0;
  while (!made && guard++ < 10) {
    made = makeBug(bug.pool[bug.pi % bug.pool.length]);
    if (!made) bug.pi++;
  }
  if (!made) { renderHome(); return; }
  bug.cur = made; bug.locked = false;
  renderBug();
}
function renderBug(picked) {
  var c = bug.cur, answered = typeof picked === 'number';
  var rows = c.lines.map(function (l, i) {
    var cls = 'bug-line';
    if (answered) {
      if (i === c.badIdx) cls += ' bad';
      else if (i === picked) cls += ' misspick';
      else cls += ' fine';
    }
    return '<button class="' + cls + '" data-bugpick="' + i + '"' + (answered ? ' disabled' : '') + '>' +
      '<span class="bug-no">' + (i + 1) + '</span><span class="bug-txt">' + esc(l) + '</span>' +
      (answered && i === c.badIdx ? '<span class="bug-mark">🐞 여기!</span>' : '') + '</button>';
  }).join('');
  var fb = '';
  if (answered) {
    var ok = picked === c.badIdx;
    fb = '<div class="verdict ' + (ok ? 'ok' : 'no') + '">' +
      '<div class="verdict-title">' + (ok ? '🐞 잡았다! 정확히 찾아냈어요' : '아쉬워요, 진짜 버그는 ' + (c.badIdx + 1) + '번 줄이에요') + '</div>' +
      '<div class="explain">' + esc(c.why) + '</div>' +
      '<div class="answer-line" style="margin-top:8px">올바르게 풀면 → <b>' + esc(c.finalAnswer) + '</b></div></div>' +
      '<div class="quiz-next"><button class="btn btn-primary btn-big" id="bugNext">' +
      (bug.n + 1 >= bug.total ? '결과 보기 ▶' : '다음 문제 ▶') + '</button></div>';
  }
  $('#view').innerHTML =
    '<div class="quiz-head"><span class="quiz-mode">🐞 버그 헌트</span>' +
    '<span class="quiz-progress">' + (bug.n + 1) + ' / ' + bug.total + '</span></div>' +
    '<div class="bug-banner">🔍 아래 풀이에 <b>딱 한 줄이 틀렸어요.</b> 어느 줄일까요? (푸는 게 아니라 채점하는 거예요!)</div>' +
    '<div class="card">' +
    '<span class="topic-chip">' + esc(c.subjName) + ' · ' + esc(c.topic) + '</span>' +
    '<div class="dj-question">' + esc(c.question) + '</div>' +
    '<div class="bug-lines">' + rows + '</div>' + fb + '</div>';
  if (!answered) {
    document.querySelectorAll('[data-bugpick]').forEach(function (b) {
      b.onclick = function () {
        if (bug.locked) return; bug.locked = true;
        var i = parseInt(b.getAttribute('data-bugpick'), 10);
        if (i === c.badIdx) { bug.correct++; addXP(8, true); } else addXP(2, true);
        if (window.haptic) haptic(i === c.badIdx ? 'ok' : 'no');
        saveState();
        renderBug(i);
      };
    });
  } else {
    $('#bugNext').onclick = function () {
      bug.n++; bug.pi++;
      if (bug.n >= bug.total) {
        addXP(25); checkBadges();
        $('#view').innerHTML = '<div class="card result-hero"><div style="font-size:2.4rem">🐞</div>' +
          '<div class="big">' + bug.correct + ' / ' + bug.total + '</div>' +
          '<div class="msg">남의 실수를 찾다 보면 내 실수도 안 보이게 돼요. 계산 실수가 확 줄어들 거예요!</div>' +
          '<div class="result-actions"><button class="btn btn-primary" id="bugAgain">한 판 더</button>' +
          '<button class="btn btn-ghost" id="bugHome">홈으로</button></div></div>';
        $('#bugAgain').onclick = startBugHunt; $('#bugHome').onclick = renderHome;
      } else nextBug();
    };
  }
  window.scrollTo(0, 0);
}

/* ================= 4) 🧩 공식 빈칸 조립 ================= */
var fill = null;
function formulaCards() {
  var out = [];
  ((window.FORMULA_DATA || {}).subjects || []).forEach(function (s) {
    s.cards.forEach(function (c, i) { if (c.symbols && c.symbols.length >= 2) out.push({ subjName: s.name, c: c, id: s.key + '-' + i }); });
  });
  return out;
}
function makeFill(item) {
  var c = item.c;
  // 공식 문자열에서 기호 하나를 빈칸으로
  var syms = c.symbols.map(function (s) { return s.sym; }).filter(function (s) { return c.formula.indexOf(s) >= 0; });
  if (!syms.length) return null;
  var target = syms[Math.floor(Math.random() * syms.length)];
  var idx = c.formula.indexOf(target);
  var blanked = c.formula.slice(0, idx) + '❓' + c.formula.slice(idx + target.length);
  var others = [];
  formulaCards().forEach(function (x) {
    x.c.symbols.forEach(function (s) { if (s.sym !== target && others.indexOf(s.sym) === -1 && s.sym.length <= 3) others.push(s.sym); });
  });
  var opts = [target];
  var guard = 0;
  while (opts.length < 4 && guard++ < 80) {
    var o = others[Math.floor(Math.random() * others.length)];
    if (o && opts.indexOf(o) === -1) opts.push(o);
  }
  var meaning = '';
  c.symbols.forEach(function (s) { if (s.sym === target) meaning = s.mean + (s.unit ? ' [' + s.unit + ']' : ''); });
  return { subjName: item.subjName, name: c.name, blanked: blanked, full: c.formula,
    options: shuffle(opts), answer: target, meaning: meaning, mnemonic: c.mnemonic, fxId: item.id };
}
function startFill() {
  session = null; lessonRun = null;
  var pool = formulaCards();
  if (!pool.length) { toast('공식 데이터가 필요해요!'); return; }
  fill = { n: 0, total: 8, correct: 0, pool: shuffle(pool), pi: 0, locked: false };
  nextFill();
}
function nextFill() {
  var made = null, guard = 0;
  while (!made && guard++ < 12) { made = makeFill(fill.pool[fill.pi % fill.pool.length]); if (!made) fill.pi++; }
  if (!made) { renderHome(); return; }
  fill.cur = made; fill.locked = false;
  renderFill();
}
function renderFill(picked) {
  var c = fill.cur, answered = typeof picked === 'string';
  var opts = c.options.map(function (o) {
    var cls = 'fill-opt';
    if (answered) {
      if (o === c.answer) cls += ' right';
      else if (o === picked) cls += ' wrong';
      else cls += ' dim';
    }
    return '<button class="' + cls + '" data-fillpick="' + esc(o) + '"' + (answered ? ' disabled' : '') + '>' + esc(o) + '</button>';
  }).join('');
  var fb = answered ? '<div class="verdict ' + (picked === c.answer ? 'ok' : 'no') + '">' +
    '<div class="verdict-title">' + (picked === c.answer ? '🧩 정답! 공식이 완성됐어요' : '아쉬워요! 정답은 ' + esc(c.answer)) + '</div>' +
    '<div class="explain"><b>' + esc(c.full) + '</b><br>' + esc(c.answer) + ' = ' + esc(c.meaning) + '</div>' +
    (c.mnemonic ? '<div class="fx-mnemo" style="margin-top:10px"><b>🎯 ' + esc(c.mnemonic) + '</b></div>' : '') + '</div>' +
    '<div class="quiz-next"><button class="btn btn-primary btn-big" id="fillNext">' +
    (fill.n + 1 >= fill.total ? '결과 보기 ▶' : '다음 ▶') + '</button></div>' : '';
  $('#view').innerHTML =
    '<div class="quiz-head"><span class="quiz-mode">🧩 공식 빈칸 조립</span>' +
    '<span class="quiz-progress">' + (fill.n + 1) + ' / ' + fill.total + '</span></div>' +
    '<div class="card" style="text-align:center">' +
    '<span class="topic-chip">' + esc(c.subjName) + ' · ' + esc(c.name) + '</span>' +
    '<div class="fill-formula">' + esc(c.blanked) + '</div>' +
    '<div class="muted" style="margin-bottom:14px">❓ 자리에 들어갈 기호는?</div>' +
    '<div class="fill-opts">' + opts + '</div>' + fb + '</div>';
  if (!answered) {
    document.querySelectorAll('[data-fillpick]').forEach(function (b) {
      b.onclick = function () {
        if (fill.locked) return; fill.locked = true;
        var p = b.getAttribute('data-fillpick');
        if (p === c.answer) {
          fill.correct++; addXP(6, true);
          if (c.fxId) { // 각인 등급 올리기 (동→은→금)
            S.fxHits = S.fxHits || {};
            S.fxHits[c.fxId] = (S.fxHits[c.fxId] || 0) + 1;
            var h = S.fxHits[c.fxId];
            if (h === 1) toast('🥉 공식 각인: 동 — ' + c.name);
            else if (h === 3) { toast('🥈 공식 각인: 은 — ' + c.name, true); if (window.celebrate) celebrate('small'); }
            else if (h === 8) { toast('🥇 공식 각인: 금! ' + c.name + ' 완전히 새겼어요', true); if (window.celebrate) celebrate(); }
          }
        } else addXP(2, true);
        if (window.haptic) haptic(p === c.answer ? 'ok' : 'no');
        saveState(); renderFill(p);
      };
    });
  } else {
    $('#fillNext').onclick = function () {
      fill.n++; fill.pi++;
      if (fill.n >= fill.total) {
        addXP(20); checkBadges();
        $('#view').innerHTML = '<div class="card result-hero"><div style="font-size:2.4rem">🧩</div>' +
          '<div class="big">' + fill.correct + ' / ' + fill.total + '</div>' +
          '<div class="msg">공식을 눈으로만 보는 것과 빈칸을 채우는 건 완전히 달라요. 이게 진짜 외운 거예요!</div>' +
          '<div class="result-actions"><button class="btn btn-primary" id="fillAgain">한 판 더</button>' +
          '<button class="btn btn-ghost" id="fillHome">홈으로</button></div></div>';
        $('#fillAgain').onclick = startFill; $('#fillHome').onclick = renderHome;
      } else nextFill();
    };
  }
  window.scrollTo(0, 0);
}

/* ================= 5) 📄 주간 성적표 카드 (PNG 저장) ================= */
function weekStats() {
  var t = todayStr(), answered = 0, correct = 0, days = 0;
  for (var i = 0; i < 7; i++) {
    var k = addDays(t, -i), d = S.daily[k];
    if (d && d.answered > 0) { answered += d.answered; correct += d.correct; days++; }
  }
  var overcame = 0;
  for (var w in S.wrong) if (S.wrong[w].overcame) overcame++;
  var p = window.piggy ? window.piggy() : { score: 0 };
  var dday = null;
  if (S.examDate) dday = Math.ceil((new Date(S.examDate + 'T00:00:00') - new Date(t + 'T00:00:00')) / 86400000);
  return { answered: answered, correct: correct, days: days, overcame: overcame,
    acc: answered ? Math.round(correct / answered * 100) : 0,
    piggy: p.score, streak: streakDays(), lv: levelInfo().n, dday: dday,
    climb: S.climbBest || 0, formulas: (function () { var n = 0; for (var k in (S.formulaLearned || {})) n++; return n; })() };
}
function drawReport() {
  var w = 720, h = 1020;
  var cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  var x = cv.getContext('2d');
  var s = weekStats();
  // 배경
  var grd = x.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, '#3457d5'); grd.addColorStop(1, '#6a3ff2');
  x.fillStyle = grd; x.fillRect(0, 0, w, h);
  x.fillStyle = '#fff';
  x.textAlign = 'center';
  x.font = 'bold 40px sans-serif';
  x.fillText('이번 주 공부 성적표', w / 2, 90);
  x.font = '22px sans-serif';
  x.fillStyle = 'rgba(255,255,255,.85)';
  x.fillText('전기산업기사 필기 · ' + todayStr(), w / 2, 128);
  if (s.dday !== null && s.dday >= 0) {
    x.font = 'bold 26px sans-serif'; x.fillStyle = '#ffd23f';
    x.fillText('시험까지 D-' + s.dday, w / 2, 168);
  }
  // 카드 박스
  function box(cx, cy, bw, bh, label, value, sub) {
    x.fillStyle = 'rgba(255,255,255,.14)';
    x.beginPath();
    var rr = 20;
    x.moveTo(cx + rr, cy); x.arcTo(cx + bw, cy, cx + bw, cy + bh, rr);
    x.arcTo(cx + bw, cy + bh, cx, cy + bh, rr); x.arcTo(cx, cy + bh, cx, cy, rr);
    x.arcTo(cx, cy, cx + bw, cy, rr); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '20px sans-serif'; x.textAlign = 'center';
    x.fillText(label, cx + bw / 2, cy + 38);
    x.fillStyle = '#fff'; x.font = 'bold 46px sans-serif';
    x.fillText(value, cx + bw / 2, cy + 92);
    if (sub) { x.fillStyle = 'rgba(255,255,255,.75)'; x.font = '17px sans-serif'; x.fillText(sub, cx + bw / 2, cy + 122); }
  }
  var pad = 40, bw = (w - pad * 3) / 2, bh = 145, top = 205;
  box(pad, top, bw, bh, '푼 문제', s.answered + '개', '정답률 ' + s.acc + '%');
  box(pad * 2 + bw, top, bw, bh, '공부한 날', s.days + '일', s.streak > 1 ? '🔥 연속 ' + s.streak + '일' : '');
  box(pad, top + bh + 22, bw, bh, '확실히 아는 점수', s.piggy + '점', '60점이 합격선');
  box(pad * 2 + bw, top + bh + 22, bw, bh, '극복한 오답', s.overcame + '개', '');
  box(pad, top + (bh + 22) * 2, bw, bh, '외운 공식', s.formulas + '개', '');
  box(pad * 2 + bw, top + (bh + 22) * 2, bw, bh, '최고 등반', s.climb + '층', 'Lv.' + s.lv);
  // 메시지
  x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = 'bold 27px sans-serif';
  var msg = s.answered >= 100 ? '이번 주, 정말 열심히 했습니다.' :
    s.answered >= 30 ? '꾸준히 앞으로 가고 있습니다.' :
      s.answered > 0 ? '시작했다는 게 가장 중요합니다.' : '이번 주는 쉬어갔습니다. 내일 다시!';
  x.fillText(msg, w / 2, h - 118);
  x.font = '20px sans-serif'; x.fillStyle = 'rgba(255,255,255,.8)';
  x.fillText('매일 조금씩, 마지막 시험을 향해', w / 2, h - 80);
  x.font = '17px sans-serif'; x.fillStyle = 'rgba(255,255,255,.55)';
  x.fillText('⚡ 전기산업기사 필기 스터디', w / 2, h - 42);
  return cv;
}
function renderReport() {
  session = null; lessonRun = null;
  var s = weekStats();
  $('#view').innerHTML =
    '<div class="card" style="text-align:center">' +
    '<b style="font-size:1.15rem">📄 주간 성적표</b>' +
    '<p class="muted" style="margin-top:6px">이번 주 내가 해낸 것들이에요. 이미지로 저장해서 부모님께 보여드려도 좋아요.</p>' +
    '<div id="reportBox" style="margin-top:14px"></div>' +
    '<div class="result-actions" style="margin-top:14px">' +
    '<button class="btn btn-primary" id="repSave">🖼 이미지로 저장</button>' +
    '<button class="btn btn-ghost" id="repHome">홈으로</button></div></div>';
  var cv = drawReport();
  cv.style.width = '100%'; cv.style.maxWidth = '360px'; cv.style.borderRadius = '16px';
  cv.style.boxShadow = '0 6px 20px rgba(0,0,0,.2)';
  $('#reportBox').appendChild(cv);
  $('#repSave').onclick = function () {
    try {
      var a = document.createElement('a');
      a.download = '전기산업기사_주간성적표_' + todayStr() + '.png';
      a.href = cv.toDataURL('image/png');
      a.click();
      toast('🖼 이미지를 저장했어요!');
    } catch (e) { toast('저장에 실패했어요. 화면을 캡처해 주세요.'); }
  };
  $('#repHome').onclick = renderHome;
  window.scrollTo(0, 0);
}
window.renderReport = renderReport;

/* ================= 6) 💌 시험 전날 편지함 ================= */
function renderLetter() {
  session = null; lessonRun = null;
  var t = todayStr();
  var dday = S.examDate ? Math.ceil((new Date(S.examDate + 'T00:00:00') - new Date(t + 'T00:00:00')) / 86400000) : null;
  var canOpen = dday !== null && dday <= 1;
  var has = !!(S.letter && S.letter.text);
  var body;
  if (!has) {
    body = '<p class="muted" style="margin-top:6px">지금의 마음을 편지로 적어두면, <b>시험 하루 전에</b> 다시 열려요. 그날 가장 흔들릴 때 지금의 내가 나를 붙잡아 줄 거예요.</p>' +
      '<textarea id="letterText" class="letter-area" placeholder="예) 나는 두 번 떨어졌지만 포기하지 않았다. 여기까지 온 것만으로도 대단하다. 내일 시험장에서 아는 문제부터 차분히 풀자..."></textarea>' +
      '<button class="btn btn-primary btn-big" id="letterSave" style="margin-top:12px">✉️ 봉인하기</button>';
  } else if (canOpen) {
    body = '<div class="letter-open"><div class="letter-date">' + esc(S.letter.date) + '의 내가 씁니다</div>' +
      '<div class="letter-body">' + esc(S.letter.text) + '</div></div>' +
      '<p class="muted" style="margin-top:12px">지금까지 정말 잘 해왔어요. 내일, 아는 것부터 차분히 풀면 돼요. 💙</p>' +
      '<button class="btn btn-ghost btn-sm" id="letterReset" style="margin-top:10px">새로 쓰기</button>';
  } else {
    body = '<div class="letter-sealed">🔒<div class="letter-seal-t">봉인됨</div>' +
      '<div class="letter-seal-s">' + (dday === null ? '시험 날짜를 정하면 열리는 날이 정해져요' : '시험 하루 전(D-1)에 열려요 · 지금 D-' + dday) + '</div></div>' +
      '<div class="muted" style="margin-top:10px">' + esc(S.letter.date) + '에 봉인한 편지가 기다리고 있어요.</div>' +
      '<button class="btn btn-ghost btn-sm" id="letterReset" style="margin-top:12px">다시 쓰기</button>';
  }
  $('#view').innerHTML =
    '<div class="card" style="text-align:center">' +
    '<b style="font-size:1.15rem">💌 시험 전날 편지함</b>' + body + '</div>';
  var sv = $('#letterSave');
  if (sv) sv.onclick = function () {
    var v = $('#letterText').value.trim();
    if (!v) { toast('한 줄이라도 적어주세요!'); return; }
    S.letter = { text: v, date: todayStr() };
    saveState();
    if (window.celebrate) celebrate('small');
    toast('✉️ 봉인 완료! 시험 하루 전에 열릴 거예요');
    renderLetter();
  };
  var rs = $('#letterReset');
  if (rs) rs.onclick = function () { if (confirm('편지를 다시 쓸까요?')) { S.letter = null; saveState(); renderLetter(); } };
  window.scrollTo(0, 0);
}
window.renderLetter = renderLetter;

/* ================= 7) 🫂 흔들릴 때 버튼 ================= */
function renderCalm() {
  session = null; lessonRun = null;
  var s = weekStats();
  var facts = [];
  if (s.answered > 0) facts.push('이번 주에만 <b>' + s.answered + '문제</b>를 풀었어요.');
  if (s.overcame > 0) facts.push('틀렸던 문제 <b>' + s.overcame + '개</b>를 스스로 극복했어요.');
  if (s.piggy > 0) facts.push('확실히 아는 개념이 <b>' + s.piggy + '점</b>어치 쌓였어요.');
  if (s.streak > 1) facts.push('<b>' + s.streak + '일</b> 연속으로 앉아 있었어요.');
  if (!facts.length) facts.push('오늘 이 버튼을 누른 것도, 포기하지 않았다는 뜻이에요.');
  $('#view').innerHTML =
    '<div class="card calm-card">' +
    '<div class="calm-title">🫂 잠깐 숨 고르기</div>' +
    '<div class="breath-wrap"><div class="breath-ball" id="breathBall"></div>' +
    '<div class="breath-text" id="breathText">준비…</div></div>' +
    '<div class="calm-facts"><div class="calm-facts-t">지금까지 당신이 해낸 것</div>' +
    facts.map(function (f) { return '<div class="calm-fact">✓ ' + f + '</div>'; }).join('') + '</div>' +
    '<p class="calm-msg">두 번 떨어진 건 실패가 아니라, 세 번째를 준비할 자격이에요.<br>오늘 못 해도 괜찮아요. 내일 또 오면 돼요.</p>' +
    '<div class="result-actions">' +
    '<button class="btn btn-primary" id="calmOne">🌱 딱 한 문제만 풀기</button>' +
    '<button class="btn btn-ghost" id="calmHome">홈으로</button></div></div>';
  // 호흡 애니메이션 (4초 들이쉬고 4초 내쉬기)
  var phase = 0;
  var ball = $('#breathBall'), txt = $('#breathText');
  function cycle() {
    if (!document.getElementById('breathBall')) return;
    phase = (phase + 1) % 2;
    ball.style.transform = phase ? 'scale(1.7)' : 'scale(1)';
    txt.textContent = phase ? '천천히 들이쉬고…' : '후— 내쉬고…';
    setTimeout(cycle, 4000);
  }
  setTimeout(cycle, 300);
  $('#calmOne').onclick = function () {
    session = { mode: 'single', subjKey: null, queue: [], idx: 0, followups: [], answered: [], followupStart: -1, locked: false, startTs: Date.now() };
    var easy = (typeof easyUnits === 'function') ? easyUnits(1) : [];
    if (!easy.length) { startSession('random'); return; }
    session.queue = easy;
    renderQuiz();
  };
  $('#calmHome').onclick = renderHome;
  window.scrollTo(0, 0);
}
window.renderCalm = renderCalm;

/* ================= 게임 허브 ================= */
function renderGames() {
  session = null; lessonRun = null;
  climb = elim = bug = fill = null;
  var games = [
    { id: 'climb', icon: '🧗', name: '무한 등반', desc: '하트 3개로 몇 층까지? 최고 기록 도전', extra: S.climbBest ? '최고 ' + S.climbBest + '층' : '' },
    { id: 'elim', icon: '✂️', name: '소거법 훈련', desc: '정답 말고 "확실히 아닌 것" 2개 지우기', extra: '' },
    { id: 'bug', icon: '🐞', name: '버그 헌트', desc: '틀린 풀이에서 잘못된 줄 찾아내기', extra: '' },
    { id: 'fill', icon: '🧩', name: '공식 빈칸 조립', desc: '공식의 빈칸에 맞는 기호 채우기', extra: '' },
    { id: 'drill', icon: '🔢', name: '지수·단위 훈련', desc: '10⁹×10⁻¹² 같은 계산 스피드전', extra: S.drillBest ? '최고 ' + S.drillBest + '연속' : '' },
    { id: 'dojo', icon: '⚡', name: '계산 도장', desc: '풀이를 단계별로 직접 조립', extra: '' }
  ];
  $('#view').innerHTML =
    '<div class="card" style="text-align:center">' +
    '<b style="font-size:1.15rem">🎮 미니 게임</b>' +
    '<p class="muted" style="margin-top:6px">짧게 한 판씩. 놀다 보면 실력이 붙어요.</p></div>' +
    '<div class="sim-grid">' + games.map(function (g) {
      return '<div class="sim-card" data-game="' + g.id + '">' +
        '<div class="sim-icon">' + g.icon + '</div>' +
        '<div><div class="sim-name">' + esc(g.name) + (g.extra ? ' <span class="game-best">' + esc(g.extra) + '</span>' : '') + '</div>' +
        '<div class="sim-desc">' + esc(g.desc) + '</div></div></div>';
    }).join('') + '</div>';
  document.querySelectorAll('[data-game]').forEach(function (c) {
    c.onclick = function () {
      var id = c.getAttribute('data-game');
      if (id === 'climb') startClimb();
      else if (id === 'elim') startElim();
      else if (id === 'bug') startBugHunt();
      else if (id === 'fill') startFill();
      else if (id === 'drill' && window.startDrill) window.startDrill();
      else if (id === 'dojo' && window.startDojo) window.startDojo();
    };
  });
  updateBadge();
  window.scrollTo(0, 0);
}
window.renderGames = renderGames;
window.startClimb = startClimb;
window.startElim = startElim;
window.startBugHunt = startBugHunt;
window.startFill = startFill;
