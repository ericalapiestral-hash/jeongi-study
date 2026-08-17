/* ===== 어제의 나 고스트 — 과거의 나와 속도 경쟁 =====
   상대가 과거의 자신이라 지든 이기든 자존감이 상하지 않는다.
   기록은 "문제를 붙잡고 있던 시간"만 재고 해설 읽는 시간은 양쪽 다 뺀다. */
'use strict';

var GHOST_CAP_MS = 120000;   // 2분 넘게 붙잡고 있던 문제는 2분으로 자름 (자리 비움 방지)

/* 같은 코스로 인정하는 기준: 모드 + 과목 + 문제 수가 모두 같아야 한다 */
window.ghostKey = function (sess) {
  if (!sess || sess.mode === 'single' || !sess.baseLen) return null;
  return sess.mode + ':' + (sess.subjKey || 'all') + ':' + sess.baseLen;
};

/* 세션 시작 — 기존 최고 기록을 상대로 세운다 */
window.ghostStart = function (sess) {
  if (!sess) return;
  sess.baseLen = sess.queue.length;
  sess.myTimes = [];
  sess.baseCorrect = 0;
  sess.qStart = 0;
  var key = window.ghostKey(sess);
  var rec = (key && S.ghost) ? S.ghost[key] : null;
  // 기록의 문제 수가 지금과 다르면 다른 코스로 본다
  sess.ghost = (rec && rec.times && rec.times.length === sess.baseLen) ? rec : null;
};

/* 문제가 화면에 뜬 순간 (아직 답을 고르기 전) */
window.ghostQuestionShown = function (sess) {
  if (!sess || !sess.myTimes) return;
  if (sess.qStart) return;   // 힌트를 눌러 다시 그려도 시계는 이어서 간다 (공짜 시간 방지)
  sess.qStart = Date.now();
  sess.qElapsed = null;
};

/* 답을 고른 순간 레이스 시계를 멈춘다 — 확신도 고르는 시간은 레이스에서 뺀다 */
window.ghostStopClock = function (sess) {
  if (!sess || !sess.myTimes || !sess.qStart) return;
  sess.qElapsed = Date.now() - sess.qStart;
  sess.qStart = 0;
};

/* 채점이 끝난 뒤 — 기본 큐 구간만 기록에 넣는다 (쌍둥이·구조 문제는 제외) */
window.ghostAnswered = function (sess, ok) {
  if (!sess || !sess.myTimes) return;
  window.ghostStopClock(sess);
  if (typeof sess.qElapsed !== 'number') return;
  var dt = sess.qElapsed;
  sess.qElapsed = null;
  if (sess.idx < sess.baseLen) {
    sess.myTimes.push(Math.max(300, Math.min(dt, GHOST_CAP_MS)));
    if (ok) sess.baseCorrect++;
  }
};

function gsum(a) { var t = 0; for (var i = 0; i < a.length; i++) t += a[i]; return t; }

/* 고스트가 elapsed 시점에 몇 번째 문제까지 갔는지 (소수) */
function ghostPos(times, elapsed) {
  var acc = 0;
  for (var i = 0; i < times.length; i++) {
    if (acc + times[i] >= elapsed) return i + (elapsed - acc) / times[i];
    acc += times[i];
  }
  return times.length;
}

/* 레이스 시계 — 해설 읽는 시간은 빼고 문제 푸는 시간만 흐른다 */
function raceElapsed(sess) {
  var pending = sess.qStart ? Date.now() - sess.qStart : (sess.qElapsed || 0);
  return gsum(sess.myTimes) + pending;
}

window.ghostAgo = function (dateStr) {
  var d = Math.round((new Date(todayStr() + 'T00:00:00') - new Date(dateStr + 'T00:00:00')) / 86400000);
  if (d <= 0) return '오늘';
  if (d === 1) return '어제';
  if (d < 7) return d + '일 전';
  if (d < 30) return Math.floor(d / 7) + '주 전';
  return Math.floor(d / 30) + '달 전';
};

function fmtSec(ms) {
  var s = Math.round(ms / 1000);
  var m = Math.floor(s / 60);
  return m ? m + '분 ' + (s % 60) + '초' : s + '초';
}

/* 퀴즈 화면 상단 레이스 바 */
window.ghostBarHtml = function (sess) {
  if (!sess || !sess.ghost || sess.idx >= sess.baseLen) return '';
  return '<div class="ghost-bar">' +
    '<div class="gb-head">' +
    '<span class="gb-who">👻 ' + esc(window.ghostAgo(sess.ghost.date)) + '의 나</span>' +
    '<span class="gb-verdict" id="gbVerdict">나란히</span>' +
    '</div>' +
    '<div class="gb-track">' +
    '<span class="gb-run gb-ghost" id="gbGhost">👻</span>' +
    '<span class="gb-run gb-me" id="gbMe">⚡</span>' +
    '</div></div>';
};

