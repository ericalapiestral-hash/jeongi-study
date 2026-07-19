/* ===== ⚔️ 보스 레이드 — 문제를 게임처럼 ===== */
'use strict';

/* ---------- 사운드 (Web Audio, 오프라인 동작) ---------- */
var AC = null;
function actx() {
  if (AC === null) {
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { AC = false; }
  }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC || null;
}
function beep(freq, dur, type, vol, whenOffset) {
  var ac = actx();
  if (!ac || S.mute) return;
  var t0 = ac.currentTime + (whenOffset || 0);
  var o = ac.createOscillator();
  var g = ac.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
var SFX = {
  hit: function (combo) { beep(320 + Math.min(combo, 12) * 40, 0.12, 'square', 0.18); beep(160, 0.09, 'sine', 0.14); },
  crit: function () { beep(520, 0.1, 'square', 0.2); beep(780, 0.12, 'square', 0.16, 0.05); },
  miss: function () { beep(200, 0.18, 'sawtooth', 0.16); beep(120, 0.22, 'sawtooth', 0.14, 0.02); },
  bossHit: function () { beep(90, 0.25, 'sawtooth', 0.2); },
  victory: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.22, 'triangle', 0.22, i * 0.12); }); },
  defeat: function () { [400, 330, 262, 196].forEach(function (f, i) { beep(f, 0.25, 'sine', 0.2, i * 0.14); }); },
  levelup: function () { [659, 880].forEach(function (f, i) { beep(f, 0.18, 'triangle', 0.2, i * 0.1); }); }
};

/* ---------- 보스 정의 ---------- */
window.BOSSES = [
  { key: 'mag', emoji: '🧲', name: '자기장의 지배자 마그네토스', color: '#7b3ff2', hp: 900, title: '자석과 전하를 다스리는 전자기의 화신', taunt: '내 자기장에서 빠져나갈 수 있겠나?' },
  { key: 'power', emoji: '🗼', name: '송전탑의 수호자 그리드로드', color: '#1f8a4c', hp: 900, title: '전국의 전력망을 지키는 거인', taunt: '고압 전류를 견딜 수 있느냐!' },
  { key: 'machine', emoji: '⚙️', name: '강철 기계신 다이나모', color: '#c0392b', hp: 950, title: '회전하는 강철의 신', taunt: '내 토크를 계산해 보아라!' },
  { key: 'circuit', emoji: '🌀', name: '회로 미궁의 옴가', color: '#2b6cb0', hp: 900, title: '무한한 회로의 미궁을 짜는 자', taunt: '이 미로에서 전류의 길을 찾을 텐가?' },
  { key: 'kec', emoji: '📜', name: '규정의 심판자 케크로스', color: '#b7791f', hp: 850, title: 'KEC 규정을 집행하는 심판자', taunt: '규정 위반은 용납하지 않는다!' }
];
function bossFor(key) { for (var i = 0; i < BOSSES.length; i++) if (BOSSES[i].key === key) return BOSSES[i]; return null; }

var battle = null;
var CIRC = ['①', '②', '③', '④'];

/* ---------- 문제 큐 (약점 우선, 무한 순환) ---------- */
function bossQueue(subjKey) {
  var subj = subjectByKey(subjKey);
  var pool = [];
  subj.units.forEach(function (u, ui) {
    pool.push({ subjKey: subjKey, ui: ui, pr: priorityOfUnit(subjKey, ui), seen: lastSeenOfUnit(subjKey, ui) });
  });
  pool = shuffle(pool);
  pool.sort(function (a, b) { return a.pr - b.pr || a.seen - b.seen; });
  return pool;
}

function startBossBattle(subjKey) {
  var boss = bossFor(subjKey);
  if (!boss) { toast('보스를 찾을 수 없어요.'); return; }
  actx(); // 사용자 제스처에서 오디오 활성화
  session = null; lessonRun = null;
  battle = {
    subjKey: subjKey, boss: boss,
    bossHp: boss.hp, bossMax: boss.hp,
    hearts: 5, maxHearts: 5,
    combo: 0, bestCombo: 0, hits: 0, correct: 0, total: 0,
    queue: bossQueue(subjKey), qi: 0,
    qStart: Date.now(), locked: false, over: false
  };
  renderBattle();
}

