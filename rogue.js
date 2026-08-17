/* ===== ⚡ 전력망 탐험 — 로그라이크 카드 모드 =====
   설계 원칙 (건드릴 때 주의):
   1. 카드는 "자원"이 아니라 "문제 푸는 도움"이다. 뽑기·수집에 쓰는 시간이
      문제 푸는 시간을 대체하면 안 된다 (조사 문서에서 걸러진 항목).
   2. 런에서 푼 문제는 전부 recordAttempt로 SRS·통계에 정상 반영된다.
      게임 시간이 곧 공부 시간이어야 한다.
   3. 실패해도 잃는 것이 없다. 두 번 낙방한 사람에게 손실 페널티는
      재미가 아니라 스트레스다. "패배"가 아니라 "여기까지"로 쓴다. */
'use strict';

var RG_CIRC = ['①', '②', '③', '④'];

/* ---------- 카드 ---------- */
var RCARDS = {
  cut: { icon: '✂️', name: '소거', cost: 1, desc: '확실히 아닌 선택지 2개를 지운다' },
  recall: { icon: '📖', name: '복기', cost: 1, desc: '이 개념의 핵심을 미리 본다' },
  focus: { icon: '💥', name: '집중', cost: 1, desc: '맞히면 피해 +4' },
  insul: { icon: '🛡', name: '절연', cost: 1, desc: '이번에 틀려도 체력이 깎이지 않는다' },
  heal: { icon: '❤️', name: '응급처치', cost: 2, desc: '체력을 2 회복한다' },
  surge: { icon: '⚡', name: '과전류', cost: 2, desc: '맞히면 피해 +9, 틀리면 체력 -1 추가' },
  insight: { icon: '🔍', name: '통찰', cost: 0, desc: '카드를 2장 뽑는다' },
  ground: { icon: '🪝', name: '접지', cost: 1, desc: '지금 문제를 이미 마스터한 쉬운 것으로 바꾼다' },
  again: { icon: '🔁', name: '재도전', cost: 1, desc: '이번에 틀리면 이 개념을 전투 안에서 한 번 더 만난다' },
  charge: { icon: '🔋', name: '충전', cost: 0, desc: '이번 턴 에너지 +2' }
};
var RCARD_POOL = ['cut', 'recall', 'focus', 'insul', 'heal', 'surge', 'insight', 'ground', 'again', 'charge'];
var START_DECK = ['cut', 'cut', 'focus', 'focus', 'recall'];

/* ---------- 유물 ---------- */
var RELICS = {
  battery: { icon: '🔋', name: '여분 배터리', desc: '턴마다 에너지 +1' },
  glove: { icon: '🧤', name: '절연 장갑', desc: '전투를 시작할 때 체력 +1' },
  ruler: { icon: '📏', name: '강철 자', desc: '전투 첫 턴에 소거가 자동 발동' },
  medal: { icon: '🏅', name: '명예 훈장', desc: '정답 피해 +2' },
  lamp: { icon: '💡', name: '예비 전구', desc: '전투에서 이기면 체력 +1' },
  magnet: { icon: '🧰', name: '넉넉한 공구함', desc: '턴마다 카드를 1장 더 뽑는다' },
  fuse: { icon: '🧯', name: '예비 퓨즈', desc: '체력이 0이 될 때 한 번만 1로 버틴다' },
  meter: { icon: '📟', name: '멀티미터', desc: '보상 카드를 4장 중에서 고른다' }
};
var RELIC_POOL = ['battery', 'glove', 'ruler', 'medal', 'lamp', 'magnet', 'fuse', 'meter'];

/* ---------- 층 구성 ---------- */
var FLOOR_PLAN = [
  ['battle', 'lesson'],
  ['battle', 'rest'],
  ['lesson', 'treasure'],
  ['elite', 'battle'],
  ['rest', 'shop'],
  ['battle', 'elite'],
  ['lesson', 'treasure'],
  ['boss']
];
var NODE_INFO = {
  battle: { icon: '⚔️', name: '고장 구간', desc: '문제를 풀어 복구한다' },
  elite: { icon: '☠️', name: '중대 사고', desc: '더 힘들지만 유물을 준다' },
  boss: { icon: '👑', name: '주 변전소', desc: '이 층을 넘으면 구역 복구 완료' },
  rest: { icon: '🔥', name: '작업 캠프', desc: '체력을 회복하거나 덱을 정리한다' },
  treasure: { icon: '🎁', name: '자재 창고', desc: '유물을 하나 얻는다' },
  shop: { icon: '🏪', name: '자재상', desc: '모은 전력으로 카드를 산다' },
  lesson: { icon: '📖', name: '설계도실', desc: '이론을 배우고 카드를 얻는다' }
};

var ENEMY_NAMES = {
  mag: ['떠도는 자속', '자기장 도깨비', '쿨롱의 그림자'],
  power: ['누전 유령', '고압 스파크', '송전탑 파수꾼'],
  machine: ['녹슨 회전자', '과열 변압기', '멈춘 전동기'],
  circuit: ['꼬인 회로', '임피던스 미로', '공진의 소용돌이'],
  kec: ['규정 위반 딱지', '접지 불량 귀신', '절연 저항 시험관']
};

function rgSubjects() {
  return (typeof examSubjects === 'function' ? examSubjects() : DATA.subjects) || [];
}

/* 적은 언제나 "이번 작전 구역(과목)"에서 나온다 — 런 하나가 한 과목 집중 학습이 되도록 */
function rgEnemyFor(kind) {
  var r = rgRun();
  var subj = subjectByKey(r.zone);
  if (!subj) { var subs = rgSubjects(); subj = subs[0]; }
  var hp = kind === 'boss' ? 42 : kind === 'elite' ? 26 : 15;
  var bite = kind === 'battle' ? 1 : 2;
  var nm, icon;
  if (kind === 'boss') {
    var boss = (window.BOSSES || []).filter(function (b) { return b.key === subj.key; })[0];
    nm = boss ? boss.name : subj.name + ' 주 변전소';
    icon = boss ? boss.emoji : '👑';
  } else {
    var names = ENEMY_NAMES[subj.key] || [subj.name + ' 고장'];
    nm = names[Math.floor(Math.random() * names.length)];
    icon = kind === 'elite' ? '☠️' : '⚡';
  }
  return { subjKey: subj.key, subjName: subj.name, name: nm, hp: hp, maxHp: hp, bite: bite, icon: icon, kind: kind };
}