window.ghostTick = function (sess) {
  if (!sess || !sess.ghost) return;
  var me = document.getElementById('gbMe');
  var gh = document.getElementById('gbGhost');
  var vd = document.getElementById('gbVerdict');
  if (!me || !gh) return;
  var n = sess.baseLen;
  var myPos = Math.min(sess.myTimes.length, n);
  var ghPos = Math.min(ghostPos(sess.ghost.times, raceElapsed(sess)), n);
  me.style.left = (myPos / n * 100) + '%';
  gh.style.left = (ghPos / n * 100) + '%';
  if (!vd) return;
  var diff = myPos - ghPos;
  if (diff > 0.2) { vd.textContent = '앞서는 중 🔥'; vd.className = 'gb-verdict ahead'; }
  else if (diff < -0.2) { vd.textContent = '뒤처지는 중'; vd.className = 'gb-verdict behind'; }
  else { vd.textContent = '나란히'; vd.className = 'gb-verdict'; }
};

window.ghostStopTimer = function () {
  if (window.__ghostTimer) { clearInterval(window.__ghostTimer); window.__ghostTimer = null; }
};
window.ghostStartTimer = function (sess) {
  window.ghostStopTimer();
  if (!sess || !sess.ghost) return;
  window.ghostTick(sess);
  window.__ghostTimer = setInterval(function () { window.ghostTick(sess); }, 120);
};

/* 세션 끝 — 판정하고 기록을 갱신한다 */
window.ghostFinish = function (sess) {
  window.ghostStopTimer();
  if (!sess || !sess.baseLen || !sess.myTimes || sess.myTimes.length < sess.baseLen) return '';
  var myMs = gsum(sess.myTimes);
  var myCorrect = sess.baseCorrect || 0;
  var key = window.ghostKey(sess);
  if (!key) return '';
  var prev = sess.ghost;
  var html;

  if (prev) {
    var dMs = prev.durMs - myMs;              // 양수면 내가 더 빠름
    var dC = myCorrect - prev.correct;        // 양수면 내가 더 많이 맞힘
    var won = dC > 0 || (dC === 0 && dMs > 0);
    var ago = window.ghostAgo(prev.date) + '의 나';
    var parts = [];
    if (dC !== 0) parts.push(Math.abs(dC) + '문제');
    if (Math.abs(dMs) >= 1000) parts.push(fmtSec(Math.abs(dMs)));
    var gapWin = parts.length ? parts.join(' · ') + ' 차로 앞섰어요' : '아주 근소한 차이로 앞섰어요';
    var gapLose = parts.length ? parts.join(' · ') + ' 차이예요' : '거의 같은 기록이에요';

    if (won) {
      html = '<div class="ghost-result win">' +
        '<div class="gr-title">🏁 ' + esc(ago) + '를 이겼어요!</div>' +
        '<div class="gr-gap">' + esc(gapWin) + '</div>' +
        '<div class="gr-line">지난 기록 ' + prev.correct + '/' + prev.total + ' · ' + fmtSec(prev.durMs) +
        '<span class="gr-arrow">➜</span>오늘 ' + myCorrect + '/' + sess.baseLen + ' · ' + fmtSec(myMs) + '</div>' +
        '<div class="gr-foot">늘고 있다는 증거예요. 기록을 새로 저장했어요 👻</div>' +
        '</div>';
    } else {
      html = '<div class="ghost-result lose">' +
        '<div class="gr-title">👻 이번엔 ' + esc(ago) + '가 조금 앞섰어요</div>' +
        '<div class="gr-gap">' + esc(gapLose) + '</div>' +
        '<div class="gr-line">지난 기록 ' + prev.correct + '/' + prev.total + ' · ' + fmtSec(prev.durMs) +
        '<span class="gr-arrow">➜</span>오늘 ' + myCorrect + '/' + sess.baseLen + ' · ' + fmtSec(myMs) + '</div>' +
        '<div class="gr-foot">천천히 풀어서 맞히는 게 빨리 틀리는 것보다 나아요. 기록은 그대로 둘게요.</div>' +
        '</div>';
    }
  } else {
    html = '<div class="ghost-result first">' +
      '<div class="gr-title">👻 이번 기록을 저장했어요</div>' +
      '<div class="gr-line">' + myCorrect + '/' + sess.baseLen + ' · ' + fmtSec(myMs) + '</div>' +
      '<div class="gr-foot">다음에 같은 코스를 풀면 <b>지금의 내가</b> 상대로 나타나요.</div>' +
      '</div>';
  }

  // 기록 갱신: 정답 수가 우선, 같으면 빠른 쪽
  S.ghost = S.ghost || {};
  if (!prev || myCorrect > prev.correct || (myCorrect === prev.correct && myMs < prev.durMs)) {
    S.ghost[key] = {
      times: sess.myTimes.slice(), durMs: myMs,
      correct: myCorrect, total: sess.baseLen, date: todayStr()
    };
    saveState();
  }
  return html;
};
