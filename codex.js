/* ===== 📐 공식 도감 — 공식을 게임처럼 수집하며 배우기 ===== */
'use strict';

var codexState = { subj: 'all', q: '' };

function allCards() {
  var out = [];
  ((window.FORMULA_DATA || {}).subjects || []).forEach(function (s) {
    s.cards.forEach(function (c, i) { out.push({ subjKey: s.key, subjName: s.name, idx: i, card: c }); });
  });
  return out;
}
function fCardId(subjKey, idx) { return subjKey + '-' + idx; }
function fLearned(subjKey, idx) { return !!(S.formulaLearned && S.formulaLearned[fCardId(subjKey, idx)]); }
function fLearnedCount() { var n = 0; for (var k in (S.formulaLearned || {})) if (S.formulaLearned[k]) n++; return n; }

/* 공식명 → 실험실 시뮬 매칭 (있으면 "만져보기" 링크) */
function labIdFor(card) {
  var name = (card.name + ' ' + card.formula).toLowerCase();
  var map = [
    ['coulomb', ['쿨롱', 'q₁q₂', 'q1q2']],
    ['ohm', ['옴의 법칙', 'v = i']],
    ['capacitor', ['정전용량', 'c = ε', 'εs/d', 'c=εs']],
    ['transformer', ['권수비', '변압기']],
    ['motor', ['동기속도', 'ns=120', 'ns = 120', '슬립']],
    ['pf', ['역률', 'cosθ', 'tanθ']],
    ['resonance', ['공진', '1/(2π√lc)', '2π√lc']],
    ['resistor', ['병렬 합성', 'r₁r₂', 'r1r2']]
  ];
  for (var i = 0; i < map.length; i++) {
    for (var j = 0; j < map[i][1].length; j++) {
      if (name.indexOf(map[i][1][j]) !== -1) {
        if (window.SIMS && window.SIMS.some(function (s) { return s.id === map[i][0]; })) return map[i][0];
      }
    }
  }
  return null;
}

function cardHtml(item) {
  var c = item.card;
  var learned = fLearned(item.subjKey, item.idx);
  var symbols = c.symbols.map(function (sy) {
    return '<div class="fx-sym"><b>' + esc(sy.sym) + '</b><span>' + esc(sy.mean) + (sy.unit ? ' <em>[' + esc(sy.unit) + ']</em>' : '') + '</span></div>';
  }).join('');
  var steps = (c.example && c.example.steps || []).map(function (st, i) {
    return '<div class="fx-step" data-step="' + i + '">' + esc(st) + '</div>';
  }).join('');
  var variants = (c.variants && c.variants.length) ?
    '<div class="fx-block"><div class="fx-block-t">🔀 이렇게도 써요 (다른 값 구하기)</div>' +
    '<div class="fx-variants">' + c.variants.map(function (vv) { return '<span class="fx-var">' + esc(vv) + '</span>'; }).join('') + '</div></div>' : '';
  var labId = labIdFor(c);
  var labBtn = labId ? '<button class="btn btn-ghost btn-sm" data-flab="' + labId + '">🧪 실험실에서 만져보기</button>' : '';
  var id = fCardId(item.subjKey, item.idx);
  // 각인 등급: 빈칸 조립·복습으로 맞힌 횟수에 따라 동→은→금
  var hits = (S.fxHits && S.fxHits[id]) || 0;
  var rank = hits >= 8 ? { c: 'gold', n: '금', i: '🥇' } : hits >= 3 ? { c: 'silver', n: '은', i: '🥈' } : hits >= 1 ? { c: 'bronze', n: '동', i: '🥉' } : null;
  var myNote = (S.fxNote && S.fxNote[id]) || '';

  return '<details class="fx-card' + (learned ? ' learned' : '') + (rank ? ' rank-' + rank.c : '') + '" data-fx="' + id + '">' +
    '<summary>' +
    '<div class="fx-head">' +
    '<div class="fx-name">' + esc(c.name) + (learned ? ' <span class="fx-check">✅</span>' : '') +
    (rank ? ' <span class="fx-rank">' + rank.i + rank.n + '</span>' : '') + '</div>' +
    '<div class="fx-formula">' + esc(c.formula) + '</div>' +
    '</div>' +
    '<span class="fx-subj">' + esc(item.subjName) + '</span>' +
    '</summary>' +
    '<div class="fx-body">' +
    '<div class="fx-block"><div class="fx-block-t">🔤 기호의 뜻</div><div class="fx-syms">' + symbols + '</div></div>' +
    '<div class="fx-block"><div class="fx-block-t">💡 왜 이렇게 될까?</div><p>' + esc(c.intuition) + '</p></div>' +
    '<div class="fx-block fx-mnemo"><div class="fx-block-t">🎯 외우는 꿀팁</div><p>' + esc(c.mnemonic) + '</p></div>' +
    '<div class="fx-block"><div class="fx-block-t">🧮 예제 <span class="fx-hint">(칸을 누르면 다음 풀이가 나와요)</span></div>' +
    '<div class="fx-given">주어진 값: <b>' + esc(c.example.given) + '</b></div>' +
    '<div class="fx-steps">' + steps + '</div>' +
    '<div class="fx-answer">정답: <b>' + esc(c.example.answer) + '</b></div></div>' +
    variants +
    '<div class="fx-block"><div class="fx-block-t">✍️ 내가 만든 암기법 <span class="fx-hint">(직접 지은 게 제일 잘 외워져요)</span></div>' +
    '<textarea class="fx-note" data-fxnote="' + id + '" placeholder="예) 큐큐는 위, 알제곱은 아래!">' + esc(myNote) + '</textarea></div>' +
    '<div class="fx-actions">' +
    '<button class="btn ' + (learned ? 'btn-ghost' : 'btn-primary') + ' btn-sm" data-flearn="' + id + '">' + (learned ? '✅ 외웠어요 (취소)' : '⭐ 외웠어요!') + '</button>' +
    labBtn +
    '</div>' +
    '</div>' +
    '</details>';
}

