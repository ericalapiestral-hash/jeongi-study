/* ===== 기억 정원 — SRS를 화분으로 =====
   "복습할 개념 6개"라는 숫자를 시들어가는 화분으로 바꾼다.
   새 데이터를 만들지 않고 S.srs를 그대로 읽어서 그린다. */
'use strict';

var PLANT_STAGE = ['🌱', '🌿', '🪴', '🌷', '🌳'];
var GARDEN_SHOW = 14;   // 홈에 늘어놓을 화분 최대 개수

/* 심어진 화분 전체 — 마른 순으로 정렬 */
window.gardenPlants = function () {
  var t = todayStr(), out = [];
  DATA.subjects.forEach(function (subj) {
    subj.units.forEach(function (u, ui) {
      var srs = S.srs[unitKeyOf(subj.key, ui)];
      if (!srs || !srs.lvl || !srs.due) return;
      if (lastSeenOfUnit(subj.key, ui) <= 0) return;
      var over = Math.round((new Date(t + 'T00:00:00') - new Date(srs.due + 'T00:00:00')) / 86400000);
      out.push({
        subjKey: subj.key, ui: ui, topic: u.topic, subjName: subj.name,
        lvl: srs.lvl, over: over
      });
    });
  });
  out.sort(function (a, b) { return b.over - a.over || b.lvl - a.lvl; });
  return out;
};

function plantEmoji(p) {
  if (p.over >= 5) return '🥀';
  return PLANT_STAGE[Math.min(p.lvl, PLANT_STAGE.length) - 1] || '🌱';
}
function plantClass(p) {
  if (p.over >= 5) return 'wilted';
  if (p.over >= 2) return 'droopy';
  if (p.over >= 0) return 'dry';
  return 'ok';
}

/* 홈에 붙일 정원 카드 */
window.gardenHtml = function () {
  var all = window.gardenPlants();
  if (!all.length) return '';
  var dry = all.filter(function (p) { return p.over >= 0; });
  var show = all.slice(0, GARDEN_SHOW);

  var pots = show.map(function (p) {
    return '<span class="pot ' + plantClass(p) + '" title="' + esc(p.subjName + ' · ' + p.topic) + '">' +
      plantEmoji(p) + '</span>';
  }).join('');

  var foot = dry.length
    ? '<div class="garden-foot dry"><b>목마른 화분 ' + dry.length + '개</b> — 물 주면 다시 싱싱해져요' +
      '<span class="garden-go">물 주기 ▶</span></div>'
    : '<div class="garden-foot">오늘은 모든 화분이 싱싱해요 ✨ 내일 또 들러주세요</div>';

  return '<div class="card garden' + (dry.length ? ' has-dry' : '') + '" id="gardenCard">' +
    '<div class="garden-head"><b>🪴 기억 정원</b>' +
    '<span class="garden-count">키운 개념 ' + all.length + '개</span></div>' +
    '<div class="garden-pots">' + pots +
    (all.length > GARDEN_SHOW ? '<span class="pot more">+' + (all.length - GARDEN_SHOW) + '</span>' : '') +
    '</div>' + foot + '</div>';
};

/* 물 주기 = 복습 시간이 된 개념만 모아 푸는 세션 */
window.startGardenSession = function () {
  var dry = window.gardenPlants().filter(function (p) { return p.over >= 0; }).slice(0, 8);
  if (!dry.length) { toast('오늘은 물 줄 화분이 없어요. 정원이 싱싱해요 🌿'); return; }
  session = {
    mode: 'garden', subjKey: null,
    queue: dry.map(function (p) {
      return {
        subjKey: p.subjKey, ui: p.ui, which: whichToServe(p.subjKey, p.ui),
        isFollowup: false, isGarden: true
      };
    }),
    idx: 0, followups: [], answered: [], followupStart: -1,
    locked: false, startTs: Date.now()
  };
  if (window.ghostStart) window.ghostStart(session);
  renderQuiz();
};
