/* ===== 🗺 여정 모드 — 배우면서 바로 푸는 길 (과목별 테마 스테이지) ===== */
'use strict';

var SUBJECT_ORDER = ['basic', 'mag', 'circuit', 'machine', 'power', 'kec'];
var SUBJECT_META = {
  basic: { icon: '🔰', name: '전기 첫걸음' },
  mag: { icon: '🧲', name: '전기자기학' },
  circuit: { icon: '🔌', name: '회로이론' },
  machine: { icon: '⚙️', name: '전기기기' },
  power: { icon: '🗼', name: '전력공학' },
  kec: { icon: '📜', name: '전기설비기술기준' }
};

/* 과목별 테마 소챕터(스테이지). uis = 그 스테이지에 담을 유닛 인덱스(순서대로) */
var CURRICULUM = {
  basic: [
    { name: '전기의 정체', sub: '전기·전류·전압·저항이 뭐예요?', uis: [0, 1, 2, 3] },
    { name: '전기의 기본 법칙', sub: '옴의 법칙부터 교류까지', uis: [4, 5, 6, 7] },
    { name: '회로와 자기 첫걸음', sub: '도체·회로·자기장·단위 읽기', uis: [8, 9, 10, 11] }
  ],
  mag: [
    { name: '정전기의 세계', sub: '전하가 만드는 힘과 전위', uis: [0, 1, 2, 3, 20, 21] },
    { name: '콘덴서와 유전체', sub: '전기를 담는 그릇', uis: [4, 5, 6, 7, 22, 23] },
    { name: '전류가 만드는 자기장', sub: '전기와 자기의 연결', uis: [8, 9, 10, 11] },
    { name: '자성체와 자기회로', sub: '자석의 성질', uis: [12, 13, 18] },
    { name: '전자유도와 인덕턴스', sub: '움직임이 만드는 전기', uis: [14, 15, 16, 17, 19] }
  ],
  circuit: [
    { name: '직류 회로의 기초', sub: '저항과 전류의 길', uis: [0, 1, 2, 3] },
    { name: '회로망 해석', sub: '복잡한 회로 푸는 법', uis: [4, 5, 6] },
    { name: '교류 회로', sub: '물결치는 전기 다루기', uis: [7, 8, 9, 10, 11] },
    { name: '3상 교류', sub: '산업용 전기의 핵심', uis: [12, 13, 14, 15] },
    { name: '과도현상과 심화', sub: '변화와 고급 해석', uis: [16, 17, 18, 19, 20, 21, 22] }
  ],
  machine: [
    { name: '직류 발전기', sub: '전기를 만드는 기계', uis: [0, 1, 2] },
    { name: '직류 전동기', sub: '전기로 돌리는 힘', uis: [3, 4, 5] },
    { name: '동기기', sub: '발전소의 주역', uis: [6, 7, 8, 9, 20] },
    { name: '변압기', sub: '전압을 바꾸는 마법', uis: [10, 11, 12, 13, 14] },
    { name: '유도전동기와 정류', sub: '가장 많이 쓰는 모터', uis: [15, 16, 17, 18, 19, 21] }
  ],
  power: [
    { name: '송전선로의 특성', sub: '전기가 지나는 길', uis: [0, 1, 2, 3, 4] },
    { name: '전압과 역률 관리', sub: '전기를 효율적으로', uis: [5, 6, 7, 8, 9] },
    { name: '고장 계산과 보호', sub: '사고를 막는 기술', uis: [10, 11, 12, 13, 18, 19] },
    { name: '발전소', sub: '전기는 어디서 오나', uis: [15, 16, 17] },
    { name: '배전과 설비', sub: '우리집까지 오는 길', uis: [14, 20, 21, 22, 23] }
  ],
  kec: [
    { name: '전압·전선·접지 기본', sub: '규정의 출발점', uis: [0, 1, 2, 3, 20] },
    { name: '옥내 배선과 공사', sub: '건물 안 전기공사', uis: [4, 5, 6, 23] },
    { name: '가공 전선로', sub: '전봇대 위의 규정', uis: [7, 8, 9, 10, 22] },
    { name: '지중·보호 기기', sub: '땅속 전선과 안전장치', uis: [11, 12, 13, 21] },
    { name: '절연·보안·특수장소', sub: '안전을 위한 마지막', uis: [14, 15, 16, 17, 18, 19] }
  ]
};