function renderCodex() {
  session = null; lessonRun = null;
  var v = $('#view');
  var cards = allCards();
  if (!cards.length) {
    v.innerHTML = '<div class="card loading-bank"><div class="spin">📐</div><h2 style="margin:12px 0 6px">공식 도감을 준비하고 있어요</h2><p class="muted">잠시 후 다시 열어주세요.</p></div>';
    updateBadge();
    return;
  }
  var subjKeys = [];
  cards.forEach(function (c) { if (subjKeys.indexOf(c.subjKey) === -1) subjKeys.push(c.subjKey); });
  var chipList = [{ k: 'all', n: '전체' }].concat(subjKeys.map(function (k) {
    var s = allCards().filter(function (c) { return c.subjKey === k; })[0];
    return { k: k, n: s.subjName };
  }));
  var chips = chipList.map(function (c) {
    return '<button class="chip' + (codexState.subj === c.k ? ' on' : '') + '" data-fchip="' + esc(c.k) + '">' + esc(c.n) + '</button>';
  }).join('');

  var filtered = cards.filter(function (c) {
    if (codexState.subj !== 'all' && c.subjKey !== codexState.subj) return false;
    if (codexState.q) {
      var t = (c.card.name + ' ' + c.card.formula + ' ' + c.subjName).toLowerCase();
      if (t.indexOf(codexState.q.toLowerCase()) === -1) return false;
    }
    return true;
  });
  var total = cards.length;
  var learned = fLearnedCount();
  var listHtml = filtered.length ? filtered.map(cardHtml).join('') : '<div class="empty-note">검색 결과가 없어요.</div>';

  v.innerHTML =
    '<div class="card">' +
    '<b style="font-size:1.05rem">📐 공식 도감</b>' +
    '<p class="muted" style="margin-top:4px">공식을 무서워하지 마세요! 기호의 뜻부터 예제까지, 하나씩 이해하고 "외웠어요"로 수집해요.</p>' +
    '<div class="codex-prog"><div class="codex-prog-bar"><i style="width:' + Math.round(learned / total * 100) + '%"></i></div>' +
    '<span>⭐ ' + learned + ' / ' + total + ' 수집</span></div>' +
    '<div class="dict-tools"><input type="search" id="fxSearch" placeholder="🔍 공식 검색 (예: 옴, 콘덴서, 동기속도...)" value="' + esc(codexState.q) + '"></div>' +
    '<div class="chip-row">' + chips + '</div>' +
    '</div>' +
    '<div id="fxList">' + listHtml + '</div>';

  document.querySelectorAll('[data-fchip]').forEach(function (b) {
    b.onclick = function () { codexState.subj = b.getAttribute('data-fchip'); renderCodex(); };
  });
  $('#fxSearch').oninput = function () { codexState.q = this.value.trim(); rebindCodexList(); };
  bindCodexCards();
  updateBadge();
}

