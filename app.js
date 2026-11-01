(function () {
  var app = document.getElementById("app");
  var K_WRONG = "eq-wrongs";

  // ---------- 공통 도구 ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function reEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function norm(s) {
    return String(s).trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[.!?]+$/, "").replace(/\s+/g, " ");
  }
  function speak(text) {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US"; u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function lsGet(k, fallback) {
    try { var v = localStorage.getItem(k); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  // 예전 버전에서 브라우저에 저장했던 API 키·설정을 지운다.
  ["eq-gemini-key", "eq-gemini-model", "eq-sets"].forEach(lsDel);
  function loadJson(k) { try { return JSON.parse(lsGet(k, "[]")) || []; } catch (e) { return []; } }
  function choicesFor(correct, pool, n) {
    var others = shuffle(pool.filter(function (x, i, arr) { return x !== correct && arr.indexOf(x) === i; }));
    return shuffle([correct].concat(others.slice(0, n - 1)));
  }

  // ---------- 세트 ----------
  // data/*.js 파일이 window.DATA.<id> 로 등록한 학습지를 그대로 목록으로 쓴다.
  function allSets() {
    return Object.keys(window.DATA).map(function (id) { return Object.assign({ id: id }, window.DATA[id]); });
  }
  function getSet(id) {
    var s = allSets().filter(function (x) { return x.id === id; })[0];
    return s || allSets()[0];
  }

  // ---------- 문제 만들기 ----------
  function wordsOf(S) { return S.words || []; }
  function koPool(S) { return wordsOf(S).map(function (w) { return w.ko; }); }
  function inEx(w) {
    if (!w.ex) return null;
    var re = new RegExp("\\b" + reEsc(w.en) + "\\b", "gi");
    return re.test(w.ex) ? new RegExp("\\b" + reEsc(w.en) + "\\b", "gi") : null;
  }

  function qEn2Ko(S) {
    return wordsOf(S).map(function (w) {
      return { id: S.id + "|en2ko|" + w.en, kind: "choice", head: "영어 → 뜻", html: esc(w.en), big: true,
        choices: choicesFor(w.ko, koPool(S), 4), correct: w.ko, show: w.ko,
        explain: [w.note, w.ex, w.exKo].filter(Boolean).join(" · ") };
    });
  }
  function qListen(S) {
    return wordsOf(S).map(function (w) {
      return { id: S.id + "|listen|" + w.en, kind: "choice", head: "듣고 뜻 고르기", html: "🔊 단어를 듣고 뜻을 고르세요", speak: w.en,
        choices: choicesFor(w.ko, koPool(S), 4), correct: w.ko, show: w.en + " = " + w.ko, explain: w.note };
    });
  }
  function qKo2En(S) {
    return wordsOf(S).map(function (w) {
      return { id: S.id + "|ko2en|" + w.en, kind: "type", head: "뜻 → 영어 쓰기", html: esc(w.ko), big: true,
        hint: w.en.charAt(0) + " " + w.en.slice(1).replace(/[a-z]/gi, "_").split("").join(" ") + "  (" + w.en.length + "글자)",
        answers: [w.en], show: w.en, explain: w.note };
    });
  }
  function qScramble(S) {
    return wordsOf(S).filter(function (w) { return /^[a-z]{3,}$/i.test(w.en); }).map(function (w) {
      var letters = w.en.split(""), s = letters;
      for (var i = 0; i < 10 && s.join("") === w.en; i++) s = shuffle(letters);
      return { id: S.id + "|scr|" + w.en, kind: "type", head: "철자 배열", html: esc(s.join(" ")), big: true,
        hint: w.ko, answers: [w.en], show: w.en, explain: w.note };
    });
  }
  function qCloze(S) {
    return wordsOf(S).filter(inEx).map(function (w) {
      return { id: S.id + "|cloze|" + w.en, kind: "type", head: "예문 빈칸", html: esc(w.ex.replace(inEx(w), "____")), sent: true,
        hint: w.exKo, answers: [w.en], show: w.en, explain: w.ko };
    });
  }
  function qRel(S) {
    var pool = [], out = [];
    wordsOf(S).forEach(function (w) { pool = pool.concat(w.syn || [], w.ant || []); });
    wordsOf(S).forEach(function (w) {
      var banned = (w.syn || []).concat(w.ant || []);
      var others = pool.filter(function (x) { return banned.indexOf(x) < 0; });
      var info = "≒ " + ((w.syn || []).join(", ") || "—") + "  ↔ " + ((w.ant || []).join(", ") || "—");
      [["syn", "비슷한 말 (≒)", "의 비슷한 말은?"], ["ant", "반대말 (↔)", "의 반대말은?"]].forEach(function (t) {
        var list = w[t[0]];
        if (!list || !list.length) return;
        var a = list[Math.floor(Math.random() * list.length)];
        var ch = choicesFor(a, others.concat([a]), 4);
        if (ch.length < 3) return;
        out.push({ id: S.id + "|" + t[0] + "|" + w.en, kind: "choice", head: t[1], html: esc(w.en) + " " + t[2], big: true,
          choices: ch, correct: a, show: a, explain: info });
      });
    });
    return out;
  }
  function qForms(S) {
    return (S.forms || []).map(function (f, i) {
      return { id: S.id + "|form|" + i, kind: "type", head: "단어 변화·관련어", html: esc(f.q), sent: true,
        answers: f.a, show: f.a.join(" / ") };
    });
  }
  function qContext(S) {
    return (S.context || []).map(function (c, i) {
      var html = esc(c.s).replace(new RegExp("\\b" + reEsc(c.w) + "\\b"), '<span class="mark">' + esc(c.w) + "</span>");
      return { id: S.id + "|ctx|" + i, kind: "choice", head: "문맥 속 뜻 (밑줄 단어의 뜻은?)", html: html, sent: true,
        choices: shuffle(c.c), correct: c.a, show: c.a };
    });
  }
  function qWriting(S) {
    return (S.writing || []).map(function (x, i) {
      return { id: S.id + "|wr|" + i, kind: "self", head: "영작 (직접 써 보고 정답과 비교)", html: esc(x.ko), sent: true, show: x.en };
    });
  }
  function qSentence(S) {
    return (S.cloze || []).map(function (c, i) {
      return { id: S.id + "|sent|" + i, kind: "type", head: "문장 빈칸 채우기", html: esc(c.s), sent: true,
        hint: c.ko, answers: c.a, show: c.a.join(" / ") };
    });
  }

  function has4(S) { return wordsOf(S).length >= 4; }
  var MODES = [
    { id: "mix", label: "종합", desc: "여러 유형을 섞어서", need: function (S) { return has4(S); }, make: function (S) {
        return [].concat(qEn2Ko(S), qKo2En(S), qCloze(S), qRel(S), qForms(S), qContext(S)); } },
    { id: "en2ko", label: "영어 → 뜻", desc: "4지선다", need: has4, make: qEn2Ko },
    { id: "ko2en", label: "뜻 → 영어 쓰기", desc: "철자까지 정확히", need: function (S) { return wordsOf(S).length > 0; }, make: qKo2En },
    { id: "listen", label: "듣고 뜻 고르기", desc: "발음 듣기", need: has4, make: qListen },
    { id: "scramble", label: "철자 배열", desc: "섞인 알파벳 맞추기", need: function (S) { return qScramble(S).length > 0; }, make: qScramble },
    { id: "cloze", label: "예문 빈칸", desc: "예문에서 단어 가리기", need: function (S) { return qCloze(S).length > 0; }, make: qCloze },
    { id: "rel", label: "비슷한 말·반대말", desc: "정리 노트 내용", need: function (S) { return qRel(S).length > 0; }, make: qRel },
    { id: "forms", label: "단어 변화·관련어", desc: "paid, swept, laid…", need: function (S) { return !!S.forms; }, make: qForms },
    { id: "ctx", label: "문맥 속 뜻", desc: "laid, station, design…", need: function (S) { return !!S.context; }, make: qContext },
    { id: "writing", label: "영작", desc: "써 보고 스스로 채점", need: function (S) { return !!S.writing; }, make: qWriting },
    { id: "sent", label: "문장 빈칸 채우기", desc: "해석을 보고 단어 쓰기", need: function (S) { return !!(S.cloze && S.cloze.length); }, make: qSentence }
  ];

  // ---------- 화면: 홈 ----------
  var count = 10;
  var curSet = "day16";
  var run = null;

  function home() {
    run = null;
    var sets = allSets(), S = getSet(curSet);
    curSet = S.id;
    var wrongs = loadJson(K_WRONG), due = dueList(wrongs);
    var h = '<h1>영단어 퀴즈</h1><p class="sub">학습지로 만든 퀴즈예요. 풀 때마다 순서와 보기가 새로 섞여요.</p>';
    if (due.length) {
      h += '<button class="primary" style="width:100%" data-mode="review">📅 오늘 복습할 문제 ' + due.length + "개 풀기</button>";
    } else if (wrongs.length) {
      h += '<p class="sub">📅 오늘 복습할 문제는 없어요. 다음 복습: ' + nextDueText(wrongs) + "</p>";
    }
    h += "<h2>학습지 고르기</h2><div class=\"row chips\">";
    sets.forEach(function (s) {
      h += '<button data-set="' + esc(s.id) + '" class="' + (s.id === S.id ? "sel" : "") + '">' + esc(s.title) + "</button>";
    });
    h += "</div>";
    h += '<h2>문제 수</h2><div class="row chips">';
    [10, 20, 0].forEach(function (n) {
      h += '<button data-count="' + n + '" class="' + (count === n ? "sel" : "") + '">' + (n || "전체") + "</button>";
    });
    h += "</div><h2>유형 고르기</h2><div class=\"grid\">";
    MODES.forEach(function (m) {
      if (!m.need(S)) return;
      h += '<button data-mode="' + m.id + '">' + esc(m.label) + "<small>" + esc(m.desc) + "</small></button>";
    });
    h += "</div>";
    h += '<h2>오답 노트</h2><button data-mode="wrongsAll"' + (wrongs.length ? "" : " disabled") + ">저장된 오답 전부 풀기<small>"
      + wrongs.length + "문제 저장됨 · 틀린 문제는 1일, 3일, 7일 뒤에 복습 목록에 나와요</small></button>";
    app.innerHTML = h;
    app.querySelectorAll("[data-set]").forEach(function (b) { b.onclick = function () { curSet = b.dataset.set; home(); }; });
    app.querySelectorAll("[data-count]").forEach(function (b) { b.onclick = function () { count = +b.dataset.count; home(); }; });
    app.querySelectorAll("[data-mode]").forEach(function (b) { b.onclick = function () { start(b.dataset.mode); }; });
  }

  // ---------- 화면: 퀴즈 ----------
  // retryQs가 있으면 방금 틀린 문제만 다시 푼다 (복습 일정에는 반영하지 않는다).
  function start(modeId, retryQs) {
    var qs;
    if (retryQs || modeId === "review" || modeId === "wrongsAll") {
      var src = retryQs || (modeId === "review" ? dueList(loadJson(K_WRONG)) : loadJson(K_WRONG));
      qs = shuffle(src).map(function (q) { return Object.assign({}, q); });
      qs.forEach(function (q) { if (q.kind === "choice") q.choices = shuffle(q.choices); });
    } else {
      var m = MODES.filter(function (x) { return x.id === modeId; })[0];
      qs = shuffle(m.make(getSet(curSet)));
    }
    if (count && !retryQs) qs = qs.slice(0, count);
    if (!qs.length) return home();
    run = { mode: modeId, qs: qs, i: 0, results: [], noRecord: !!retryQs };
    show();
  }

  // ---------- 복습 일정 (1일 → 3일 → 7일 뒤) ----------
  var DAY = 86400000, STEPS = [1, 3, 7];
  function dueList(wrongs) {
    var now = Date.now();
    return wrongs.filter(function (w) { return (w.due || 0) <= now; });
  }
  function nextDueText(wrongs) {
    var t = Math.min.apply(null, wrongs.map(function (w) { return w.due || 0; }));
    var days = Math.max(1, Math.ceil((t - Date.now()) / DAY));
    return days + "일 뒤";
  }
  function recordResults(results) {
    var wrongs = loadJson(K_WRONG), now = Date.now();
    results.forEach(function (r) {
      var old = wrongs.filter(function (w) { return w.id === r.q.id; })[0];
      if (!r.ok) {
        wrongs = wrongs.filter(function (w) { return w.id !== r.q.id; });
        wrongs.push(Object.assign({}, r.q, { step: 0, due: now + STEPS[0] * DAY }));
      } else if (old && (old.due || 0) <= now) {
        var step = (old.step || 0) + 1;
        wrongs = wrongs.filter(function (w) { return w.id !== r.q.id; });
        if (step < STEPS.length) wrongs.push(Object.assign({}, old, { step: step, due: now + STEPS[step] * DAY }));
      }
    });
    lsSet(K_WRONG, JSON.stringify(wrongs));
  }

  // 철자가 한 글자만 다른지 확인 (정답 처리는 하지 않고 알려 주기만 한다).
  function oneOff(a, b) {
    if (Math.abs(a.length - b.length) > 1 || a === b) return false;
    var i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
    var s = a.length < b.length ? a : b, l = a.length < b.length ? b : a;
    return s.slice(i) === l.slice(i + 1);
  }

  function show() {
    var q = run.qs[run.i], n = run.qs.length;
    var h = '<div class="top"><span>' + (run.i + 1) + " / " + n + '</span><button class="link" id="quit">그만하기</button></div>';
    h += '<div class="bar"><i style="width:' + (run.i / n * 100) + '%"></i></div>';
    h += '<div class="card"><div class="hint">' + esc(q.head) + "</div>";
    h += '<div class="q' + (q.sent ? " sent" : "") + '">' + q.html + "</div>";
    if (q.speak) h += '<button id="again">🔊 다시 듣기</button>';
    if (q.hint) h += '<div class="hint" style="margin-top:8px">' + esc(q.hint) + "</div>";
    if (q.kind === "choice") {
      h += '<div class="choices">';
      q.choices.forEach(function (c, k) { h += '<button data-c="' + k + '">' + (k + 1) + ". " + esc(c) + "</button>"; });
      h += "</div>";
    } else if (q.kind === "type") {
      h += '<input type="text" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="정답 입력 후 Enter">';
      h += '<button class="primary next" id="submit">확인</button>';
    } else {
      h += '<input type="text" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="영어 문장을 써 보세요">';
      h += '<button class="primary next" id="reveal">정답 보기</button>';
    }
    h += '<div id="fb"></div></div>';
    app.innerHTML = h;

    document.getElementById("quit").onclick = function () { if (confirm("퀴즈를 그만할까요?")) finish(); };
    if (q.speak) {
      document.getElementById("again").onclick = function () { speak(q.speak); };
      speak(q.speak);
    }
    var done = false;

    function feedback(ok, given, praise, note) {
      done = true;
      run.results.push({ q: q, ok: ok, given: given });
      var fb = document.getElementById("fb");
      fb.className = "fb " + (ok ? "ok" : "no");
      fb.innerHTML = "<b>" + (ok ? (praise || "정답!") : (note ? "아깝다! 오답이에요" : "오답")) + "</b>"
        + (note ? "<div>" + esc(note) + "</div>" : "")
        + (ok && q.kind !== "self" ? "" : "<div>정답: " + esc(q.show) + "</div>")
        + (q.explain ? "<span>" + esc(q.explain) + "</span>" : "")
        + '<button class="primary next" id="next">' + (run.i + 1 < n ? "다음 (Enter)" : "결과 보기 (Enter)") + "</button>";
      document.getElementById("next").onclick = next;
      document.getElementById("next").focus();
    }
    function next() { run.i++; if (run.i < n) show(); else finish(); }

    if (q.kind === "choice") {
      var btns = app.querySelectorAll("[data-c]");
      var pick = function (k) {
        if (done) return;
        var c = q.choices[k];
        btns.forEach(function (b, bi) {
          b.disabled = true;
          if (q.choices[bi] === q.correct) b.classList.add("ok");
          else if (bi === k) b.classList.add("no");
        });
        feedback(c === q.correct, c);
      };
      btns.forEach(function (b, k) { b.onclick = function () { pick(k); }; });
      run.key = function (e) {
        if (done) { if (e.key === "Enter") next(); return; }
        var k = parseInt(e.key, 10) - 1;
        if (k >= 0 && k < q.choices.length) pick(k);
      };
    } else if (q.kind === "type") {
      var input = document.getElementById("ans");
      input.focus();
      var submit = function () {
        if (done) return;
        var v = input.value;
        if (!norm(v)) return;
        input.disabled = true;
        document.getElementById("submit").style.display = "none";
        var ok = q.answers.some(function (a) { return norm(a) === norm(v); });
        var near = !ok && q.answers.some(function (a) { return a.length >= 4 && oneOff(norm(v), norm(a)); });
        feedback(ok, v, null, near ? "한 글자만 달라요. 시험에서는 틀린 걸로 쳐요." : null);
      };
      document.getElementById("submit").onclick = submit;
      run.key = function (e) { if (e.key === "Enter") { if (done) next(); else submit(); } };
    } else {
      var inp = document.getElementById("ans"), revealed = false;
      inp.focus();
      var reveal = function () {
        if (done || revealed) return;
        revealed = true;
        document.getElementById("reveal").style.display = "none";
        var fb = document.getElementById("fb");
        fb.className = "fb";
        fb.innerHTML = "<b>정답</b><div>" + esc(q.show) + '</div><div class="row" style="margin-top:10px">'
          + '<button class="primary" id="good">맞았어요</button><button id="bad">틀렸어요</button></div>';
        document.getElementById("good").onclick = function () { feedback(true, inp.value, "잘했어요!"); };
        document.getElementById("bad").onclick = function () { feedback(false, inp.value); };
      };
      document.getElementById("reveal").onclick = reveal;
      run.key = function (e) { if (e.key === "Enter" && !revealed) reveal(); else if (e.key === "Enter" && done) next(); };
    }
  }

  function finish() {
    run.key = null;
    var res = run.results, ok = res.filter(function (r) { return r.ok; }).length;
    if (!run.noRecord) recordResults(res);
    var h = "<h1>결과</h1>";
    if (!res.length) { h += '<p class="sub">푼 문제가 없어요.</p>'; }
    else {
      var pct = Math.round(ok / res.length * 100);
      h += '<div class="card"><div class="score">' + ok + " / " + res.length + '</div><p class="sub" style="text-align:center">'
        + pct + "점 · " + (pct === 100 ? "완벽해요! 🎉" : pct >= 80 ? "잘했어요!" : "틀린 문제는 내일부터 복습 목록에 나와요.") + "</p></div>";
      var bad = res.filter(function (r) { return !r.ok; });
      if (bad.length) {
        h += '<h2>틀린 문제</h2><div class="card">';
        bad.forEach(function (r) {
          h += '<div class="wrong"><div>' + r.q.html + "</div><div><b>정답: " + esc(r.q.show) + "</b>"
            + (r.given ? ' <span class="sub">(내 답: ' + esc(r.given) + ")</span>" : "") + "</div></div>";
        });
        h += "</div>";
      }
    }
    h += '<div class="row">';
    if (res.some(function (r) { return !r.ok; })) h += '<button class="primary" id="retry">틀린 문제 다시 풀기</button>';
    h += '<button id="again">같은 유형 다시</button><button id="home">처음으로</button></div>';
    app.innerHTML = h;
    var mode = run.mode, retry = document.getElementById("retry");
    var badQs = res.filter(function (r) { return !r.ok; }).map(function (r) { return r.q; });
    if (retry) retry.onclick = function () { start("retry", badQs); };
    var allQs = run.qs;
    document.getElementById("again").onclick = function () { if (mode === "retry") start("retry", allQs); else start(mode); };
    document.getElementById("home").onclick = home;
  }

  document.addEventListener("keydown", function (e) { if (run && run.key) run.key(e); });
  home();
})();