/* ---------- 구역(과목) ---------- */
function rgMeta() {
  if (!S.rogueMeta) S.rogueMeta = { zones: {}, maxHpBonus: 0 };
  if (!S.rogueMeta.zones) S.rogueMeta.zones = {};
  return S.rogueMeta;
}
window.rogueZones = function () {
  var m = rgMeta();
  return rgSubjects().map(function (s) {
    var z = m.zones[s.key] || { clears: 0, best: 0 };
    var st = (typeof subjectStats === 'function') ? subjectStats(s) : { attempted: 0, total: 1 };
    return {
      key: s.key, name: s.name, clears: z.clears || 0, best: z.best || 0,
      pct: Math.round(st.attempted / Math.max(st.total, 1) * 100)
    };
  });
};
window.rogueRestoredCount = function () {
  var m = rgMeta(), n = 0;
  for (var k in m.zones) if (m.zones[k].clears > 0) n++;
  return n;
};

/* ---------- 런 상태 ---------- */
function rgRun() { return S.rogue; }
function rgSave() { saveState(); }

window.rogueStart = function (zoneKey) {
  if (typeof actx === 'function') actx();       // 사용자 제스처에서 오디오 활성화
  session = null;
  var subs = rgSubjects();
  if (!zoneKey && subs.length) zoneKey = subs[0].key;
  var m = rgMeta();
  var maxHp = 6 + (m.maxHpBonus || 0);
  S.rogue = {
    zone: zoneKey,
    floor: 1, hp: maxHp, maxHp: maxHp, power: 0,
    deck: START_DECK.slice(), relics: [],
    draw: [], hand: [], discard: [],
    node: null, battle: null,
    cleared: 0, correct: 0, total: 0, lessons: 0,
    fuseUsed: false, offers: null
  };
  S.rogueStats = S.rogueStats || { runs: 0, clears: 0, bestFloor: 0 };
  S.rogueStats.runs++;
  rgSave();
  renderRogueMap();
};

function rgHasRelic(id) { var r = rgRun(); return r && r.relics.indexOf(id) >= 0; }

/* ---------- 덱 조작 ---------- */
function rgDrawOne() {
  var r = rgRun();
  if (!r.draw.length) {
    if (!r.discard.length) return false;
    r.draw = shuffle(r.discard.slice());
    r.discard = [];
  }
  r.hand.push(r.draw.pop());
  return true;
}
function rgDrawTo(n) {
  var r = rgRun();
  var guard = 0;
  while (r.hand.length < n && guard++ < 30) { if (!rgDrawOne()) break; }
}

/* ---------- 공통 UI 조각 ---------- */
function rgHeartsHtml(r) {
  var out = '';
  for (var i = 0; i < r.maxHp; i++) out += '<span class="rg-hp' + (i < r.hp ? '' : ' off') + '">' + (i < r.hp ? '❤️' : '🤍') + '</span>';
  return out;
}
function rgTopHtml(r) {
  return '<div class="rg-top">' +
    '<div class="rg-hearts">' + rgHeartsHtml(r) + '</div>' +
    '<div class="rg-meta">' +
    '<span class="rg-chip">📍 ' + esc((subjectByKey(r.zone) || {}).name || '') + '</span>' +
    '<span class="rg-chip">🏔 ' + r.floor + ' / ' + FLOOR_PLAN.length + '층</span>' +
    '<span class="rg-chip">⚡ ' + r.power + '</span>' +
    '<span class="rg-chip">🃏 ' + r.deck.length + '</span>' +
    '</div></div>' +
    (r.relics.length ? '<div class="rg-relics">' + r.relics.map(function (id) {
      var rl = RELICS[id];
      return '<span class="rg-relic" title="' + esc(rl.name + ' — ' + rl.desc) + '">' + rl.icon + '</span>';
    }).join('') + '</div>' : '');
}
function rgCardHtml(id, extra, disabled) {
  var c = RCARDS[id];
  return '<div class="rg-card' + (disabled ? ' dim' : '') + '"' + (extra || '') + '>' +
    '<div class="rc-cost">' + c.cost + '</div>' +
    '<div class="rc-icon">' + c.icon + '</div>' +
    '<div class="rc-name">' + esc(c.name) + '</div>' +
    '<div class="rc-desc">' + esc(c.desc) + '</div></div>';
}

