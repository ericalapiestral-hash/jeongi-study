/* ===== 🧪 전기 실험실 — 만지면서 이해하는 물리 ===== */
'use strict';

function slRow(id, label, min, max, step, val, unit) {
  return '<div class="sim-row"><label>' + label + '</label>' +
    '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">' +
    '<span class="sim-rv" id="' + id + 'v">' + val + unit + '</span></div>';
}
function gv(id) { return parseFloat(document.getElementById(id).value); }
function setv(id, txt) { document.getElementById(id + 'v').textContent = txt; }
function onInputs(ids, fn) {
  ids.forEach(function (id) { document.getElementById(id).oninput = fn; });
  fn();
}
function fmtN(x, digits) {
  if (x === 0) return '0';
  if (Math.abs(x) >= 1000 || Math.abs(x) < 0.01) return x.toExponential(digits == null ? 2 : digits).replace('e', '×10^').replace('+', '');
  return String(Math.round(x * 1000) / 1000);
}

window.SIMS = [

  /* 1. 쿨롱의 법칙 */
  {
    id: 'coulomb', icon: '⚡', name: '쿨롱의 힘 실험', desc: '전하와 거리를 바꾸면 힘이 어떻게 변할까?',
    render: function (el) {
      el.innerHTML =
        slRow('cQ1', 'Q₁ 전하', 1, 10, 1, 2, ' µC') +
        slRow('cQ2', 'Q₂ 전하', 1, 10, 1, 3, ' µC') +
        slRow('cR', '거리 r', 1, 5, 0.5, 1, ' m') +
        '<div class="sim-row"><label>Q₂ 부호</label><button class="chip on" id="cSign">➖ 음전하 (당김)</button></div>' +
        '<div class="sim-canvas" id="cCanvas"></div>' +
        '<div class="sim-val" id="cOut"></div>' +
        '<div class="sim-note">🔍 <b>관찰 포인트</b>: 거리를 1m→2m로 바꿔보세요. 힘이 정확히 1/4이 되죠? 분모가 r²(제곱)이라서 그래요. 전하를 2배로 하면 힘도 2배 — 분자는 그냥 곱이에요.<br>공식: F = 9×10⁹ × Q₁Q₂ / r²</div>';
      var attract = true;
      function update() {
        var q1 = gv('cQ1'), q2 = gv('cQ2'), r = gv('cR');
        setv('cQ1', q1 + ' µC'); setv('cQ2', q2 + ' µC'); setv('cR', r + ' m');
        var F = 9e9 * q1 * 1e-6 * q2 * 1e-6 / (r * r);
        var gap = 60 + (r - 1) * 55;
        var x1 = 170 - gap / 2, x2 = 170 + gap / 2;
        var s1 = 14 + q1 * 2, s2 = 14 + q2 * 2;
        var a1 = attract ? x1 + s1 + 26 : x1 - s1 - 26;
        var a2 = attract ? x2 - s2 - 26 : x2 + s2 + 26;
        document.getElementById('cCanvas').innerHTML =
          '<svg viewBox="0 0 340 110" style="width:100%;max-width:420px">' +
          '<line x1="' + x1 + '" y1="55" x2="' + x2 + '" y2="55" stroke="#d5dbe8" stroke-dasharray="4 4"/>' +
          '<circle cx="' + x1 + '" cy="55" r="' + s1 + '" fill="#e4574a"/><text x="' + x1 + '" y="60" text-anchor="middle" fill="#fff" font-weight="bold">+</text>' +
          '<circle cx="' + x2 + '" cy="55" r="' + s2 + '" fill="' + (attract ? '#3457d5' : '#e4574a') + '"/><text x="' + x2 + '" y="60" text-anchor="middle" fill="#fff" font-weight="bold">' + (attract ? '−' : '+') + '</text>' +
          '<line x1="' + (x1 + (attract ? s1 : -s1)) + '" y1="55" x2="' + a1 + '" y2="55" stroke="#14915f" stroke-width="3" marker-end="url(#ar)"/>' +
          '<line x1="' + (x2 + (attract ? -s2 : s2)) + '" y1="55" x2="' + a2 + '" y2="55" stroke="#14915f" stroke-width="3" marker-end="url(#ar)"/>' +
          '<defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#14915f"/></marker></defs>' +
          '</svg>';
        document.getElementById('cOut').innerHTML = 'F = 9×10⁹ × ' + q1 + '×10⁻⁶ × ' + q2 + '×10⁻⁶ / ' + r + '² = <b>' + fmtN(F) + ' N</b> (' + (attract ? '서로 당겨요 🧲' : '서로 밀어요 ↔️') + ')';
      }
      document.getElementById('cSign').onclick = function () {
        attract = !attract;
        this.textContent = attract ? '➖ 음전하 (당김)' : '➕ 양전하 (밀침)';
        update();
      };
      onInputs(['cQ1', 'cQ2', 'cR'], update);
    }
  },

  /* 2. 직렬 vs 병렬 */
  {
    id: 'resistor', icon: '🛣️', name: '직렬 vs 병렬 도로', desc: '저항을 잇는 방법에 따라 합성저항이 달라져요',
    render: function (el) {
      el.innerHTML =
        '<div class="sim-row"><label>연결 방법</label><span><button class="chip on" id="rSer">직렬</button> <button class="chip" id="rPar">병렬</button></span></div>' +
        slRow('rR1', 'R₁', 1, 20, 1, 3, ' Ω') +
        slRow('rR2', 'R₂', 1, 20, 1, 6, ' Ω') +
        '<div class="sim-canvas" id="rCanvas"></div>' +
        '<div class="sim-val" id="rOut"></div>' +
        '<div class="sim-note">🔍 <b>관찰 포인트</b>: 병렬로 바꾸면 합성저항이 <b>제일 작은 저항보다도 작아져요</b>. 길이 여러 개면 차가 덜 막히는 원리! 직렬 = 그냥 더하기, 병렬 = 곱을 합으로 나누기.</div>';
      var mode = 'ser';
      function update() {
        var r1 = gv('rR1'), r2 = gv('rR2');
        setv('rR1', r1 + ' Ω'); setv('rR2', r2 + ' Ω');
        var R, formula;
        if (mode === 'ser') {
          R = r1 + r2;
          formula = r1 + ' + ' + r2 + ' = <b>' + fmtN(R) + ' Ω</b>';
          document.getElementById('rCanvas').innerHTML =
            '<svg viewBox="0 0 340 70" style="width:100%;max-width:420px">' +
            '<line x1="10" y1="35" x2="80" y2="35" stroke="#5a6478" stroke-width="2"/>' +
            '<rect x="80" y="23" width="70" height="24" fill="#eaefff" stroke="#3457d5" stroke-width="2" rx="4"/><text x="115" y="40" text-anchor="middle" font-size="13" fill="#24378f">' + r1 + 'Ω</text>' +
            '<line x1="150" y1="35" x2="190" y2="35" stroke="#5a6478" stroke-width="2"/>' +
            '<rect x="190" y="23" width="70" height="24" fill="#eaefff" stroke="#3457d5" stroke-width="2" rx="4"/><text x="225" y="40" text-anchor="middle" font-size="13" fill="#24378f">' + r2 + 'Ω</text>' +
            '<line x1="260" y1="35" x2="330" y2="35" stroke="#5a6478" stroke-width="2"/></svg>';
        } else {
          R = r1 * r2 / (r1 + r2);
          formula = '(' + r1 + '×' + r2 + ') / (' + r1 + '+' + r2 + ') = <b>' + fmtN(R) + ' Ω</b>';
          document.getElementById('rCanvas').innerHTML =
            '<svg viewBox="0 0 340 110" style="width:100%;max-width:420px">' +
            '<line x1="10" y1="55" x2="80" y2="55" stroke="#5a6478" stroke-width="2"/>' +
            '<line x1="80" y1="55" x2="80" y2="25" stroke="#5a6478" stroke-width="2"/><line x1="80" y1="55" x2="80" y2="85" stroke="#5a6478" stroke-width="2"/>' +
            '<line x1="80" y1="25" x2="120" y2="25" stroke="#5a6478" stroke-width="2"/><line x1="80" y1="85" x2="120" y2="85" stroke="#5a6478" stroke-width="2"/>' +
            '<rect x="120" y="13" width="70" height="24" fill="#eaefff" stroke="#3457d5" stroke-width="2" rx="4"/><text x="155" y="30" text-anchor="middle" font-size="13" fill="#24378f">' + r1 + 'Ω</text>' +
            '<rect x="120" y="73" width="70" height="24" fill="#eaefff" stroke="#3457d5" stroke-width="2" rx="4"/><text x="155" y="90" text-anchor="middle" font-size="13" fill="#24378f">' + r2 + 'Ω</text>' +
            '<line x1="190" y1="25" x2="230" y2="25" stroke="#5a6478" stroke-width="2"/><line x1="190" y1="85" x2="230" y2="85" stroke="#5a6478" stroke-width="2"/>' +
            '<line x1="230" y1="25" x2="230" y2="85" stroke="#5a6478" stroke-width="2"/>' +
            '<line x1="230" y1="55" x2="330" y2="55" stroke="#5a6478" stroke-width="2"/></svg>';
        }
        document.getElementById('rOut').innerHTML = '합성저항 R = ' + formula;
      }
      document.getElementById('rSer').onclick = function () { mode = 'ser'; this.classList.add('on'); document.getElementById('rPar').classList.remove('on'); update(); };
      document.getElementById('rPar').onclick = function () { mode = 'par'; this.classList.add('on'); document.getElementById('rSer').classList.remove('on'); update(); };
      onInputs(['rR1', 'rR2'], update);
    }
  },

  /* 3. 평행판 콘덴서 */
  {
    id: 'capacitor', icon: '🥪', name: '콘덴서 만들기', desc: '판을 넓히고 좁히면 용량이 어떻게 변할까?',
    render: function (el) {
      el.innerHTML =
        slRow('pS', '극판 면적 S', 1, 10, 1, 4, '') +
        slRow('pD', '극판 간격 d', 1, 10, 1, 4, '') +
        slRow('pE', '비유전율 εr', 1, 10, 1, 1, '') +
        '<div class="sim-canvas" id="pCanvas"></div>' +
        '<div class="sim-val" id="pOut"></div>' +
        '<div class="sim-note">🔍 <b>관찰 포인트</b>: 면적을 2배 → 용량 2배(비례). 간격을 2배 → 용량 절반(반비례). 유전체(εr)를 넣으면 그만큼 배로 커져요.<br>공식: C = εS/d — S는 분자, d는 분모!</div>';
      function update() {
        var s = gv('pS'), d = gv('pD'), e = gv('pE');
        setv('pS', s + ''); setv('pD', d + ''); setv('pE', e + (e === 1 ? ' (공기)' : ''));
        var C = e * s / d;
        var w = 60 + s * 18, gap = 8 + d * 5;
        var y1 = 55 - gap / 2 - 8, y2 = 55 + gap / 2;
        document.getElementById('pCanvas').innerHTML =
          '<svg viewBox="0 0 340 110" style="width:100%;max-width:420px">' +
          '<rect x="' + (170 - w / 2) + '" y="' + (y1 + 8 - 8) + '" width="' + w + '" height="8" fill="#e4574a" rx="2"/>' +
          '<rect x="' + (170 - w / 2) + '" y="' + y2 + '" width="' + w + '" height="8" fill="#3457d5" rx="2"/>' +
          (e > 1 ? '<rect x="' + (170 - w / 2) + '" y="' + y1 + 8 + '" width="' + w + '" height="' + gap + '" fill="#f5b301" opacity="' + (0.1 + e * 0.06) + '"/>' : '') +
          '<text x="170" y="20" text-anchor="middle" font-size="11" fill="#8b93a7">면적 ' + s + ' · 간격 ' + d + (e > 1 ? ' · 유전체 εr=' + e : ' · 공기') + '</text>' +
          '</svg>';
        document.getElementById('pOut').innerHTML = 'C = εr×S/d = ' + e + '×' + s + '/' + d + ' → 기본 콘덴서의 <b>' + fmtN(C) + '배</b> 용량';
      }
      onInputs(['pS', 'pD', 'pE'], update);
    }
  },

  /* 4. 옴의 법칙 전구 */
  {
    id: 'ohm', icon: '💡', name: '옴의 법칙 전구', desc: '전압과 저항으로 전류(밝기)를 조절해봐요',
    render: function (el) {
      el.innerHTML =
        slRow('oV', '전압 V', 10, 220, 10, 100, ' V') +
        slRow('oR', '저항 R', 10, 500, 10, 100, ' Ω') +
        '<div class="sim-canvas" style="text-align:center"><div id="oBulb" style="font-size:70px;transition:all .2s">💡</div></div>' +
        '<div class="sim-val" id="oOut"></div>' +
        '<div class="sim-note">🔍 <b>관찰 포인트</b>: 전압을 올리면 밝아지고(전류 증가), 저항을 올리면 어두워져요(전류 감소). I = V/R — 전압은 미는 힘, 저항은 방해꾼!</div>';
      function update() {
        var V = gv('oV'), R = gv('oR');
        setv('oV', V + ' V'); setv('oR', R + ' Ω');
        var I = V / R;
        var b = Math.min(1, I / 2.2);
        var bulb = document.getElementById('oBulb');
        bulb.style.opacity = 0.25 + b * 0.75;
        bulb.style.filter = 'drop-shadow(0 0 ' + Math.round(b * 28) + 'px rgba(245,179,1,' + (0.3 + b * 0.7) + '))';
        bulb.style.transform = 'scale(' + (0.8 + b * 0.45) + ')';
        document.getElementById('oOut').innerHTML = 'I = V/R = ' + V + '/' + R + ' = <b>' + fmtN(I) + ' A</b>';
      }
      onInputs(['oV', 'oR'], update);
    }
  },

  /* 5. 변압기 */
  {
    id: 'transformer', icon: '🔁', name: '변압기 놀이', desc: '코일 감은 수로 전압을 바꿔봐요',
    render: function (el) {
      el.innerHTML =
        slRow('tN1', '1차 권수 N₁', 100, 1000, 100, 200, '회') +
        slRow('tN2', '2차 권수 N₂', 100, 1000, 100, 600, '회') +
        '<div class="sim-canvas" id="tCanvas"></div>' +
        '<div class="sim-val" id="tOut"></div>' +
        '<div class="sim-note">🔍 <b>관찰 포인트</b>: 2차를 더 많이 감으면 전압이 올라가요(승압), 적게 감으면 내려가요(강압). V₂/V₁ = N₂/N₁ — 전압은 감은 수에 비례! (전류는 반대로 반비례)</div>';
      function update() {
        var n1 = gv('tN1'), n2 = gv('tN2'), V1 = 220;
        setv('tN1', n1 + '회'); setv('tN2', n2 + '회');
        var V2 = V1 * n2 / n1;
        var c1 = Math.max(2, Math.round(n1 / 200)), c2 = Math.max(2, Math.round(n2 / 200));
        var coils1 = '', coils2 = '';
        for (var i = 0; i < c1; i++) coils1 += '<circle cx="120" cy="' + (30 + i * 50 / c1) + '" r="9" fill="none" stroke="#e4574a" stroke-width="3"/>';
        for (var j = 0; j < c2; j++) coils2 += '<circle cx="220" cy="' + (30 + j * 50 / c2) + '" r="9" fill="none" stroke="#3457d5" stroke-width="3"/>';
        document.getElementById('tCanvas').innerHTML =
          '<svg viewBox="0 0 340 110" style="width:100%;max-width:420px">' +
          '<rect x="150" y="10" width="40" height="90" fill="#c8cfdd" rx="4"/>' + coils1 + coils2 +
          '<text x="120" y="100" text-anchor="middle" font-size="11" fill="#e4574a">1차 220V</text>' +
          '<text x="220" y="100" text-anchor="middle" font-size="11" fill="#3457d5">2차 ' + Math.round(V2) + 'V</text></svg>';
        document.getElementById('tOut').innerHTML = 'V₂ = 220 × ' + n2 + '/' + n1 + ' = <b>' + Math.round(V2) + ' V</b> ' + (V2 > 220 ? '(승압 ⬆️)' : V2 < 220 ? '(강압 ⬇️)' : '(그대로)');
      }
      onInputs(['tN1', 'tN2'], update);
    }
  },

  /* 6. 회전하는 모터 */
  {
    id: 'motor', icon: '🌀', name: '동기속도 팬 돌리기', desc: '극수와 주파수로 회전 속도가 정해져요',
    render: function (el) {
      el.innerHTML =
        '<div class="sim-row"><label>극수 p</label><span id="mPoles"><button class="chip" data-p="2">2극</button> <button class="chip on" data-p="4">4극</button> <button class="chip" data-p="6">6극</button> <button class="chip" data-p="8">8극</button></span></div>' +
        '<div class="sim-row"><label>주파수 f</label><span id="mFreq"><button class="chip on" data-f="60">60Hz</button> <button class="chip" data-f="50">50Hz</button></span></div>' +
        slRow('mS', '슬립 s (유도전동기)', 0, 10, 1, 4, ' %') +
        '<div class="sim-canvas" style="text-align:center"><div id="mFan" style="font-size:70px;display:inline-block">🌀</div></div>' +
        '<div class="sim-val" id="mOut"></div>' +
        '<div class="sim-note">🔍 <b>관찰 포인트</b>: 극수가 많을수록 천천히, 주파수가 높을수록 빨리 돌아요. Ns = 120f/p. 유도전동기는 슬립만큼 살짝 늦게 돌아요: N = (1−s)Ns. 60Hz 세트: 2극 3600 · 4극 1800 · 6극 1200 · 8극 900rpm!</div>';
      var p = 4, f = 60;
      function update() {
        var s = gv('mS');
        setv('mS', s + ' %');
        var Ns = 120 * f / p;
        var N = Math.round((1 - s / 100) * Ns);
        var fan = document.getElementById('mFan');
        fan.style.animation = 'none';
        void fan.offsetWidth;
        fan.style.animation = 'spin ' + (50 * 60 / Math.max(N, 1)) + 's linear infinite';
        document.getElementById('mOut').innerHTML =
          '동기속도 Ns = 120×' + f + '/' + p + ' = <b>' + Ns + ' rpm</b>' +
          (s > 0 ? ' · 회전자 속도 N = (1−' + (s / 100) + ')×' + Ns + ' = <b>' + N + ' rpm</b>' : ' (슬립 0 = 동기전동기)');
      }
      document.querySelectorAll('#mPoles .chip').forEach(function (b) {
        b.onclick = function () {
          document.querySelectorAll('#mPoles .chip').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on'); p = parseInt(b.getAttribute('data-p'), 10); update();
        };
      });
      document.querySelectorAll('#mFreq .chip').forEach(function (b) {
        b.onclick = function () {
          document.querySelectorAll('#mFreq .chip').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on'); f = parseInt(b.getAttribute('data-f'), 10); update();
        };
      });
      onInputs(['mS'], update);
    }
  },

  /* 7. 역률 삼각형 */
  {
    id: 'pf', icon: '📐', name: '역률 삼각형', desc: '위상각이 커지면 낭비되는 전력이 늘어나요',
    render: function (el) {
      el.innerHTML =
        slRow('fTh', '위상각 θ', 0, 80, 5, 35, '°') +
        '<div class="sim-canvas" id="fCanvas"></div>' +
        '<div class="sim-val" id="fOut"></div>' +
        '<div class="sim-note">🔍 <b>관찰 포인트</b>: θ가 커질수록 세로(무효전력 Q)가 길어지고 역률이 나빠져요. 역률 개선 = 콘덴서로 Q를 상쇄해서 θ를 줄이는 것! P=S·cosθ(일하는 전력), Q=S·sinθ(왔다갔다만 하는 전력).</div>';
      function update() {
        var th = gv('fTh');
        setv('fTh', th + '°');
        var rad = th * Math.PI / 180, Skva = 10;
        var P = Skva * Math.cos(rad), Q = Skva * Math.sin(rad);
        var px = 40 + P * 22, qy = 190 - Q * 16;
        document.getElementById('fCanvas').innerHTML =
          '<svg viewBox="0 0 340 210" style="width:100%;max-width:420px">' +
          '<line x1="40" y1="190" x2="' + px + '" y2="190" stroke="#14915f" stroke-width="5"/>' +
          '<line x1="' + px + '" y1="190" x2="' + px + '" y2="' + qy + '" stroke="#e4574a" stroke-width="5"/>' +
          '<line x1="40" y1="190" x2="' + px + '" y2="' + qy + '" stroke="#3457d5" stroke-width="5"/>' +
          '<text x="' + ((40 + px) / 2) + '" y="206" text-anchor="middle" font-size="12" fill="#14915f">유효전력 P=' + fmtN(P, 1) + 'kW</text>' +
          '<text x="' + (px + 8) + '" y="' + ((190 + qy) / 2) + '" font-size="12" fill="#e4574a">무효 Q=' + fmtN(Q, 1) + 'kvar</text>' +
          '<text x="' + ((40 + px) / 2 - 20) + '" y="' + ((190 + qy) / 2 - 8) + '" font-size="12" fill="#3457d5">피상 S=10kVA</text>' +
          '</svg>';
        document.getElementById('fOut').innerHTML = '역률 cosθ = cos' + th + '° = <b>' + fmtN(Math.cos(rad), 2) + '</b>' + (th <= 25 ? ' — 아주 좋아요! ✨' : th <= 50 ? ' — 보통이에요' : ' — 나빠요, 콘덴서가 필요해요! ⚠️');
      }
      onInputs(['fTh'], update);
    }
  },

  /* 8. RLC 공진 */
  {
    id: 'resonance', icon: '🎯', name: '공진 주파수 찾기', desc: 'XL과 XC가 같아지는 순간을 찾아봐요',
    render: function (el) {
      el.innerHTML =
        slRow('zF', '주파수 f', 10, 200, 2, 30, ' Hz') +
        '<div class="sim-canvas" id="zCanvas"></div>' +
        '<div class="sim-val" id="zOut"></div>' +
        '<div class="sim-note">🔍 <b>관찰 포인트</b>: 주파수를 천천히 올리면 XL(=2πfL)은 커지고 XC(=1/2πfC)는 작아져요. 두 막대가 같아지는 순간이 <b>공진</b> — 서로 상쇄되어 전류가 최대! 공식: f₀ = 1/(2π√LC)</div>';
      var L = 0.1, C = 100e-6, R = 10, V = 100;
      var f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
      function update() {
        var f = gv('zF');
        setv('zF', f + ' Hz');
        var XL = 2 * Math.PI * f * L, XC = 1 / (2 * Math.PI * f * C);
        var Z = Math.sqrt(R * R + Math.pow(XL - XC, 2));
        var I = V / Z;
        var near = Math.abs(XL - XC) < 6;
        var hL = Math.min(150, XL), hC = Math.min(150, XC);
        document.getElementById('zCanvas').innerHTML =
          '<svg viewBox="0 0 340 190" style="width:100%;max-width:420px">' +
          '<rect x="70" y="' + (170 - hL) + '" width="60" height="' + hL + '" fill="#3457d5" rx="4"/>' +
          '<rect x="210" y="' + (170 - hC) + '" width="60" height="' + hC + '" fill="#e4574a" rx="4"/>' +
          '<text x="100" y="185" text-anchor="middle" font-size="12" fill="#3457d5">XL=' + fmtN(XL, 1) + 'Ω</text>' +
          '<text x="240" y="185" text-anchor="middle" font-size="12" fill="#e4574a">XC=' + fmtN(XC, 1) + 'Ω</text>' +
          (near ? '<text x="170" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#14915f">🎉 공진! 전류 최대!</text>' : '') +
          '</svg>';
        document.getElementById('zOut').innerHTML = '임피던스 Z = ' + fmtN(Z, 1) + 'Ω → 전류 I = <b>' + fmtN(I, 1) + ' A</b>' +
          ' <span class="muted">(공진 주파수 f₀ ≈ ' + fmtN(f0, 1) + ' Hz)</span>';
      }
      onInputs(['zF'], update);
    }
  }
];

