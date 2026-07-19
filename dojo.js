/* ===== ⚡ 계산 도장 — 풀이를 한 단계씩 조립하는 게임 + 지수·단위 스피드 훈련 ===== */
'use strict';

var CIRC2 = ['①', '②', '③', '④'];

/* ================= 1) 단계별 풀이 조립 ================= */
var dojo = null;

function dojoProblems(subjKey) {
  var subs = (window.DOJO_DATA || {}).subjects || [];
  var out = [];
  subs.forEach(function (s) {
    if (subjKey && s.key !== subjKey) return;
    s.problems.forEach(function (p, i) { out.push({ subjKey: s.key, subjName: s.name, idx: i, p: p }); });
  });
  return out;
}

function startDojo(subjKey) {
  var pool = dojoProblems(subjKey);
  if (!pool.length) { toast('계산 도장 문제가 아직 준비 중이에요!'); return; }
  session = null; lessonRun = null;
  var pick = shuffle(pool).slice(0, 3);
  dojo = { queue: pick, qi: 0, stepIdx: 0, picks: {}, wrongs: 0, locked: false, cleared: 0 };
  renderDojo();
}

function dojoCur() { return dojo.queue[dojo.qi]; }

function renderDojo(picked) {
  var item = dojoCur();
  var p = item.p;
  var steps = p.steps;
  var si = dojo.stepIdx;
  var done = si >= steps.length;
  var v = $('#view');
  var answered = typeof picked === 'number';

  // 지금까지 확정된 단계들을 "풀이 노트"로 쌓아 보여줌
  var doneRows = '';
  for (var i = 0; i < si; i++) {
    doneRows += '<div class="dj-done"><span class="dj-num">' + (i + 1) + '</span>' +
      '<span class="dj-txt">' + esc(steps[i].options[steps[i].answer]) + '</span></div>';
  }

  var body;
  if (done) {
    body = '<div class="dj-final">' +
      '<div class="dj-final-icon">🎉</div>' +
      '<div class="dj-final-t">풀이 완성!</div>' +
      '<div class="dj-final-a">최종 답: <b>' + esc(p.finalAnswer) + '</b></div>' +
      '<p class="muted" style="margin-top:10px">공식을 고르고, 값을 넣고, 계산까지 — 스스로 전부 해냈어요. 이게 실제 시험에서 하는 그 과정이에요!</p>' +
      '</div>' +
      '<div class="quiz-next"><button class="btn btn-primary btn-big" id="djNext">' +
      (dojo.qi + 1 < dojo.queue.length ? '다음 문제 ▶' : '결과 보기 ▶') + '</button></div>';
  } else {
    var st = steps[si];
    var opts = st.options.map(function (o, oi) {
      var cls = 'dj-opt';
      if (answered) {
        if (oi === st.answer) cls += (oi === picked ? ' right' : ' reveal');
        else if (oi === picked) cls += ' wrong';
        else cls += ' dim';
      }
      return '<button class="' + cls + '" data-djpick="' + oi + '"' + (answered ? ' disabled' : '') + '>' +
        '<span class="dj-onum">' + CIRC2[oi] + '</span><span class="dj-otxt">' + esc(o) + '</span></button>';
    }).join('');

    var fb = '';
    if (answered) {
      var ok = picked === st.answer;
      fb = '<div class="dj-fb ' + (ok ? 'ok' : 'no') + '">' +
        '<b>' + (ok ? '⭕ 맞아요!' : '💡 이렇게 되는 거예요') + '</b>' +
        (ok ? '' : '<div class="dj-correct">정답: ' + esc(st.options[st.answer]) + '</div>') +
        '<div class="dj-why">' + esc(st.why) + '</div></div>' +
        '<div class="quiz-next"><button class="btn btn-primary" id="djStepNext">' +
        (si + 1 >= steps.length ? '풀이 완성하기 🎉' : '다음 단계 ▶') + '</button></div>';
    } else if (st.hint) {
      fb = '<div class="dj-hintwrap"><button class="dunno-btn" id="djHint">💡 힌트 보기</button><div id="djHintBox"></div></div>';
    }

    body = '<div class="dj-stepbox">' +
      '<div class="dj-steplabel">STEP ' + (si + 1) + ' / ' + steps.length + '</div>' +
      '<div class="dj-ask">' + esc(st.ask) + '</div>' +
      '<div class="dj-opts">' + opts + '</div>' +
      fb + '</div>';
  }

  v.innerHTML =
    '<div class="quiz-head"><span class="quiz-mode">⚡ 계산 도장 · ' + esc(item.subjName) + '</span>' +
    '<span class="quiz-progress">문제 ' + (dojo.qi + 1) + '/' + dojo.queue.length + '</span></div>' +
    '<div class="qbar"><i style="width:' + Math.round(si / steps.length * 100) + '%"></i></div>' +
    '<div class="card">' +
    '<span class="topic-chip">' + esc(p.topic) + '</span>' +
    '<div class="dj-question">' + esc(p.question) + '</div>' +
    (doneRows ? '<div class="dj-note"><div class="dj-note-t">📝 내가 만든 풀이</div>' + doneRows + '</div>' : '') +
    body +
    '</div>';

  if (done) {
    $('#djNext').onclick = function () {
      dojo.cleared++;
      if (dojo.qi + 1 < dojo.queue.length) { dojo.qi++; dojo.stepIdx = 0; dojo.locked = false; renderDojo(); }
      else renderDojoResult();
    };
  } else if (answered) {
    $('#djStepNext').onclick = function () { dojo.stepIdx++; dojo.locked = false; renderDojo(); };
  } else {
    document.querySelectorAll('[data-djpick]').forEach(function (b) {
      b.onclick = function () { dojoAnswer(parseInt(b.getAttribute('data-djpick'), 10)); };
    });
    var h = $('#djHint');
    if (h) h.onclick = function () {
      var box = $('#djHintBox');
      box.innerHTML = box.innerHTML ? '' : '<div class="dj-hint">' + esc(steps[si].hint) + '</div>';
    };
  }
  window.scrollTo(0, 0);
}