/* ---------- 작전 브리핑: 어느 구역으로 출격할까 ---------- */
window.renderRogue = function () {
  session = null;
  if (window.ghostStopTimer) window.ghostStopTimer();
  var m = rgMeta();
  var r = rgRun();
  var zones = window.rogueZones();

  var zoneCards = zones.map(function (z) {
    var done = z.clears > 0;
    return '<div class="rg-zone' + (done ? ' done' : '') + '" data-zone="' + esc(z.key) + '">' +
      '<div class="rz-icon">' + (done ? '🟢' : '🔌') + '</div>' +
      '<div class="rz-body">' +
      '<div class="rz-name">' + esc(z.name) + (done ? ' <span class="rz-tag">복구됨 ×' + z.clears + '</span>' : '') + '</div>' +
      '<div class="rz-sub">' + (done ? '다시 들어가면 더 깊이 복습해요' :
        (z.best ? '최고 ' + z.best + '층까지 갔어요' : '아직 복구 안 된 구역이에요')) + '</div>' +
      '<div class="rz-bar"><i style="width:' + z.pct + '%"></i></div>' +
      '</div><div class="rz-go">출격 ▶</div></div>';
  }).join('');

  $('#view').innerHTML =
    (r ? '<div class="rg-resume" id="rgResume">' +
      '<div><b>🎮 진행 중인 작전이 있어요</b>' +
      '<div class="muted">' + esc((subjectByKey(r.zone) || {}).name || '') + ' · ' + r.floor + '층 · 체력 ' + r.hp + '</div></div>' +
      '<span class="wg-go">이어하기 ▶</span></div>' : '') +

    '<div class="card rg-hero">' +
    '<div class="rg-hero-icon">🗺</div>' +
    '<h2>어느 구역을 복구할까요?</h2>' +
    '<p class="muted">구역 하나가 과목 하나예요. 그 구역의 문제·이론만 나오니까 <b>한 과목을 집중해서 끝낼 수 있어요.</b></p>' +
    '<div class="rg-stat-line">' +
    '<span>복구한 구역 ' + window.rogueRestoredCount() + ' / ' + zones.length + '</span>' +
    '<span>최대 체력 ❤️ ' + (6 + (m.maxHpBonus || 0)) + '</span></div>' +
    '</div>' +
    '<div class="rg-zones">' + zoneCards + '</div>' +
    '<div class="card"><b>가지고 시작하는 카드</b>' +
    '<div class="rg-hand rg-preview">' + START_DECK.filter(function (x, i, a) { return a.indexOf(x) === i; })
      .map(function (id) { return rgCardHtml(id); }).join('') + '</div>' +
    '<p class="muted" style="margin-top:8px">틀리면 체력이 줄고 0이 되면 작전이 끝나요 — 하지만 ' +
    '<b>XP도 복습 기록도 그대로 남아요.</b> 잃는 건 없어요.</p></div>';

  document.querySelectorAll('[data-zone]').forEach(function (el) {
    el.onclick = function () {
      var key = el.getAttribute('data-zone');
      if (r && !confirm('진행 중인 작전이 사라져요. 새로 시작할까요?')) return;
      window.rogueStart(key);
    };
  });
  var rs = $('#rgResume'); if (rs) rs.onclick = window.rogueResume;
  if (window.updateBadge) updateBadge();
  window.scrollTo(0, 0);
};

/* 진행 중인 작전의 정확한 지점으로 복귀 */
window.rogueResume = function () {
  var r = rgRun();
  if (!r) { window.renderRogue(); return; }
  if (typeof actx === 'function') actx();
  session = null;
  if (r.battle) renderRogueBattle();
  else if (r.node) rgEnterNode(r.node, true);
  else renderRogueMap();
};

/* ---------- 지도 (층 선택) ---------- */
function renderRogueMap() {
  var r = rgRun();
  if (!r) { window.renderRogue(); return; }
  if (r.floor > FLOOR_PLAN.length) { rgEndRun(true); return; }

  var kinds = FLOOR_PLAN[r.floor - 1];
  // 같은 층에서는 선택지를 고정해둔다 (새로고침해도 안 바뀌게)
  if (!r.offers || r.offers.floor !== r.floor) {
    r.offers = { floor: r.floor, list: kinds.map(function (k) { return rgMakeNode(k); }) };
    rgSave();
  }

  var track = FLOOR_PLAN.map(function (f, i) {
    var n = i + 1;
    var cls = n < r.floor ? 'done' : (n === r.floor ? 'now' : '');
    var ic = f[0] === 'boss' ? '👑' : (n < r.floor ? '✓' : '·');
    return '<span class="rg-step ' + cls + '">' + ic + '</span>';
  }).join('');

  var cards = r.offers.list.map(function (nd, i) {
    var info = NODE_INFO[nd.type];
    var sub = nd.enemy ? nd.enemy.subjName + ' · ' + nd.enemy.name : info.desc;
    return '<div class="rg-node" data-node="' + i + '">' +
      '<div class="rn-icon">' + (nd.enemy ? nd.enemy.icon : info.icon) + '</div>' +
      '<div class="rn-body"><div class="rn-name">' + esc(info.name) +
      (nd.enemy ? ' <span class="rn-hp">HP ' + nd.enemy.hp + '</span>' : '') + '</div>' +
      '<div class="rn-sub">' + esc(sub) + '</div></div></div>';
  }).join('');

  $('#view').innerHTML =
    rgTopHtml(r) +
    '<div class="rg-track">' + track + '</div>' +
    '<div class="card" style="text-align:center">' +
    '<b style="font-size:1.1rem">' + r.floor + '층 — 어느 길로 갈까요?</b>' +
    '<p class="muted" style="margin-top:4px">' + (r.floor === FLOOR_PLAN.length ? '마지막 관문이에요.' : '고른 쪽만 진행돼요.') + '</p></div>' +
    '<div class="rg-nodes">' + cards + '</div>' +
    '<div class="rg-foot-btns">' +
    '<button class="btn btn-ghost btn-sm" id="rgDeckBtn">🃏 내 덱 보기</button>' +
    '<button class="btn btn-ghost btn-sm" id="rgQuit">탐험 그만두기</button></div>';

  document.querySelectorAll('[data-node]').forEach(function (el) {
    el.onclick = function () {
      var nd = r.offers.list[parseInt(el.getAttribute('data-node'), 10)];
      r.node = nd; r.offers = null; rgSave();
      rgEnterNode(nd);
    };
  });
  $('#rgDeckBtn').onclick = rgShowDeck;
  $('#rgQuit').onclick = function () {
    if (confirm('탐험을 그만둘까요? 지금까지 푼 문제 기록은 그대로 남아요.')) { S.rogue = null; rgSave(); window.renderRogue(); }
  };
  window.scrollTo(0, 0);
}