function battleQuestion() {
  var q = battle.queue;
  if (battle.qi >= q.length) { battle.queue = bossQueue(battle.subjKey); battle.qi = 0; }
  var it = battle.queue[battle.qi];
  var which = whichToServe(it.subjKey, it.ui);
  // 같은 문제 연속 방지: 최근 것과 겹치면 살짝 밀기
  return { subjKey: it.subjKey, ui: it.ui, which: which };
}

function heartsHtml() {
  var s = '';
  for (var i = 0; i < battle.maxHearts; i++) s += '<span class="heart' + (i < battle.hearts ? '' : ' lost') + '">' + (i < battle.hearts ? '❤️' : '🤍') + '</span>';
  return s;
}
function comboClass() {
  if (battle.combo >= 8) return 'c-max';
  if (battle.combo >= 5) return 'c-hot';
  if (battle.combo >= 3) return 'c-warm';
  return '';
}

function renderBattle(picked, dmg, crit) {
  var b = battle.boss;
  var hpPct = Math.max(0, Math.round(battle.bossHp / battle.bossMax * 100));
  var cur = battle._cur || (battle._cur = battleQuestion());
  var g = getQuestion(cur);
  if (!g) { battle.qi++; battle._cur = null; renderBattle(); return; }
  var answered = typeof picked === 'number';
  var v = $('#view');

  var choices = g.q.choices.map(function (c, i) {
    var cls = 'bchoice';
    if (answered) {
      if (i === g.q.answer) cls += (i === picked ? ' hit' : ' reveal');
      else if (i === picked) cls += ' miss';
      else cls += ' dim';
    }
    return '<button class="' + cls + '" data-bpick="' + i + '"' + (answered ? ' disabled' : '') + '>' +
      '<span class="bnum">' + CIRC[i] + '</span><span>' + esc(c) + '</span></button>';
  }).join('');

  var comboBadge = battle.combo >= 2 ?
    '<div class="combo-badge ' + comboClass() + '">🔥 ' + battle.combo + ' COMBO <span>×' + (1 + Math.min(battle.combo - 1, 10) * 0.2).toFixed(1) + '</span></div>' : '';

  var dmgFloat = '';
  if (answered) {
    if (picked === g.q.answer) dmgFloat = '<div class="dmg-float' + (crit ? ' crit' : '') + '">-' + dmg + (crit ? ' ⚡크리!' : '') + '</div>';
    else dmgFloat = '<div class="dmg-float miss-float">MISS! 💔</div>';
  }

  var verdict = '';
  if (answered) {
    var ok = picked === g.q.answer;
    if (ok) {
      verdict = '<div class="bverdict ok">⚔️ 명중! ' + esc(b.name.split(' ').pop()) + '에게 ' + dmg + ' 데미지!' +
        (crit ? ' <b>크리티컬 히트!</b>' : '') + '</div>';
    } else {
      verdict = '<div class="bverdict no">💥 빗나갔어요! 하트 1개를 잃었어요.' +
        '<div class="bexplain"><b>정답: ' + CIRC[g.q.answer] + ' ' + esc(g.q.choices[g.q.answer]) + '</b><br>' + esc(g.q.explain) + '</div></div>';
    }
  }

  v.innerHTML =
    '<div class="battle-top">' +
    '<button class="btn btn-ghost btn-sm" id="bFlee">🏳️ 후퇴</button>' +
    '<div class="hearts">' + heartsHtml() + '</div>' +
    '<button class="btn btn-ghost btn-sm" id="bMute">' + (S.mute ? '🔇' : '🔊') + '</button>' +
    '</div>' +
    '<div class="boss-stage" id="bossStage" style="--boss:' + b.color + '">' +
    comboBadge +
    '<div class="boss-sprite" id="bossSprite">' + b.emoji + '</div>' +
    dmgFloat +
    '<div class="boss-name">' + esc(b.name) + '</div>' +
    '<div class="boss-hpbar"><i style="width:' + hpPct + '%"></i><span>' + Math.max(0, battle.bossHp) + ' / ' + battle.bossMax + '</span></div>' +
    '</div>' +
    '<div class="card battle-card">' +
    '<span class="topic-chip">' + esc(g.subj.name) + ' · ' + esc(g.unit.topic) + '</span>' +
    '<div class="qtext">' + esc(g.q.q) + '</div>' +
    '<div class="bchoices">' + choices + '</div>' +
    verdict +
    (answered ? '<div class="quiz-next"><button class="btn btn-primary" id="bNext">' + (battle.over ? '결과 보기 ▶' : '다음 공격 ⚔️') + '</button></div>' : '') +
    '</div>';

  $('#bFlee').onclick = function () { if (confirm('전투에서 후퇴할까요? (지금까지 푼 문제는 기록돼요)')) renderBossHub(); };
  $('#bMute').onclick = function () { S.mute = !S.mute; saveState(); renderBattle(picked, dmg, crit); };
  if (!answered) {
    document.querySelectorAll('[data-bpick]').forEach(function (bt) {
      bt.onclick = function () { battleAnswer(parseInt(bt.getAttribute('data-bpick'), 10)); };
    });
  } else {
    $('#bNext').onclick = function () {
      if (battle.over) { renderBattleResult(); return; }
      battle.qi++; battle._cur = null; battle.qStart = Date.now(); battle.locked = false;
      renderBattle();
    };
    $('#bNext').focus();
  }
  window.scrollTo(0, 0);
}