function dojoAnswer(pick) {
  if (dojo.locked) return;
  dojo.locked = true;
  var st = dojoCur().p.steps[dojo.stepIdx];
  var ok = pick === st.answer;
  if (ok) addXP(6, true); else { dojo.wrongs++; addXP(2, true); }
  saveState();
  renderDojo(pick);
}

function renderDojoResult() {
  var v = $('#view');
  var total = dojo.queue.length;
  S.dojoCleared = (S.dojoCleared || 0) + total;
  addXP(25);
  saveState(); checkBadges();
  if (window.dqBump) { dqBump('dojo', total); dqCheckRewards(); }
  if (window.celebrate) celebrate();
  var msg = dojo.wrongs === 0 ?
    '한 단계도 안 틀렸어요! 계산 문제, 이제 무섭지 않죠? 🏆' :
    '단계를 밟으니 끝까지 풀렸죠? 이렇게 쪼개서 생각하는 게 계산 문제의 정답이에요. 💪';
  v.innerHTML =
    '<div class="card result-hero">' +
    '<div style="font-size:2.4rem">⚡</div>' +
    '<div class="big">' + total + '문제 완주!</div>' +
    '<div class="msg">' + esc(msg) + '</div>' +
    '<div class="battle-stats"><span class="bstat">📝 지금까지 푼 계산 ' + (S.dojoCleared || 0) + '문제</span></div>' +
    '<div class="result-actions">' +
    '<button class="btn btn-primary" id="djMore">⚡ 더 풀기</button>' +
    '<button class="btn btn-ghost" id="djHome">홈으로</button></div></div>';
  $('#djMore').onclick = function () { startDojo(); };
  $('#djHome').onclick = renderHome;
  window.scrollTo(0, 0);
}

/* ================= 2) 지수·단위 스피드 훈련 (문제 자동 생성) ================= */
var drill = null;
var PREFIX = [
  { p: 'k', name: '킬로', e: 3 }, { p: 'M', name: '메가', e: 6 }, { p: 'G', name: '기가', e: 9 },
  { p: 'm', name: '밀리', e: -3 }, { p: 'µ', name: '마이크로', e: -6 }, { p: 'n', name: '나노', e: -9 }
];
var UNITS = ['A', 'V', 'F', 'Ω', 'W', 'H'];

function sup(n) {
  var map = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return String(n).split('').map(function (c) { return map[c] || c; }).join('');
}
function pow10(e) { return '10' + sup(e); }
function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function uniqOpts(correct, gen) {
  var set = [correct];
  var guard = 0;
  while (set.length < 4 && guard++ < 60) {
    var c = gen();
    if (set.indexOf(c) === -1) set.push(c);
  }
  while (set.length < 4) set.push(correct + ' ');
  return shuffle(set);
}