function rgMakeNode(kind) {
  if (kind === 'battle' || kind === 'elite' || kind === 'boss') {
    return { type: kind, enemy: rgEnemyFor(kind) };
  }
  if (kind === 'lesson') {
    var u = rgNextLessonUnit();
    // 이 구역 레슨을 다 배웠으면 자재 창고로 대체한다
    return u ? { type: 'lesson', ui: u.ui, topic: u.topic, review: u.review } : { type: 'treasure' };
  }
  return { type: kind };
}

/* 이번 구역에서 아직 안 배운 레슨을 우선, 없으면 복습용으로 하나 */
function rgNextLessonUnit() {
  var r = rgRun();
  var subj = subjectByKey(r.zone);
  if (!subj) return null;
  var fresh = null, any = null;
  subj.units.forEach(function (u, ui) {
    if (!window.lessonExists || !window.lessonExists(subj.key, ui)) return;
    if (!any) any = { ui: ui, topic: u.topic, review: true };
    if (fresh) return;
    var lp = S.lessonProg[unitKeyOf(subj.key, ui)];
    if (!lp || !lp.done) fresh = { ui: ui, topic: u.topic, review: false };
  });
  return fresh || any;
}

function rgShowDeck() {
  var r = rgRun();
  var counts = {};
  r.deck.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
  var html = Object.keys(counts).map(function (id) {
    return rgCardHtml(id, ' data-cnt="' + counts[id] + '"') ;
  }).join('');
  $('#view').innerHTML =
    rgTopHtml(r) +
    '<div class="card"><b>🃏 내 덱 (' + r.deck.length + '장)</b>' +
    '<div class="rg-hand rg-preview">' + html + '</div></div>' +
    (r.relics.length ? '<div class="card"><b>🏺 유물</b>' + r.relics.map(function (id) {
      var rl = RELICS[id];
      return '<div class="rg-relic-row"><span>' + rl.icon + '</span><div><b>' + esc(rl.name) + '</b>' +
        '<div class="muted">' + esc(rl.desc) + '</div></div></div>';
    }).join('') + '</div>' : '') +
    '<button class="btn btn-primary" id="rgBack">돌아가기</button>';
  $('#rgBack').onclick = function () { renderRogueMap(); };
  window.scrollTo(0, 0);
}

/* ---------- 노드 진입 ---------- */
function rgEnterNode(nd, resuming) {
  if (nd.type === 'rest') { renderRogueRest(); return; }
  if (nd.type === 'treasure') { renderRogueTreasure(); return; }
  if (nd.type === 'shop') { renderRogueShop(); return; }
  if (nd.type === 'lesson') { renderRogueLesson(); return; }
  if (!resuming || !rgRun().battle) rgStartBattle(nd.enemy);
  renderRogueBattle();
}

/* ---------- 📖 설계도실 (이론 레슨) ---------- */
function renderRogueLesson() {
  var r = rgRun(), nd = r.node;
  $('#view').innerHTML =
    rgTopHtml(r) +
    '<div class="card rg-rest"><div class="rg-hero-icon">📖</div>' +
    '<b style="font-size:1.1rem">설계도실</b>' +
    '<p class="muted">' + (nd.review ? '이 구역 설계도는 이미 다 익혔어요. 하나를 다시 펴 볼까요?' :
      '아직 안 본 설계도가 있어요. 읽고 나면 <b>카드 한 장</b>을 얻어요.') + '</p>' +
    '<div class="rg-lesson-topic">' + esc(nd.topic) + '</div>' +
    '<button class="btn btn-primary btn-big" id="rgLearn">📖 설계도 읽기' +
    (nd.review ? '' : ' <small>(+15 XP)</small>') + '</button>' +
    '<button class="btn btn-ghost" id="rgSkipLesson">그냥 지나가기</button>' +
    '</div>';
  $('#rgLearn').onclick = function () {
    if (window.startLesson) window.startLesson(r.zone, nd.ui, false, true);
  };
  $('#rgSkipLesson').onclick = function () { rgNextFloor(); };
  window.scrollTo(0, 0);
}

/* 레슨을 끝내고 작전으로 복귀 — 카드 한 장을 보상으로 준다 */
window.rogueLessonDone = function () {
  var r = rgRun();
  if (!r) { renderHome(); return; }
  r.lessons = (r.lessons || 0) + 1;
  rgSave();
  renderRogueReward('📖 설계도를 익혔어요 — 카드를 한 장 고르세요');
};

/* ---------- 전투 ---------- */
function rgQueueFor(subjKey) {
  var subj = subjectByKey(subjKey);
  if (!subj) return [];
  var pool = [];
  subj.units.forEach(function (u, ui) {
    pool.push({ subjKey: subjKey, ui: ui, pr: priorityOfUnit(subjKey, ui), seen: lastSeenOfUnit(subjKey, ui) });
  });
  pool = shuffle(pool);
  pool.sort(function (a, b) { return a.pr - b.pr || a.seen - b.seen; });
  return pool.map(function (p) { return { subjKey: p.subjKey, ui: p.ui }; });
}

function rgStartBattle(enemy) {
  var r = rgRun();
  if (rgHasRelic('glove')) r.hp = Math.min(r.maxHp, r.hp + 1);
  r.draw = shuffle(r.deck.slice());
  r.hand = []; r.discard = [];
  r.battle = {
    enemy: { name: enemy.name, subjKey: enemy.subjKey, subjName: enemy.subjName, hp: enemy.hp, maxHp: enemy.maxHp, bite: enemy.bite, icon: enemy.icon, kind: enemy.kind },
    queue: rgQueueFor(enemy.subjKey), qi: 0, turn: 0,
    q: null, picked: null, locked: false, log: '', requeue: []
  };
  rgSave();
  rgStartTurn();
}

function rgNextItem() {
  var r = rgRun(), b = r.battle;
  if (b.requeue.length) return b.requeue.shift();
  if (b.qi >= b.queue.length) { b.queue = rgQueueFor(b.enemy.subjKey); b.qi = 0; }
  var it = b.queue[b.qi++];
  return { subjKey: it.subjKey, ui: it.ui, which: whichToServe(it.subjKey, it.ui) };
}