function rebindCodexList() {
  var cards = allCards().filter(function (c) {
    if (codexState.subj !== 'all' && c.subjKey !== codexState.subj) return false;
    if (codexState.q) {
      var t = (c.card.name + ' ' + c.card.formula + ' ' + c.subjName).toLowerCase();
      if (t.indexOf(codexState.q.toLowerCase()) === -1) return false;
    }
    return true;
  });
  $('#fxList').innerHTML = cards.length ? cards.map(cardHtml).join('') : '<div class="empty-note">검색 결과가 없어요.</div>';
  bindCodexCards();
}

function updateCodexProgress() {
  var total = allCards().length;
  var learned = fLearnedCount();
  var bar = document.querySelector('.codex-prog-bar i');
  var span = document.querySelector('.codex-prog span');
  if (bar) bar.style.width = Math.round(learned / total * 100) + '%';
  if (span) span.textContent = '⭐ ' + learned + ' / ' + total + ' 수집';
}

function bindCodexCards() {
  document.querySelectorAll('[data-flearn]').forEach(function (b) {
    b.onclick = function (e) {
      e.preventDefault();
      var id = b.getAttribute('data-flearn');
      S.formulaLearned = S.formulaLearned || {};
      var card = b.closest ? b.closest('.fx-card') : null;
      if (S.formulaLearned[id]) {
        delete S.formulaLearned[id];
        b.textContent = '⭐ 외웠어요!';
        b.className = 'btn btn-primary btn-sm';
        if (card) { card.classList.remove('learned'); var ck = card.querySelector('.fx-check'); if (ck) ck.remove(); }
      } else {
        S.formulaLearned[id] = true; addXP(10); toast('⭐ 공식 수집! 하나씩 내 것이 되고 있어요');
        if (window.dqBump) { dqBump('formula'); }
        if (window.haptic) haptic('ok');
        b.textContent = '✅ 외웠어요 (취소)';
        b.className = 'btn btn-ghost btn-sm';
        if (card) {
          card.classList.add('learned');
          var nameEl = card.querySelector('.fx-name');
          if (nameEl && !nameEl.querySelector('.fx-check')) nameEl.innerHTML += ' <span class="fx-check">✅</span>';
        }
      }
      saveState();
      checkBadges();
      if (window.dqCheckRewards) dqCheckRewards();
      updateCodexProgress();
    };
  });
  document.querySelectorAll('[data-flab]').forEach(function (b) {
    b.onclick = function (e) { e.preventDefault(); if (window.renderSim) window.renderSim(b.getAttribute('data-flab')); };
  });
  // 내가 만든 암기법 저장 (입력할 때마다)
  document.querySelectorAll('[data-fxnote]').forEach(function (ta) {
    ta.onclick = function (e) { e.preventDefault(); };
    ta.oninput = function () {
      S.fxNote = S.fxNote || {};
      var v = ta.value.trim();
      if (v) S.fxNote[ta.getAttribute('data-fxnote')] = v;
      else delete S.fxNote[ta.getAttribute('data-fxnote')];
      saveState();
    };
  });
  // 예제 단계별 공개
  document.querySelectorAll('.fx-steps').forEach(function (box) {
    var steps = box.querySelectorAll('.fx-step');
    steps.forEach(function (s, i) { if (i > 0) s.classList.add('hidden-step'); });
    box.onclick = function (e) {
      e.preventDefault();
      var hidden = box.querySelector('.hidden-step');
      if (hidden) hidden.classList.remove('hidden-step');
    };
  });
}
window.renderCodex = renderCodex;