/* ---------- 실험실 화면 ---------- */
window.renderLab = function () {
  session = null; lessonRun = null;
  var v = $('#view');
  var cards = window.SIMS.map(function (s) {
    var seen = S.labSeen[s.id];
    return '<div class="sim-card' + (seen ? ' seen' : '') + '" data-sim="' + s.id + '">' +
      '<div class="sim-icon">' + s.icon + '</div>' +
      '<div><div class="sim-name">' + esc(s.name) + (seen ? ' <span class="muted">✓</span>' : '') + '</div>' +
      '<div class="sim-desc">' + esc(s.desc) + '</div></div></div>';
  }).join('');
  v.innerHTML =
    '<div class="card"><b style="font-size:1.05rem">🧪 전기 실험실</b>' +
    '<p class="muted" style="margin-top:4px">공식을 외우기 전에 먼저 만져보세요. 슬라이더를 움직이면 물리가 눈에 보여요! (처음 여는 실험마다 +5 XP)</p></div>' +
    '<div class="sim-grid">' + cards + '</div>';
  document.querySelectorAll('[data-sim]').forEach(function (c) {
    c.onclick = function () { window.renderSim(c.getAttribute('data-sim')); };
  });
  updateBadge();
};

window.renderSim = function (id) {
  var sim = null;
  window.SIMS.forEach(function (s) { if (s.id === id) sim = s; });
  if (!sim) { window.renderLab(); return; }
  if (!S.labSeen[id]) {
    S.labSeen[id] = true;
    saveState();
    addXP(5);
    checkBadges();
  }
  var v = $('#view');
  v.innerHTML =
    '<div class="quiz-head"><span class="quiz-mode">🧪 ' + esc(sim.name) + '</span>' +
    '<button class="btn btn-ghost btn-sm" id="labBack">← 실험실</button></div>' +
    '<div class="card"><div id="simBody"></div></div>';
  $('#labBack').onclick = window.renderLab;
  sim.render(document.getElementById('simBody'));
  window.scrollTo(0, 0);
};