function rgStartTurn() {
  var r = rgRun(), b = r.battle;
  b.turn++;
  b.q = rgNextItem();
  b.picked = null; b.locked = false;
  b.killed = null; b.concept = false; b.bonus = 0;
  b.shield = false; b.surge = false; b.again = false; b.log = '';
  b.energy = 2 + (rgHasRelic('battery') ? 1 : 0);
  rgDrawTo(3 + (rgHasRelic('magnet') ? 1 : 0));
  if (b.turn === 1 && rgHasRelic('ruler')) rgApplyCut();
  rgSave();
}

function rgApplyCut() {
  var b = rgRun().battle;
  var g = getQuestion(b.q);
  if (!g) return;
  var wrong = [];
  for (var i = 0; i < g.q.choices.length; i++) if (i !== g.q.answer) wrong.push(i);
  b.killed = shuffle(wrong).slice(0, 2);
}

function rgPlayCard(handIdx) {
  var r = rgRun(), b = r.battle;
  if (b.locked) return;
  var id = r.hand[handIdx];
  var c = RCARDS[id];
  if (!c || b.energy < c.cost) { toast('에너지가 모자라요'); return; }

  if (id === 'cut') { if (b.killed) { toast('이미 지웠어요'); return; } rgApplyCut(); b.log = '✂️ 선택지 2개를 지웠어요'; }
  else if (id === 'recall') { b.concept = true; b.log = '📖 개념을 펼쳤어요'; }
  else if (id === 'focus') { b.bonus += 4; b.log = '💥 집중! 이번 정답 피해 +4'; }
  else if (id === 'insul') { b.shield = true; b.log = '🛡 절연 — 이번엔 틀려도 안 아파요'; }
  else if (id === 'heal') { r.hp = Math.min(r.maxHp, r.hp + 2); b.log = '❤️ 체력을 2 회복했어요'; }
  else if (id === 'surge') { b.bonus += 9; b.surge = true; b.log = '⚡ 과전류! 크게 때리지만 틀리면 더 아파요'; }
  else if (id === 'insight') { rgDrawOne(); rgDrawOne(); b.log = '🔍 카드를 2장 뽑았어요'; }
  else if (id === 'ground') {
    var easy = (typeof easyUnits === 'function') ? easyUnits(1) : [];
    if (!easy.length) { toast('아직 마스터한 문제가 없어요'); return; }
    b.q = { subjKey: easy[0].subjKey, ui: easy[0].ui, which: easy[0].which };
    b.killed = null; b.concept = false;
    b.log = '🪝 접지 — 쉬운 문제로 바꿨어요';
  }
  else if (id === 'again') { b.again = true; b.log = '🔁 재도전 — 틀리면 한 번 더 만나요'; }
  else if (id === 'charge') { b.energy += 2; b.log = '🔋 에너지 +2'; }

  b.energy -= c.cost;
  r.hand.splice(handIdx, 1);
  r.discard.push(id);
  if (window.haptic) haptic('ok');
  rgSave();
  renderRogueBattle();
}

function rgAnswer(pick) {
  var r = rgRun(), b = r.battle;
  if (b.locked) return;
  b.locked = true;
  var g = getQuestion(b.q);
  var ok = pick === g.q.answer;
  b.picked = pick;
  b.total = (b.total || 0);
  r.total++; if (ok) r.correct++;

  // 학습 기록은 게임 결과와 무관하게 정상 반영된다
  recordAttempt(b.q.subjKey, b.q.ui, b.q.which, ok, { isRetry: false, xp: ok ? 12 : 3, silentXp: true });

  if (ok) {
    var dmg = 5 + b.bonus + (rgHasRelic('medal') ? 2 : 0);
    b.enemy.hp = Math.max(0, b.enemy.hp - dmg);
    b.lastDmg = dmg;
    if (typeof SFX !== 'undefined') (b.bonus >= 9 ? SFX.crit : SFX.hit)(1);
    if (window.haptic) haptic('ok');
  } else {
    var bite = b.enemy.bite + (b.surge ? 1 : 0);
    if (b.shield) { bite = 0; b.log = '🛡 절연이 막아줬어요!'; }
    if (bite) {
      r.hp -= bite;
      if (r.hp <= 0 && rgHasRelic('fuse') && !r.fuseUsed) { r.hp = 1; r.fuseUsed = true; b.log = '🧯 예비 퓨즈가 끊어지며 버텼어요!'; }
    }
    b.lastDmg = 0;
    if (b.again) b.requeue.push({ subjKey: b.q.subjKey, ui: b.q.ui, which: b.q.which === 'm' ? 't' : 'm' });
    if (typeof SFX !== 'undefined') SFX.miss();
    if (window.haptic) haptic('no');
  }
  rgSave();
  renderRogueBattle();
}

function rgTurnEnd() {
  var r = rgRun(), b = r.battle;
  // 손패는 버리고 다음 턴에 다시 뽑는다
  r.discard = r.discard.concat(r.hand);
  r.hand = [];
  if (b.enemy.hp <= 0) { rgWinBattle(); return; }
  if (r.hp <= 0) { rgEndRun(false); return; }
  rgStartTurn();
  renderRogueBattle();
}