function genDrill() {
  var kind = ri(0, 3);
  if (kind === 0) { // 10^a × 10^b
    var a = ri(-12, 9), b = ri(-12, 9);
    var ans = pow10(a + b);
    var opts = uniqOpts(ans, function () { return pow10(a + b + ri(-3, 3)); });
    return { q: pow10(a) + ' × ' + pow10(b) + ' = ?', options: opts, answer: opts.indexOf(ans),
      why: '곱하기는 지수를 더해요: (' + a + ') + (' + b + ') = ' + (a + b) + ' → ' + pow10(a + b) };
  }
  if (kind === 1) { // 10^a / 10^b
    var c = ri(-9, 12), d = ri(-9, 12);
    var ans2 = pow10(c - d);
    var opts2 = uniqOpts(ans2, function () { return pow10(c - d + ri(-3, 3)); });
    return { q: pow10(c) + ' ÷ ' + pow10(d) + ' = ?', options: opts2, answer: opts2.indexOf(ans2),
      why: '나누기는 지수를 빼요: (' + c + ') − (' + d + ') = ' + (c - d) + ' → ' + pow10(c - d) };
  }
  if (kind === 2) { // 숫자×10^a 형태 곱셈 (쿨롱 스타일)
    var n1 = ri(2, 9), e1 = ri(-9, 9), n2 = ri(2, 9), e2 = ri(-12, 6);
    var prod = n1 * n2, es = e1 + e2;
    var ans3 = prod + '×' + pow10(es);
    var opts3 = uniqOpts(ans3, function () {
      var v = Math.random() < 0.5 ? prod + ri(-6, 6) : prod;
      if (v <= 0) v = prod + 1;
      return v + '×' + pow10(es + (v === prod ? ri(-3, 3) || 1 : 0));
    });
    return { q: '(' + n1 + '×' + pow10(e1) + ') × (' + n2 + '×' + pow10(e2) + ') = ?', options: opts3, answer: opts3.indexOf(ans3),
      why: '숫자끼리 곱하고(' + n1 + '×' + n2 + '=' + prod + '), 지수끼리 더해요((' + e1 + ')+(' + e2 + ')=' + es + ').' };
  }
  // 단위 접두어 변환
  var pf = PREFIX[ri(0, PREFIX.length - 1)];
  var unit = UNITS[ri(0, UNITS.length - 1)];
  var val = ri(2, 9);
  var ansE = pf.e;
  var ans4 = val + '×' + pow10(ansE) + ' ' + unit;
  var opts4 = uniqOpts(ans4, function () { return val + '×' + pow10(ansE + (ri(0, 1) ? ri(1, 4) : -ri(1, 4))) + ' ' + unit; });
  return { q: val + ' ' + pf.p + unit + ' = 몇 ' + unit + '?', options: opts4, answer: opts4.indexOf(ans4),
    why: pf.p + '(' + pf.name + ')는 ' + pow10(pf.e) + '이에요. 그래서 ' + val + ' ' + pf.p + unit + ' = ' + ans4 + '.' };
}

function startDrill() {
  session = null; lessonRun = null;
  drill = { n: 0, correct: 0, streak: 0, best: 0, cur: genDrill(), locked: false, total: 12 };
  renderDrill();
}

function renderDrill(picked) {
  var d = drill;
  var answered = typeof picked === 'number';
  var v = $('#view');
  var done = d.n >= d.total;
  if (done) { renderDrillResult(); return; }

  var opts = d.cur.options.map(function (o, i) {
    var cls = 'drill-opt';
    if (answered) {
      if (i === d.cur.answer) cls += (i === picked ? ' right' : ' reveal');
      else if (i === picked) cls += ' wrong';
      else cls += ' dim';
    }
    return '<button class="' + cls + '" data-drpick="' + i + '"' + (answered ? ' disabled' : '') + '>' + esc(o) + '</button>';
  }).join('');

  v.innerHTML =
    '<div class="quiz-head"><span class="quiz-mode">🔢 지수·단위 훈련</span>' +
    '<span class="quiz-progress">' + (d.n + 1) + ' / ' + d.total + '</span></div>' +
    '<div class="qbar"><i style="width:' + Math.round(d.n / d.total * 100) + '%"></i></div>' +
    (d.streak >= 2 ? '<div class="drill-streak">🔥 ' + d.streak + '연속 정답!</div>' : '') +
    '<div class="card" style="text-align:center">' +
    '<div class="drill-q">' + esc(d.cur.q) + '</div>' +
    '<div class="drill-opts">' + opts + '</div>' +
    (answered ? '<div class="dj-fb ' + (picked === d.cur.answer ? 'ok' : 'no') + '" style="margin-top:16px;text-align:left">' +
      '<b>' + (picked === d.cur.answer ? '⭕ 정답!' : '💡 이렇게 계산해요') + '</b><div class="dj-why">' + esc(d.cur.why) + '</div></div>' +
      '<div class="quiz-next"><button class="btn btn-primary" id="drNext">다음 ▶</button></div>' : '') +
    '</div>' +
    '<div class="key-hint">⌨️ 1~4 키로도 답할 수 있어요</div>';

  if (!answered) {
    document.querySelectorAll('[data-drpick]').forEach(function (b) {
      b.onclick = function () { drillAnswer(parseInt(b.getAttribute('data-drpick'), 10)); };
    });
  } else {
    $('#drNext').onclick = function () {
      d.n++; d.cur = genDrill(); d.locked = false; renderDrill();
    };
  }
  window.scrollTo(0, 0);
}