function battleAnswer(pick) {
  if (battle.locked || battle.over) return;
  battle.locked = true;
  var cur = battle._cur;
  var g = getQuestion(cur);
  var ok = pick === g.q.answer;
  battle.total++;

  recordAttempt(cur.subjKey, cur.ui, cur.which, ok, { isRetry: false, xp: ok ? 12 : 3, silentXp: true });

  var dmg = 0, crit = false;
  if (ok) {
    battle.correct++; battle.hits++;
    battle.combo++;
    if (battle.combo > battle.bestCombo) battle.bestCombo = battle.combo;
    if (battle.combo > (S.maxComboEver || 0)) { S.maxComboEver = battle.combo; saveState(); }
    var mult = 1 + Math.min(battle.combo - 1, 10) * 0.2;      // 콤보 배수 (최대 ×3)
    var fast = (Date.now() - battle.qStart) < 12000;           // 12초 안에 = 스피드 보너스
    crit = battle.combo >= 5 && fast;
    dmg = Math.round(90 * mult * (fast ? 1.25 : 1) * (crit ? 1.4 : 1));
    battle.bossHp -= dmg;
    if (crit) SFX.crit(); else SFX.hit(battle.combo);
    shake('bossSprite', 'boss-shake');
    if (battle.bossHp <= 0) { battle.bossHp = 0; battle.over = true; battle.won = true; SFX.victory(); }
  } else {
    battle.combo = 0;
    battle.hearts--;
    SFX.miss();
    shake('bossStage', 'stage-flash');
    if (battle.hearts <= 0) { battle.hearts = 0; battle.over = true; battle.won = false; SFX.defeat(); }
  }
  renderBattle(pick, dmg, crit);
}

function shake(id, cls) {
  setTimeout(function () {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  }, 10);
}