function renderRogueBattle() {
  var r = rgRun();
  if (!r || !r.battle) { window.renderRogue(); return; }
  var b = r.battle;
  var g = getQuestion(b.q);
  if (!g) { b.q = rgNextItem(); g = getQuestion(b.q); if (!g) { renderRogueMap(); return; } }
  var answered = b.picked !== null && b.picked !== undefined;
  var ehpPct = Math.round(b.enemy.hp / b.enemy.maxHp * 100);

  var choices = g.q.choices.map(function (c, i) {
    var cls = 'choice';
    var isKilled = !answered && b.killed && b.killed.indexOf(i) >= 0;
    if (answered) {
      if (i === g.q.answer) cls += (i === b.picked ? ' picked-right' : ' reveal-right');
      else if (i === b.picked) cls += ' picked-wrong';
      else cls += ' dim';
    } else if (isKilled) cls += ' killed';
    return '<button class="' + cls + '" data-rpick="' + i + '"' + (answered || isKilled ? ' disabled' : '') + '>' +
      '<span class="num">' + RG_CIRC[i] + '</span><span>' + esc(c) + '</span></button>';
  }).join('');

  var handHtml = r.hand.map(function (id, i) {
    var c = RCARDS[id];
    var dis = answered || b.energy < c.cost;
    return rgCardHtml(id, ' data-hand="' + i + '"', dis);
  }).join('') || '<div class="rg-empty">손에 카드가 없어요 — 답을 고르세요</div>';

  var verdict = '';
  if (answered) {
    var ok = b.picked === g.q.answer;
    verdict = '<div class="verdict ' + (ok ? 'ok' : 'no') + '">' +
      '<div class="verdict-title">' + (ok ? '⚔️ 명중! ' + b.lastDmg + ' 피해' : '💢 반격당했어요') + '</div>' +
      (ok ? '' : '<div class="answer-line">정답: ' + RG_CIRC[g.q.answer] + ' ' + esc(g.q.choices[g.q.answer]) + '</div>') +
      '<div class="explain">' + esc(g.q.explain) + '</div>' +
      (ok ? '' : '<div class="concept-box" style="margin-top:12px"><b class="cb-title">💡 ' + esc(g.unit.topic) + '</b>' + esc(g.unit.concept) + '</div>') +
      '</div>';
  }

  $('#view').innerHTML =
    rgTopHtml(r) +
    '<div class="rg-enemy">' +
    '<div class="re-icon">' + b.enemy.icon + '</div>' +
    '<div class="re-body">' +
    '<div class="re-name">' + esc(b.enemy.name) + '<span class="re-subj">' + esc(b.enemy.subjName) + '</span></div>' +
    '<div class="re-bar"><i style="width:' + ehpPct + '%"></i></div>' +
    '<div class="re-hp">' + b.enemy.hp + ' / ' + b.enemy.maxHp + '</div>' +
    '</div></div>' +

    '<div class="rg-energy">⚡ 에너지 <b>' + b.energy + '</b>' +
    '<span class="rg-pile">뽑을 카드 ' + r.draw.length + ' · 버린 카드 ' + r.discard.length + '</span></div>' +
    '<div class="rg-hand">' + handHtml + '</div>' +
    (b.log ? '<div class="rg-log">' + esc(b.log) + '</div>' : '') +

    '<div class="card">' +
    '<span class="topic-chip">' + esc(g.subj.name) + ' · ' + esc(g.unit.topic) + '</span>' +
    (b.concept && !answered ? '<div class="concept-box"><b class="cb-title">📖 복기 — ' + esc(g.unit.topic) + '</b>' + esc(g.unit.concept) + '</div>' : '') +
    '<div class="qtext">' + esc(g.q.q) + '</div>' +
    '<div class="choices">' + choices + '</div>' +
    verdict +
    (answered ? '<div class="quiz-next"><button class="btn btn-primary" id="rgNext">' +
      (b.enemy.hp <= 0 ? '승리! ▶' : (r.hp <= 0 ? '결과 보기 ▶' : '다음 턴 ▶')) + '</button></div>' : '') +
    '</div>';

  if (!answered) {
    document.querySelectorAll('[data-rpick]').forEach(function (bt) {
      bt.onclick = function () { rgAnswer(parseInt(bt.getAttribute('data-rpick'), 10)); };
    });
    document.querySelectorAll('[data-hand]').forEach(function (el) {
      el.onclick = function () { rgPlayCard(parseInt(el.getAttribute('data-hand'), 10)); };
    });
  } else {
    $('#rgNext').onclick = rgTurnEnd;
    // 명중하면 적이 한 번 흔들린다
    if (b.lastDmg > 0) {
      var ep = document.querySelector('.rg-enemy');
      if (ep) { ep.classList.add('hit'); setTimeout(function () { ep.classList.remove('hit'); }, 320); }
    }
  }
  if (window.updateBadge) updateBadge();
  window.scrollTo(0, 0);
}

/* ---------- 전투 승리 ---------- */
function rgWinBattle() {
  var r = rgRun(), b = r.battle;
  var kind = b.enemy.kind;
  r.power += kind === 'boss' ? 0 : (kind === 'elite' ? 12 : 6);
  if (rgHasRelic('lamp')) r.hp = Math.min(r.maxHp, r.hp + 1);
  r.cleared++;
  if (typeof SFX !== 'undefined') SFX.victory();
  if (window.celebrate) celebrate(kind === 'battle' ? 'small' : 'big');
  r.battle = null;
  rgSave();
  if (kind === 'boss') { rgEndRun(true); return; }
  if (kind === 'elite') { rgGrantRelic('강적을 쓰러뜨렸어요!'); return; }
  renderRogueReward();
}

function rgPickCards(n) {
  var pool = shuffle(RCARD_POOL.slice());
  return pool.slice(0, n);
}

function renderRogueReward(headline) {
  var r = rgRun();
  var n = rgHasRelic('meter') ? 4 : 3;
  if (!r.rewardOffer) { r.rewardOffer = rgPickCards(n); rgSave(); }
  var cards = r.rewardOffer.map(function (id, i) { return rgCardHtml(id, ' data-reward="' + i + '"'); }).join('');
  $('#view').innerHTML =
    rgTopHtml(r) +
    '<div class="card" style="text-align:center">' +
    '<b style="font-size:1.1rem">' + esc(headline || '🎉 복구 성공! 카드를 한 장 고르세요') + '</b>' +
    '<p class="muted" style="margin-top:4px">고른 카드는 덱에 들어가 다음 전투부터 나와요</p></div>' +
    '<div class="rg-hand rg-choose">' + cards + '</div>' +
    '<button class="btn btn-ghost" id="rgSkip">안 받고 넘어가기</button>';
  document.querySelectorAll('[data-reward]').forEach(function (el) {
    el.onclick = function () {
      var id = r.rewardOffer[parseInt(el.getAttribute('data-reward'), 10)];
      r.deck.push(id); r.rewardOffer = null;
      toast(RCARDS[id].icon + ' ' + RCARDS[id].name + ' 카드를 얻었어요!');
      rgNextFloor();
    };
  });
  $('#rgSkip').onclick = function () { r.rewardOffer = null; rgNextFloor(); };
  window.scrollTo(0, 0);
}