function drillAnswer(pick) {
  if (drill.locked) return;
  drill.locked = true;
  var ok = pick === drill.cur.answer;
  if (ok) {
    drill.correct++; drill.streak++;
    if (drill.streak > drill.best) drill.best = drill.streak;
    addXP(4, true);
    if (window.dqBump) dqBump('drill');
  } else { drill.streak = 0; addXP(1, true); }
  saveState();
  if (window.haptic) haptic(ok ? 'ok' : 'no');
  if (window.dqCheckRewards) dqCheckRewards();
  renderDrill(pick);
}

function renderDrillResult() {
  var d = drill;
  var v = $('#view');
  var pct = Math.round(d.correct / d.total * 100);
  if ((d.best || 0) > (S.drillBest || 0)) S.drillBest = d.best;
  addXP(20); saveState(); checkBadges();
  var msg = pct >= 90 ? '지수 계산 완전 정복! 이제 10의 거듭제곱이 안 무서워요 🏆' :
    pct >= 60 ? '좋아요! 조금만 더 하면 지수는 자동으로 나올 거예요.' :
    '괜찮아요! 지수는 규칙만 알면 되는 거예요. 곱하면 더하고, 나누면 빼기. 그것만 기억해요.';
  v.innerHTML =
    '<div class="card result-hero">' +
    '<div style="font-size:2.4rem">🔢</div>' +
    '<div class="big">' + d.correct + ' / ' + d.total + '</div>' +
    '<div class="msg">' + esc(msg) + '</div>' +
    '<div class="battle-stats">' +
    '<span class="bstat">🔥 최고 연속 ' + d.best + '</span>' +
    '<span class="bstat">🏅 역대 최고 ' + (S.drillBest || 0) + '</span></div>' +
    '<div class="result-actions">' +
    '<button class="btn btn-primary" id="drMore">🔢 한 판 더</button>' +
    '<button class="btn btn-ghost" id="drHome">홈으로</button></div></div>';
  $('#drMore').onclick = startDrill;
  $('#drHome').onclick = renderHome;
  window.scrollTo(0, 0);
}

/* ================= 허브 ================= */
function renderDojoHub() {
  session = null; lessonRun = null; dojo = null; drill = null;
  var v = $('#view');
  var pool = dojoProblems();
  var bySubj = {};
  pool.forEach(function (x) { bySubj[x.subjKey] = (bySubj[x.subjKey] || 0) + 1; });
  var subjBtns = Object.keys(bySubj).map(function (k) {
    var name = pool.filter(function (x) { return x.subjKey === k; })[0].subjName;
    return '<button class="chip" data-djsubj="' + esc(k) + '">' + esc(name) + ' (' + bySubj[k] + ')</button>';
  }).join('');

  v.innerHTML =
    '<div class="card" style="text-align:center">' +
    '<b style="font-size:1.15rem">⚡ 계산 도장</b>' +
    '<p class="muted" style="margin-top:6px">계산 문제가 무서운 건 "한 번에 답까지" 가려고 해서예요. 여기선 <b>공식 고르기 → 값 넣기 → 숫자 계산 → 지수 계산</b>을 한 단계씩 밟아요.</p>' +
    '</div>' +

    '<div class="mode-grid">' +
    '<button class="btn btn-primary btn-big" id="djStart">⚡ 단계별 풀이 조립<br><small style="font-weight:500">3문제, 풀이를 직접 만들어요</small></button>' +
    '<button class="btn btn-boss btn-big" id="drStart">🔢 지수·단위 스피드 훈련<br><small style="font-weight:500">10⁹×10⁻¹² 같은 계산 12문제</small></button>' +
    '</div>' +

    (subjBtns ? '<div class="section-title">과목 골라서 풀기</div><div class="chip-row">' + subjBtns + '</div>' : '') +
    (S.drillBest ? '<div class="card" style="text-align:center;margin-top:16px"><span class="bstat">🏅 지수 훈련 역대 최고 연속 ' + S.drillBest + '</span></div>' : '');

  $('#djStart').onclick = function () { startDojo(); };
  $('#drStart').onclick = startDrill;
  document.querySelectorAll('[data-djsubj]').forEach(function (b) {
    b.onclick = function () { startDojo(b.getAttribute('data-djsubj')); };
  });
  updateBadge();
  window.scrollTo(0, 0);
}
window.renderDojoHub = renderDojoHub;
window.startDojo = startDojo;
window.startDrill = startDrill;
window.__drillKey = function (k) {
  if (drill && !drill.locked) {
    var b = document.querySelectorAll('[data-drpick]');
    if (b.length && k >= 1 && k <= b.length) b[k - 1].click();
  }
};