/* 존재하는 과목/유닛만 반영한 스테이지 목록 (순서대로) */
function stages() {
  var out = [];
  SUBJECT_ORDER.forEach(function (key) {
    var subj = subjectByKey(key);
    if (!subj) return;
    var chs = CURRICULUM[key];
    if (!chs) { // 커리큘럼 정의가 없으면 통째로 한 스테이지
      out.push({ subjKey: key, name: SUBJECT_META[key] ? SUBJECT_META[key].name : subj.name, sub: '', uis: subj.units.map(function (u, i) { return i; }) });
      return;
    }
    chs.forEach(function (c) {
      var uis = c.uis.filter(function (ui) { return ui < subj.units.length; });
      if (uis.length) out.push({ subjKey: key, name: c.name, sub: c.sub, uis: uis });
    });
  });
  // 커리큘럼에 없는 과목이 있으면 뒤에 붙임
  DATA.subjects.forEach(function (s) {
    if (SUBJECT_ORDER.indexOf(s.key) === -1) {
      out.push({ subjKey: s.key, name: s.name, sub: '', uis: s.units.map(function (u, i) { return i; }) });
    }
  });
  return out;
}

function nodeKey(subjKey, ui) { return subjKey + '-' + ui; }
function nodeState(subjKey, ui) { return S.node[nodeKey(subjKey, ui)] || { taught: false, solved: false }; }
function nodeDone(subjKey, ui) { return nodeState(subjKey, ui).solved; }

/* 전체 노드를 하나의 선형 순서로 (스테이지 이어붙이기) */
function flatNodes() {
  var list = [];
  stages().forEach(function (st) {
    st.uis.forEach(function (ui) {
      var subj = subjectByKey(st.subjKey);
      list.push({ subjKey: st.subjKey, ui: ui, topic: subj.units[ui].topic });
    });
  });
  return list;
}
function currentNodeIndex() {
  var flat = flatNodes();
  for (var i = 0; i < flat.length; i++) if (!nodeDone(flat[i].subjKey, flat[i].ui)) return i;
  return flat.length;
}
function isUnlocked(flatIdx) { return flatIdx <= currentNodeIndex(); }
function globalIdxOf(subjKey, ui, flat) {
  for (var i = 0; i < flat.length; i++) if (flat[i].subjKey === subjKey && flat[i].ui === ui) return i;
  return 0;
}

window.journeyMarkTaught = function (subjKey, ui) {
  var k = nodeKey(subjKey, ui);
  var n = S.node[k] || { taught: false, solved: false };
  n.taught = true; S.node[k] = n; saveState();
};

/* 노드 시작 = 레슨(가르치기) → 끝나면 문제(풀기) */
function playNode(subjKey, ui) {
  var hasLesson = !!(window.LESSON_DATA && (LESSON_DATA[subjKey] || []).some(function (l) { return l.ui === ui; }));
  if (hasLesson) startLesson(subjKey, ui, true);
  else window.journeyPractice(subjKey, ui);
}

/* 노드 문제 풀기 */
var jRun = null;
window.journeyPractice = function (subjKey, ui) {
  lessonRun = null; session = null;
  var already = nodeState(subjKey, ui).solved;
  jRun = { subjKey: subjKey, ui: ui, which: already ? 't' : 'm', stage: 'q', tries: 0, locked: false };
  renderJourneyQ();
};
function jQuestion() {
  var unit = subjectByKey(jRun.subjKey).units[jRun.ui];
  return jRun.which === 'm' ? unit.main : unit.twin;
}