function rgGrantRelic(headline) {
  var r = rgRun();
  var avail = RELIC_POOL.filter(function (id) { return r.relics.indexOf(id) < 0; });
  if (!avail.length) { renderRogueReward(); return; }
  if (!r.relicOffer) { r.relicOffer = shuffle(avail).slice(0, 3); rgSave(); }
  var cards = r.relicOffer.map(function (id, i) {
    var rl = RELICS[id];
    return '<div class="rg-card relic" data-relic="' + i + '">' +
      '<div class="rc-icon">' + rl.icon + '</div>' +
      '<div class="rc-name">' + esc(rl.name) + '</div>' +
      '<div class="rc-desc">' + esc(rl.desc) + '</div></div>';
  }).join('');
  $('#view').innerHTML =
    rgTopHtml(r) +
    '<div class="card" style="text-align:center"><b style="font-size:1.1rem">🏺 ' + esc(headline) + '</b>' +
    '<p class="muted" style="margin-top:4px">유물을 하나 고르세요 — 탐험이 끝날 때까지 계속 작동해요</p></div>' +
    '<div class="rg-hand rg-choose">' + cards + '</div>';
  document.querySelectorAll('[data-relic]').forEach(function (el) {
    el.onclick = function () {
      var id = r.relicOffer[parseInt(el.getAttribute('data-relic'), 10)];
      r.relics.push(id); r.relicOffer = null;
      toast(RELICS[id].icon + ' ' + RELICS[id].name + '을(를) 얻었어요!');
      if (window.celebrate) celebrate('small');
      rgNextFloor();
    };
  });
  window.scrollTo(0, 0);
}

/* ---------- 모닥불 / 보물 / 상점 ---------- */
function renderRogueRest() {
  var r = rgRun();
  $('#view').innerHTML =
    rgTopHtml(r) +
    '<div class="card rg-rest"><div class="rg-hero-icon">🔥</div>' +
    '<b style="font-size:1.1rem">모닥불에서 잠시 쉬어가요</b>' +
    '<p class="muted">하나만 고를 수 있어요</p>' +
    '<button class="btn btn-primary btn-big" id="rgHeal">❤️ 푹 쉬기<br><small style="font-weight:500">체력을 3 회복해요</small></button>' +
    '<button class="btn btn-ghost btn-big" id="rgUp">🔧 장비 손질<br><small style="font-weight:500">최대 체력이 1 늘고 그만큼 회복해요</small></button>' +
    '<button class="btn btn-ghost btn-big" id="rgTrim">🗑 덱 정리<br><small style="font-weight:500">카드 한 장을 덱에서 빼요</small></button>' +
    '</div>';
  $('#rgHeal').onclick = function () { r.hp = Math.min(r.maxHp, r.hp + 3); toast('❤️ 체력을 회복했어요'); rgNextFloor(); };
  $('#rgUp').onclick = function () { r.maxHp++; r.hp++; toast('🔧 최대 체력이 늘었어요'); rgNextFloor(); };
  $('#rgTrim').onclick = rgTrimDeck;
  window.scrollTo(0, 0);
}

function rgTrimDeck() {
  var r = rgRun();
  if (r.deck.length <= 3) { toast('덱이 너무 작아서 뺄 수 없어요'); return; }
  var cards = r.deck.map(function (id, i) { return rgCardHtml(id, ' data-trim="' + i + '"'); }).join('');
  $('#view').innerHTML =
    rgTopHtml(r) +
    '<div class="card" style="text-align:center"><b>뺄 카드를 고르세요</b>' +
    '<p class="muted" style="margin-top:4px">덱이 얇아지면 좋은 카드가 더 자주 나와요</p></div>' +
    '<div class="rg-hand rg-choose">' + cards + '</div>' +
    '<button class="btn btn-ghost" id="rgTrimCancel">그냥 두기</button>';
  document.querySelectorAll('[data-trim]').forEach(function (el) {
    el.onclick = function () {
      var i = parseInt(el.getAttribute('data-trim'), 10);
      toast('🗑 ' + RCARDS[r.deck[i]].name + ' 카드를 뺐어요');
      r.deck.splice(i, 1);
      rgNextFloor();
    };
  });
  $('#rgTrimCancel').onclick = renderRogueRest;
  window.scrollTo(0, 0);
}

function renderRogueTreasure() { rgGrantRelic('보물 상자를 열었어요!'); }