function renderBattleResult() {
  var b = battle.boss;
  var won = battle.won;
  var acc = battle.total ? Math.round(battle.correct / battle.total * 100) : 0;
  var first = false;
  if (won) {
    S.bossDefeated = S.bossDefeated || {};
    if (!S.bossDefeated[b.key]) { first = true; S.bossDefeated[b.key] = todayStr(); }
    addXP(first ? 120 : 40);
    checkBadges();
    saveState();
    if (window.dqBump) { dqBump('boss'); dqCheckRewards(); }
    if (window.celebrate) celebrate('big');
    if (window.haptic) haptic('big');
  }
  var v = $('#view');
  var msg, big;
  if (won) {
    big = '🏆 승리!';
    msg = first ?
      '<b>' + esc(b.name) + '</b>을(를) 처음으로 쓰러뜨렸어요! 이 과목의 핵심을 정복했다는 증거예요. +120 XP 🎉' :
      esc(b.name) + '을(를) 다시 쓰러뜨렸어요! 완벽하게 몸에 익고 있어요. +40 XP';
  } else {
    big = '💫 아쉽게 패배';
    msg = '하지만 ' + battle.correct + '문제나 맞히면서 보스 체력을 ' + Math.round((1 - battle.bossHp / battle.bossMax) * 100) + '%까지 깎았어요! 틀린 문제는 오답노트에 담겼으니, 복습하고 다시 도전하면 분명 이겨요. 💪';
  }
  v.innerHTML =
    '<div class="card result-hero" style="border-top:5px solid ' + b.color + '">' +
    '<div style="font-size:3rem">' + (won ? '🎉' : b.emoji) + '</div>' +
    '<div class="big" style="color:' + (won ? 'var(--good)' : 'var(--warn)') + '">' + big + '</div>' +
    '<div class="msg">' + msg + '</div>' +
    '<div class="battle-stats">' +
    '<span class="bstat">🎯 명중 ' + battle.correct + '/' + battle.total + ' (' + acc + '%)</span>' +
    '<span class="bstat">🔥 최고 콤보 ' + battle.bestCombo + '</span>' +
    '<span class="bstat">❤️ 남은 하트 ' + battle.hearts + '</span>' +
    '</div>' +
    '<div class="result-actions">' +
    '<button class="btn btn-primary" id="bRetry">' + (won ? '⚔️ 다시 도전' : '🔁 재도전') + '</button>' +
    (!won ? '<button class="btn btn-warm" id="bReview">📌 틀린 문제 복습</button>' : '') +
    '<button class="btn btn-ghost" id="bHub">보스 목록</button>' +
    '</div></div>';
  $('#bRetry').onclick = function () { startBossBattle(b.key); };
  $('#bHub').onclick = renderBossHub;
  var rv = $('#bReview'); if (rv) rv.onclick = function () { startSession('review'); };
  window.scrollTo(0, 0);
}

/* ---------- 보스 허브 ---------- */
function renderBossHub() {
  session = null; lessonRun = null; battle = null;
  var v = $('#view');
  S.bossDefeated = S.bossDefeated || {};
  var defeatedN = Object.keys(S.bossDefeated).length;

  var cards = BOSSES.map(function (b) {
    var subj = subjectByKey(b.key);
    var st = subjectStats(subj);
    var ready = st.attempted >= 4;
    var done = !!S.bossDefeated[b.key];
    return '<div class="boss-card' + (done ? ' cleared' : '') + '" style="--boss:' + b.color + '" data-boss="' + b.key + '">' +
      '<div class="boss-card-emoji">' + b.emoji + '</div>' +
      '<div class="boss-card-info">' +
      '<div class="boss-card-name">' + esc(b.name) + (done ? ' <span class="clear-tag">CLEAR ✅</span>' : '') + '</div>' +
      '<div class="boss-card-title">' + esc(b.title) + '</div>' +
      '<div class="boss-card-taunt">“' + esc(b.taunt) + '”</div>' +
      '</div>' +
      '<button class="btn ' + (done ? 'btn-ghost' : 'btn-primary') + ' btn-sm">' + (done ? '재도전' : (ready ? '⚔️ 도전' : '⚔️ 도전')) + '</button>' +
      '</div>';
  }).join('');

  var allDone = defeatedN >= BOSSES.length;
  v.innerHTML =
    '<div class="card" style="text-align:center">' +
    '<b style="font-size:1.15rem">⚔️ 보스 레이드</b>' +
    '<p class="muted" style="margin-top:6px">문제를 맞혀 보스를 공격하세요! 연속 정답으로 콤보를 쌓으면 데미지가 커져요. 틀리면 하트를 잃지만, 정답과 해설을 바로 알려드려요.</p>' +
    '<div class="raid-progress">쓰러뜨린 보스 <b>' + defeatedN + ' / ' + BOSSES.length + '</b></div>' +
    '</div>' +
    (allDone ? '<div class="goal-banner">👑 5대 보스를 모두 정복했어요! 당신은 이미 합격 실력이에요!</div>' : '') +
    '<div class="boss-list">' + cards + '</div>';

  document.querySelectorAll('[data-boss]').forEach(function (c) {
    c.onclick = function () { startBossBattle(c.getAttribute('data-boss')); };
  });
  updateBadge();
  window.scrollTo(0, 0);
}
window.renderBossHub = renderBossHub;
window.startBossBattle = startBossBattle;