function renderJourneyQ(pickIdx) {
  var subj = subjectByKey(jRun.subjKey);
  var unit = subj.units[jRun.ui];
  var q = jQuestion();
  var answered = typeof pickIdx === 'number';
  var v = $('#view');
  var subjName = SUBJECT_META[jRun.subjKey] ? SUBJECT_META[jRun.subjKey].name : subj.name;

  var choices = q.choices.map(function (c, i) {
    var cls = 'choice';
    if (answered) {
      if (i === q.answer) cls += (i === pickIdx ? ' picked-right' : ' reveal-right');
      else if (i === pickIdx) cls += ' picked-wrong';
      else cls += ' dim';
    }
    return '<button class="' + cls + '" data-jpick="' + i + '"' + (answered ? ' disabled' : '') + '>' +
      '<span class="num">' + CIRCLED[i] + '</span><span>' + esc(c) + '</span></button>';
  }).join('');

  var verdict = '';
  if (answered) {
    var ok = pickIdx === q.answer;
    if (ok) {
      verdict = '<div class="verdict ok"><div class="verdict-title">⭕ 정답! 개념을 제대로 이해했어요 🎉</div>' +
        '<div class="explain">' + esc(q.explain) + '</div></div>';
    } else {
      verdict = '<div class="verdict no"><div class="verdict-title">' + (pickIdx === -1 ? '🤷 아직 헷갈려도 괜찮아요' : '❌ 괜찮아요, 지금 확실히 잡고 가요') + '</div>' +
        '<div class="answer-line">정답: ' + CIRCLED[q.answer] + ' ' + esc(q.choices[q.answer]) + '</div>' +
        '<div class="explain">' + esc(q.explain) + '</div>' +
        '<div class="concept-box" style="margin-top:14px;margin-bottom:0"><b class="cb-title">💡 다시 보는 핵심 — ' + esc(unit.topic) + '</b>' + esc(unit.concept) + '</div></div>';
    }
  }

  var nextBtn = '';
  if (answered) {
    var ok2 = pickIdx === q.answer;
    if (ok2) nextBtn = '<button class="btn btn-primary btn-big" id="jNext">다음 단계로 ▶</button>';
    else if (jRun.tries < 2 && jRun.which === 'm')
      nextBtn = '<button class="btn btn-primary btn-big" id="jRetry">🔁 비슷한 문제로 다시 도전</button>' +
        '<button class="btn btn-ghost" id="jSkip">일단 넘어가기</button>';
    else nextBtn = '<button class="btn btn-primary btn-big" id="jNext">그래도 넘어가기 ▶ (나중에 복습해요)</button>';
  }

  v.innerHTML =
    '<div class="quiz-head"><span class="quiz-mode">🗺 여정 · ' + esc(subjName) + '</span>' +
    '<button class="btn btn-ghost btn-sm" id="jExit">지도 보기</button></div>' +
    '<div class="j-practice-banner">✏️ 방금 배운 <b>' + esc(unit.topic) + '</b>, 문제로 확인해봐요!</div>' +
    '<div class="card">' +
    '<span class="topic-chip">' + esc(subj.name) + ' · ' + esc(unit.topic) + '</span>' +
    '<div class="qtext">' + esc(q.q) + '</div>' +
    '<div class="choices">' + choices + '</div>' +
    (answered ? '' : '<div class="dunno-wrap"><button class="dunno-btn" id="jDunno">🤷 모르겠어요</button></div>') +
    verdict +
    (answered ? '<div class="quiz-next" style="gap:8px">' + nextBtn + '</div>' : '') +
    '</div>';

  $('#jExit').onclick = function () { renderJourney(); };
  if (!answered) {
    document.querySelectorAll('[data-jpick]').forEach(function (b) {
      b.onclick = function () { journeyAnswer(parseInt(b.getAttribute('data-jpick'), 10)); };
    });
    $('#jDunno').onclick = function () { journeyAnswer(-1); };
  } else {
    var jn = $('#jNext'); if (jn) jn.onclick = journeyNodeComplete;
    var jr = $('#jRetry'); if (jr) jr.onclick = function () { jRun.which = 't'; jRun.locked = false; renderJourneyQ(); };
    var js = $('#jSkip'); if (js) js.onclick = journeyNodeComplete;
  }
  window.scrollTo(0, 0);
}

function journeyAnswer(pickIdx) {
  if (jRun.locked) return;
  jRun.locked = true; jRun.tries++;
  var q = jQuestion();
  var ok = pickIdx === q.answer;
  recordAttempt(jRun.subjKey, jRun.ui, jRun.which, ok, { isRetry: jRun.which === 't' });
  renderJourneyQ(pickIdx);
}

function journeyNodeComplete() {
  var k = nodeKey(jRun.subjKey, jRun.ui);
  var n = S.node[k] || { taught: true, solved: false };
  var firstSolve = !n.solved;
  n.taught = true; n.solved = true; S.node[k] = n;
  if (firstSolve) addXP(20, true);
  saveState(); checkBadges();
  jRun = null;
  renderJourney(true);
}