function renderRogueShop() {
  var r = rgRun();
  if (!r.shopStock) {
    r.shopStock = { cards: rgPickCards(3), relic: shuffle(RELIC_POOL.filter(function (id) { return r.relics.indexOf(id) < 0; }))[0] || null, sold: {} };
    rgSave();
  }
  var st = r.shopStock;
  var cardRows = st.cards.map(function (id, i) {
    var sold = st.sold['c' + i];
    return '<div class="rg-shop-row' + (sold ? ' sold' : '') + '" data-buy="c' + i + '">' +
      rgCardHtml(id) + '<div class="rg-price">' + (sold ? '판매됨' : '⚡ 8') + '</div></div>';
  }).join('');
  var relicRow = st.relic && !st.sold.r ?
    '<div class="rg-shop-row" data-buy="r">' +
    '<div class="rg-card relic"><div class="rc-icon">' + RELICS[st.relic].icon + '</div>' +
    '<div class="rc-name">' + esc(RELICS[st.relic].name) + '</div>' +
    '<div class="rc-desc">' + esc(RELICS[st.relic].desc) + '</div></div>' +
    '<div class="rg-price">⚡ 20</div></div>' : '';

  $('#view').innerHTML =
    rgTopHtml(r) +
    '<div class="card" style="text-align:center"><div class="rg-hero-icon">🏪</div>' +
    '<b style="font-size:1.1rem">전기 자재상</b>' +
    '<p class="muted">가진 전력 <b>⚡ ' + r.power + '</b></p></div>' +
    '<div class="rg-shop">' + cardRows + relicRow +
    '<div class="rg-shop-row' + (st.sold.h ? ' sold' : '') + '" data-buy="h">' +
    '<div class="rg-card"><div class="rc-icon">❤️</div><div class="rc-name">응급 정비</div>' +
    '<div class="rc-desc">체력을 3 회복한다</div></div>' +
    '<div class="rg-price">' + (st.sold.h ? '구매함' : '⚡ 10') + '</div></div>' +
    '</div>' +
    '<button class="btn btn-primary btn-big" id="rgLeaveShop">다음 층으로 ▶</button>';

  document.querySelectorAll('[data-buy]').forEach(function (el) {
    el.onclick = function () {
      var key = el.getAttribute('data-buy');
      if (st.sold[key]) return;
      var price = key === 'r' ? 20 : (key === 'h' ? 10 : 8);
      if (r.power < price) { toast('전력이 모자라요'); return; }
      r.power -= price; st.sold[key] = true;
      if (key === 'r') { r.relics.push(st.relic); toast(RELICS[st.relic].icon + ' ' + RELICS[st.relic].name + ' 구매!'); }
      else if (key === 'h') { r.hp = Math.min(r.maxHp, r.hp + 3); toast('❤️ 체력을 회복했어요'); }
      else { var id = st.cards[parseInt(key.slice(1), 10)]; r.deck.push(id); toast(RCARDS[id].icon + ' ' + RCARDS[id].name + ' 구매!'); }
      rgSave();
      renderRogueShop();
    };
  });
  $('#rgLeaveShop').onclick = function () { r.shopStock = null; rgNextFloor(); };
  window.scrollTo(0, 0);
}

/* ---------- 층 이동 ---------- */
function rgNextFloor() {
  var r = rgRun();
  r.floor++;
  r.node = null; r.battle = null; r.offers = null;
  r.hand = []; r.draw = []; r.discard = [];
  var st = S.rogueStats;
  if (st && r.floor - 1 > (st.bestFloor || 0)) st.bestFloor = r.floor - 1;
  rgSave();
  if (r.floor > FLOOR_PLAN.length) { rgEndRun(true); return; }
  renderRogueMap();
}

/* ---------- 런 종료 ---------- */
function rgEndRun(win) {
  var r = rgRun();
  if (!r) { window.renderRogue(); return; }
  var st = S.rogueStats = S.rogueStats || { runs: 0, clears: 0, bestFloor: 0 };
  var reached = Math.min(r.floor, FLOOR_PLAN.length);
  if (reached > (st.bestFloor || 0)) st.bestFloor = reached;
  if (win) st.clears++;

  // 구역 기록 + 영구 성장: 구역을 처음 복구하면 최대 체력이 1 늘어난다
  var m = rgMeta();
  var z = m.zones[r.zone] || { clears: 0, best: 0 };
  var firstClear = win && !z.clears;
  if (win) z.clears++;
  if (reached > (z.best || 0)) z.best = reached;
  m.zones[r.zone] = z;
  if (firstClear) m.maxHpBonus = Math.min((m.maxHpBonus || 0) + 1, 5);

  var zoneName = (subjectByKey(r.zone) || {}).name || '';
  var correct = r.correct, total = r.total, cleared = r.cleared, lessons = r.lessons || 0;
  var relics = r.relics.slice(), deckN = r.deck.length;
  S.rogue = null;
  rgSave();

  if (typeof SFX !== 'undefined') (win ? SFX.victory : SFX.defeat)();
  if (win && window.celebrate) celebrate('big');

  var acc = total ? Math.round(correct / total * 100) : 0;
  $('#view').innerHTML =
    '<div class="card rg-end ' + (win ? 'win' : '') + '">' +
    '<div class="rg-hero-icon">' + (win ? '🏆' : '🔦') + '</div>' +
    '<h2>' + (win ? esc(zoneName) + ' 구역 복구 완료!' : '이번 작전은 여기까지') + '</h2>' +
    '<p class="muted">' + (win ?
      '8개 층을 전부 넘었어요. 이건 실력이에요.' +
      (firstClear ? '<br><b>🎖 최대 체력이 영구히 1 늘었어요!</b>' : '') :
      reached + '층까지 갔어요. 여기서 푼 문제는 <b>전부 복습 기록에 남았어요</b> — 잃은 건 하나도 없어요.') + '</p>' +
    '<div class="rg-end-grid">' +
    '<div><b>' + reached + '층</b><span>도달</span></div>' +
    '<div><b>' + cleared + '</b><span>복구한 고장</span></div>' +
    '<div><b>' + correct + '/' + total + '</b><span>정답 (' + acc + '%)</span></div>' +
    '<div><b>' + lessons + '개</b><span>익힌 설계도</span></div>' +
    '</div>' +
    (relics.length ? '<div class="rg-end-relics">' + relics.map(function (id) { return RELICS[id].icon; }).join(' ') + '</div>' : '') +
    '<div class="result-actions">' +
    '<button class="btn btn-primary" id="rgAgain">다음 작전 고르기 ▶</button>' +
    '<button class="btn btn-ghost" id="rgHome">기지로</button>' +
    '</div></div>';
  $('#rgAgain').onclick = function () { window.renderRogue(); };
  $('#rgHome').onclick = function () { renderHome(); };
  window.scrollTo(0, 0);
}