/* ---------- 여정 지도 ---------- */
function renderJourney(justCleared) {
  session = null; lessonRun = null; jRun = null;
  var v = $('#view');
  var flat = flatNodes();
  var curIdx = currentNodeIndex();
  var totalDone = 0;
  flat.forEach(function (f) { if (nodeDone(f.subjKey, f.ui)) totalDone++; });
  var allDone = curIdx >= flat.length;

  var globalIdx = 0;
  var lastSubj = null;
  var blocks = stages().map(function (st) {
    var subj = subjectByKey(st.subjKey);
    var meta = SUBJECT_META[st.subjKey] || { icon: '📚', name: subj.name };
    var header = '';
    if (st.subjKey !== lastSubj) {
      lastSubj = st.subjKey;
      header = '<div class="j-subject-head"><span class="j-subj-icon">' + meta.icon + '</span>' + esc(meta.name) + '</div>';
    }
    var chDone = 0;
    var nodesHtml = st.uis.map(function (ui) {
      var gi = globalIdx++;
      var done = nodeDone(st.subjKey, ui);
      if (done) chDone++;
      var unlocked = isUnlocked(gi);
      var isCurrent = gi === curIdx;
      var taught = nodeState(st.subjKey, ui).taught;
      var cls = done ? 'done' : (isCurrent ? 'current' : (unlocked ? 'open' : 'locked'));
      var icon = done ? '✓' : (unlocked ? (taught ? '✎' : '●') : '🔒');
      return '<div class="j-node-row">' +
        '<button class="j-node ' + cls + '"' + (unlocked ? '' : ' disabled') + ' data-node="' + st.subjKey + ':' + ui + '" title="' + esc(subj.units[ui].topic) + '">' +
        '<span class="j-node-icon">' + icon + '</span></button>' +
        '<span class="j-node-label">' + esc(subj.units[ui].topic) + '</span>' +
        (isCurrent ? '<span class="j-here">여기!</span>' : '') +
        '</div>';
    }).join('');
    var pct = Math.round(chDone / st.uis.length * 100);
    return header +
      '<div class="j-chapter">' +
      '<div class="j-chapter-head">' +
      '<div><div class="j-ch-name">' + esc(st.name) + '</div><div class="j-ch-sub">' + esc(st.sub) + '</div></div>' +
      '<span class="j-ch-count">' + chDone + '/' + st.uis.length + '</span>' +
      '</div>' +
      '<div class="j-ch-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="j-path">' + nodesHtml + '</div>' +
      '</div>';
  }).join('');

  var contBtn = allDone ?
    '<div class="goal-banner">🎓 모든 여정을 완주했어요! 이제 실전 문제와 보스전으로 실력을 굳혀요!</div>' :
    '<button class="btn btn-primary btn-big" id="jContinue">' + (totalDone === 0 ? '🚀 여정 시작하기' : '▶ 이어서 배우기') + '<br><small style="font-weight:500">' + esc(flat[curIdx].topic) + '</small></button>';

  v.innerHTML =
    (justCleared ? '<div class="goal-banner">🎉 한 단계 클리어! 다음 단계가 열렸어요. 이 기세로 쭉!</div>' : '') +
    '<div class="card" style="text-align:center">' +
    '<b style="font-size:1.15rem">🗺 나의 학습 여정</b>' +
    '<p class="muted" style="margin-top:6px">완전 처음부터 한 걸음씩. 개념을 배우고 → 바로 문제로 확인하며 길을 따라가요.</p>' +
    '<div class="j-progress"><b>' + totalDone + '</b> / ' + flat.length + ' 단계 완료</div>' +
    '</div>' +
    '<div class="j-continue">' + contBtn + '</div>' +
    blocks;

  var jc = $('#jContinue');
  if (jc) jc.onclick = function () { playNode(flat[curIdx].subjKey, flat[curIdx].ui); };
  document.querySelectorAll('[data-node]').forEach(function (b) {
    b.onclick = function () { var p = b.getAttribute('data-node').split(':'); playNode(p[0], parseInt(p[1], 10)); };
  });
  updateBadge();
  if (justCleared) window.scrollTo(0, 0);
}
window.renderJourney = renderJourney;

/* 홈 화면용 여정 히어로 카드 */
window.journeyHeroHtml = function () {
  var flat = flatNodes();
  var curIdx = currentNodeIndex();
  var totalDone = 0;
  flat.forEach(function (f) { if (nodeDone(f.subjKey, f.ui)) totalDone++; });
  var pct = flat.length ? Math.round(totalDone / flat.length * 100) : 0;
  var allDone = curIdx >= flat.length;
  var nextTopic = allDone ? '모든 단계 완주!' : flat[curIdx].topic;
  var started = totalDone > 0;
  return '<div class="journey-hero" id="journeyHero">' +
    '<div class="jh-badge">🗺 추천 학습법</div>' +
    '<div class="jh-title">' + (started ? '이어서 배우기' : '전기, 완전 처음부터 시작하기') + '</div>' +
    '<div class="jh-sub">' + (started ?
      '다음 단계: <b>' + esc(nextTopic) + '</b>' :
      '전류·전압이 뭔지 몰라도 괜찮아요. 개념을 이야기로 배우고, 바로 문제로 확인하며 한 걸음씩 나아가요.') + '</div>' +
    '<div class="jh-bar"><i style="width:' + pct + '%"></i></div>' +
    '<div class="jh-foot"><span>' + totalDone + ' / ' + flat.length + ' 단계</span>' +
    '<span class="jh-go">' + (started ? '이어서 ▶' : '시작하기 ▶') + '</span></div>' +
    '</div>';
};

if (typeof renderHome === 'function' && !window.__journeyBooted) {
  window.__journeyBooted = true;
  // 스트릭 방패 적용 → 문지기(오늘 한 문제) → 없으면 홈
  var saved = window.applyShield ? window.applyShield() : null;
  var gated = window.maybeShowGate ? window.maybeShowGate() : false;
  if (!gated) renderHome();
  if (saved) setTimeout(function () { toast('🛡 누전차단기 작동! 어제 빠졌지만 연속 기록을 지켰어요', true); }, 600);
  document.addEventListener('click', function (e) {
    var h = e.target.closest ? e.target.closest('#journeyHero') : null;
    if (h) renderJourney();
  });
}
