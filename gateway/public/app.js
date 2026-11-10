const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
// Ngưỡng cấu hình (có thể chỉnh sau)
const ACC_MAX = 500,
  VISIT_R = 150,
  VISIT_DWELL = 30,
  VISIT_LISTEN = 0.5,
  DONE = 0.9,
  AUTO_DELAY = 4000;
const T = {
  vi: {
    title: "Thuyết minh quán ăn1",
    privacy:
      "Trang web dùng vị trí GPS và dữ liệu tương tác ẩn danh (không cần đăng ký) để tìm quán gần bạn và thống kê lượt nghe. Không lưu lịch sử vị trí liên tục.",
    loc: "📍 Lấy vị trí hiện tại",
    radius: "Bán kính",
    none: "Không có quán nào trong phạm vi đã chọn.",
    searching: "Đang tìm quán...",
    listen: "🔊 Nghe",
    pause: "⏸ Tạm dừng",
    resume: "▶ Tiếp tục",
    replay: "↻ Phát lại",
    detail: "Xem chi tiết",
    close: "Đóng",
    denied:
      "Bạn chưa cấp quyền vị trí. Hãy bật GPS/quyền vị trí cho trang web.",
    nopos: "Không lấy được tọa độ.",
    acc: "Độ chính xác vị trí quá thấp (±",
    noTTS: "Trình duyệt không hỗ trợ đọc thuyết minh.",
    noVoice: "Thiết bị chưa có giọng đọc cho ngôn ngữ này.",
    tryEn: "Nghe bản tiếng Anh",
    blocked: "Trình duyệt chặn tự phát. Bấm để nghe.",
    away: "Cách bạn",
    near: (n, d) => `${n} cách bạn ${d} mét. Chuẩn bị thuyết minh về ${n}`,
    unit: "m",
    untrans: "(chưa có bản dịch, đang dùng tiếng Việt)",
  },
  en: {
    title: "Restaurant Audio Guide1",
    privacy:
      "This site uses GPS and anonymous interaction data (no sign-up) to find nearby restaurants and measure listening. No continuous location history is stored.",
    loc: "📍 Get my location",
    radius: "Radius",
    none: "No restaurants within the selected radius.",
    searching: "Searching...",
    listen: "🔊 Listen",
    pause: "⏸ Pause",
    resume: "▶ Resume",
    replay: "↻ Replay",
    detail: "Details",
    close: "Close",
    denied: "Location permission denied. Please enable location for this site.",
    nopos: "Could not get your coordinates.",
    acc: "Location accuracy too low (±",
    noTTS: "Your browser does not support speech.",
    noVoice: "No voice available for this language on your device.",
    tryEn: "Listen in English",
    blocked: "Autoplay was blocked. Tap to listen.",
    away: "Away",
    near: (n, d) =>
      `${n} is ${d} m from you. Get ready for the narration about ${n}`,
    unit: "m",
    untrans: "(translation not ready, showing Vietnamese)",
  },
  zh: {
    title: "餐厅语音导览",
    privacy:
      "本网站使用GPS和匿名互动数据（无需注册）查找附近餐厅并统计收听情况，不会持续保存位置历史。",
    loc: "📍 获取当前位置",
    radius: "半径",
    none: "所选范围内没有餐厅。",
    searching: "正在搜索…",
    listen: "🔊 收听",
    pause: "⏸ 暂停",
    resume: "▶ 继续",
    replay: "↻ 重播",
    detail: "查看详情",
    close: "关闭",
    denied: "未授权位置权限，请为本网站开启定位。",
    nopos: "无法获取坐标。",
    acc: "定位精度过低（±",
    noTTS: "浏览器不支持语音朗读。",
    noVoice: "设备上没有该语言的语音。",
    tryEn: "收听英文版",
    blocked: "浏览器阻止了自动播放，请点击收听。",
    away: "距离",
    near: (n, d) => `${n}距离您${d}米。即将为您讲解${n}`,
    unit: "米",
    untrans: "（翻译未就绪，显示越南语）",
  },
  ja: {
    title: "レストラン音声ガイド",
    privacy:
      "当サイトはGPSと匿名の操作データ（登録不要）を使い、近くの店舗検索と再生の集計を行います。位置履歴は継続保存しません。",
    loc: "📍 現在地を取得",
    radius: "半径",
    none: "選択した範囲に店舗はありません。",
    searching: "検索中…",
    listen: "🔊 聞く",
    pause: "⏸ 一時停止",
    resume: "▶ 再開",
    replay: "↻ もう一度",
    detail: "詳細",
    close: "閉じる",
    denied: "位置情報の許可がありません。",
    nopos: "座標を取得できません。",
    acc: "位置精度が低すぎます（±",
    noTTS: "ブラウザが音声読み上げに対応していません。",
    noVoice: "この言語の音声がありません。",
    tryEn: "英語で聞く",
    blocked: "自動再生がブロックされました。タップして再生。",
    away: "距離",
    near: (n, d) => `${n}はあなたから${d}m先です。${n}の解説を準備します`,
    unit: "m",
    untrans: "（翻訳未完了のためベトナム語）",
  },
  ko: {
    title: "맛집 음성 가이드",
    privacy:
      "이 사이트는 GPS와 익명 상호작용 데이터(가입 불필요)를 사용해 주변 식당을 찾고 청취 통계를 냅니다. 위치 기록은 지속 저장하지 않습니다.",
    loc: "📍 현재 위치 가져오기",
    radius: "반경",
    none: "선택한 반경 내에 식당이 없습니다.",
    searching: "검색 중…",
    listen: "🔊 듣기",
    pause: "⏸ 일시정지",
    resume: "▶ 계속",
    replay: "↻ 다시 재생",
    detail: "상세 보기",
    close: "닫기",
    denied: "위치 권한이 없습니다.",
    nopos: "좌표를 가져올 수 없습니다.",
    acc: "위치 정확도가 너무 낮습니다(±",
    noTTS: "브라우저가 음성 읽기를 지원하지 않습니다.",
    noVoice: "이 언어의 음성이 없습니다.",
    tryEn: "영어로 듣기",
    blocked: "자동 재생이 차단되었습니다. 눌러서 들으세요.",
    away: "거리",
    near: (n, d) =>
      `${n}은(는) 현재 위치에서 ${d}m 떨어져 있습니다. ${n} 해설을 준비합니다`,
    unit: "m",
    untrans: "(번역 준비 중, 베트남어로 표시)",
  },
};
const LOC = { vi: "vi-VN", en: "en-US", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR" };
let lang = (() => {
  const l = (localStorage.lang || navigator.language || "en")
    .slice(0, 2)
    .toLowerCase();
  return T[l] ? l : "en";
})();
const t = () => T[lang];
//Mỗi lần khách vào website sẽ tạo ngẫu nhiên 1 uid
const uid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : "s" + Date.now() + Math.random().toString(16).slice(2);
//Kiểm tra uid đó tồn tại chưa nếu chưa lưu vào sessionStorage
const sid = sessionStorage.sid || (sessionStorage.sid = uid());
// Hàm post dùng để gửi thông tin phiên truy cập về backend
const post = (p, b) =>
  fetch("/api/public" + p, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b),
    keepalive: true,
  }).catch(() => {});
const get = (p) => fetch("/api/public" + p).then((r) => r.json());
const ev = (type, rid, value) =>
  post("/event", {
    session_id: sid,
    type,
    restaurant_id: rid || null,
    lang,
    value: value ?? null,
  });
//Giá trị hàm post gửi về backend bao gồm sid,ngôn ngữ máy,ngôn ngữ trình duyệt
post("/session", {
  session_id: sid,
  language: lang,
  device_lang: navigator.language,
});
//Sau đó khi mà trình duyệt còn mở cứ 15s nó sẽ yêu cầu gửi sid (mã phiên truy cập) về backend 1 lần nếu backend sau 15s không nhận được yêu cầu gửi về của phiên đó nữa thì sẽ 0 active
setInterval(() => post("/heartbeat", { session_id: sid }), 15000);

let pos = null,
  lastQ = null,
  items = [],
  P = null,
  lastR = null,
  autoTimer = null,
  voices = [];
const autoDone = new Set(JSON.parse(sessionStorage.auto || "[]")),
  dismissed = new Set(),
  detected = new Set(),
  dwell = {},
  maxProg = {},
  visitSent = new Set();
const loadVoices = () =>
  (voices = "speechSynthesis" in window ? speechSynthesis.getVoices() : []);
if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}
const hasVoice = (l) =>
  !voices.length ||
  voices.some((v) => v.lang.toLowerCase().replace("_", "-").startsWith(l));
const hav = (a, b) => {
  const R = 6371000,
    r = (x) => (x * Math.PI) / 180,
    dl = r(b.lat - a.lat),
    dg = r(b.lng - a.lng);
  const h =
    Math.sin(dl / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

function applyLang() {
  document.documentElement.lang = lang;
  $("#lang").value = lang;
  document
    .querySelectorAll("[data-k]")
    .forEach((e) => (e.textContent = t()[e.dataset.k]));
  $("#pPause").textContent = P && P.paused ? t().resume : t().pause;
}

// ---------- Vị trí & tìm kiếm ----------
$("#locBtn").onclick = () => {
  if (!navigator.geolocation) return ($("#status").textContent = t().nopos);
  $("#status").textContent = t().searching;
  //Kiểm tra tính hợp lệ của GPS. Activity Diagram
  const ok = (p) => {
    if (p.coords.accuracy > ACC_MAX) {
      //alert("hl hl"); // GPS không hợp lệ
      $("#status").textContent =
        t().acc + Math.round(p.coords.accuracy) + " m)";
      return;
    }
    //alert("hl"); // GPS hợp lệ
    pos = { lat: p.coords.latitude, lng: p.coords.longitude };
    $("#status").textContent = "";
    search();
    updateDwell();
  };
  const err = (e) =>
    ($("#status").textContent = e.code === 1 ? t().denied : t().nopos);
  navigator.geolocation.getCurrentPosition(ok, err, {
    enableHighAccuracy: true,
    timeout: 15000,
  });
  if (!window._watch)
    window._watch = navigator.geolocation.watchPosition(ok, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 5000,
    });
};
$("#radius").onchange = () => search(true);
$("#lang").onchange = (e) => {
  lang = e.target.value;
  localStorage.lang = lang;
  applyLang();
  search(true);
};
//Hiển thị danh sách quán nếu tìm thấy
async function search(force) {
  if (!pos) return;
  const r = +$("#radius").value;
  if (
    !force &&
    lastQ &&
    lastQ.r === r &&
    lastQ.l === lang &&
    hav(lastQ, pos) < 20
  )
    return;
  lastQ = { lat: pos.lat, lng: pos.lng, r, l: lang };
  $("#status").textContent = t().searching;
  let d;
  try {
    d = await get(
      `/nearby?lat=${pos.lat}&lng=${pos.lng}&radius=${r}&lang=${lang}`,
    );
  } catch {
    $("#status").textContent = t().nopos;
    return;
  }
  // Khi không tìm thấy quán
  items = d.items || [];
  renderList();
  if (!items.length) {
    //alert("hl hl"); // Không tìm thấy quán
    $("#status").textContent = t().none;
    hideBanner();
    return;
  }
  //alert("hl"); // Tìm thấy ít nhất một quán
  $("#status").textContent = "";
  items.forEach((i) => {
    if (!detected.has(i.id)) {
      detected.add(i.id);
      ev("detect", i.id);
    }
  });
  const c = items.find((i) => !autoDone.has(i.id) && !dismissed.has(i.id));
  if (c) showBanner(c);
  else hideBanner();
}
function renderList() {
  $("#list").innerHTML = items
    .map(
      (
        i,
      ) => `<div class="card"><b>${esc(i.name)}</b> <span class="dist">${i.distance} ${t().unit}</span>
    <div class="muted">${esc(i.address)}</div>${i.lang_ok ? "" : `<div class="muted warn">${t().untrans}</div>`}
    <div class="row" style="margin-top:8px"><button class="p" data-play="${i.id}">${t().listen}</button><button data-det="${i.id}">${t().detail}</button></div></div>`,
    )
    .join("");
}
$("#list").onclick = (e) => {
  const p = e.target.dataset.play,
    d = e.target.dataset.det;
  if (p)
    play(
      items.find((i) => i.id == p),
      true,
    );
  if (d) openDetail(items.find((i) => i.id == d));
};

// ---------- Banner & tự phát ----------
let bItem = null;
function showBanner(r) {
  if (bItem && bItem.id === r.id && !$("#banner").hidden) return;
  bItem = r;
  $("#bText").textContent = t().near(r.name, r.distance);
  $("#banner").hidden = false;
  $("#bListen").hidden = true;
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => tryAuto(r), AUTO_DELAY);
}
function hideBanner() {
  clearTimeout(autoTimer);
  $("#banner").hidden = true;
  bItem = null;
}
//Nếu không đóng banner sẽ phát thuyết minh
function tryAuto(r) {
  if (autoDone.has(r.id)) return;
  if (P && P.active) {
    $("#bListen").hidden = false;
    return;
  } // không ngắt bài đang phát
  //alert("hl hl");
  autoDone.add(r.id);
  sessionStorage.auto = JSON.stringify([...autoDone]);
  play(r, false);
}
//Đóng thuyết minh quán được tìm thấy
$("#bClose").onclick = () => {
  if (bItem) {
    dismissed.add(bItem.id);
    if (!autoDone.has(bItem.id)) ev("dismiss", bItem.id);
  }
  hideBanner();
  //alert("hl");
};
$("#bDetail").onclick = () => bItem && openDetail(bItem);
$("#bListen").onclick = () => bItem && play(bItem, true);

// ---------- Trình phát (SpeechSynthesis) ----------
function split(s) {
  const out = [];
  let c = "";
  for (const x of s.match(/[^.!?。！？\n]+[.!?。！？]*\s*/g) || [s]) {
    if (c && (c + x).length > 180) {
      out.push(c);
      c = "";
    }
    c += x;
    while (c.length > 200) {
      out.push(c.slice(0, 200));
      c = c.slice(200);
    }
  }
  if (c) out.push(c);
  return out;
}
async function play(r, manual, fl) {
  if (!r) return;
  if (!("speechSynthesis" in window)) return alert(t().noTTS);
  if (!manual && P && P.active) return;
  if (P) stopP();
  const l = fl || lang;
  $("#manual").hidden = true;
  lastR = r;
  if (!voices.length) loadVoices();
  if (!hasVoice(l)) {
    $("#mText").textContent = t().noVoice;
    $("#mBtns").innerHTML =
      `<button class="p" id="mEn">${t().tryEn}</button><button id="mTry">${t().listen}</button>`;
    $("#manual").hidden = false;
    $("#mEn").onclick = () => play(r, true, "en");
    $("#mTry").onclick = () => {
      voices = [];
      play(r, true, l);
    };
    return;
  }
  if (fl && fl !== lang) {
    try {
      r = { ...r, ...(await get(`/restaurants/${r.id}?lang=${fl}`)) };
    } catch {}
  }
  const chunks = split(`${r.name}. ${r.description || ""}`);
  P = {
    r,
    chunks,
    i: 0,
    off: 0,
    len: chunks.join("").length,
    ci: 0,
    ms: 0,
    last: Date.now(),
    active: true,
    paused: false,
    started: false,
    bound: false,
    lang: l,
    done: false,
    stopped: false,
  };
  if (!manual)
    P.guard = setTimeout(() => {
      if (P && !P.started) blocked();
    }, 2500);
  $("#player").hidden = false;
  $("#pName").textContent = r.name;
  applyLang();
  speechSynthesis.cancel();
  speak();
}
function speak() {
  const p = P;
  if (!p || p.stopped) return;
  if (p.i >= p.chunks.length) return finish(true);
  const text = p.chunks[p.i];
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOC[p.lang];

  console.log("[TTS DEBUG]", {
    selectedLang: lang,
    playbackLang: p.lang,
    utteranceLang: u.lang,
    text: text,
  });
  const v = voices.find((v) =>
    v.lang.toLowerCase().replace("_", "-").startsWith(p.lang),
  );
  if (v) u.voice = v;
  u.onstart = () => {
    if (P !== p) return;
    if (!p.started) {
      p.started = true;
      p.last = Date.now();
      clearTimeout(p.guard);
      ev("start", p.r.id);
    }
  };
  u.onboundary = (e) => {
    if (P === p) {
      p.bound = true;
      p.ci = p.off + e.charIndex;
    }
  };
  u.onend = () => {
    if (P !== p || p.stopped) return;
    p.off += p.chunks[p.i].length;
    p.ci = p.off;
    p.i++;
    speak();
  };
  u.onerror = (e) => {
    if (P !== p) return;
    if (e.error === "not-allowed") blocked();
    else if (e.error !== "canceled" && e.error !== "interrupted") finish(false);
  };
  speechSynthesis.speak(u);
}
function blocked() {
  const r = P && P.r;
  if (P) {
    P.stopped = true;
    clearTimeout(P.guard);
  }
  speechSynthesis.cancel();
  P = null;
  $("#player").hidden = true;
  if (!r) return;
  autoDone.delete(r.id);
  $("#mText").textContent = t().blocked;
  $("#mBtns").innerHTML = `<button class="p" id="mGo">${t().listen}</button>`;
  $("#manual").hidden = false;
  $("#mGo").onclick = () => {
    autoDone.add(r.id);
    play(r, true);
  };
}
const prog = (p) =>
  p.done
    ? 1
    : p.bound
      ? Math.min(p.ci / p.len, 0.99)
      : Math.min(
          p.ms /
            (p.len *
              (/[\u3000-\u9fff\uac00-\ud7af]/.test(p.chunks[0]) ? 220 : 65)),
          0.99,
        );
function finish(natural) {
  const p = P;
  if (!p || !p.active) return;
  clearTimeout(p.guard);
  if (natural) p.done = true;
  p.active = false;
  p.stopped = !natural && p.stopped;
  const pr = prog(p);
  maxProg[p.r.id] = Math.max(maxProg[p.r.id] || 0, pr);
  if (p.started) {
    if (!p.sent90 && pr >= DONE) {
      p.sent90 = true;
      ev("complete", p.r.id);
    }
    ev("listen_time", p.r.id, Math.round(p.ms / 1000));
  }
  p.paused = false;
  applyLang();
  ui();
}
function stopP() {
  if (P) {
    P.stopped = true;
    speechSynthesis.cancel();
    finish(false);
  }
}
$("#pPause").onclick = () => {
  if (!P || !P.active) return;
  if (P.paused) {
    speechSynthesis.resume();
    P.paused = false;
    P.last = Date.now();
  } else {
    speechSynthesis.pause();
    P.paused = true;
    ev("pause", P.r.id);
  }
  applyLang();
};

$("#pReplay").onclick = async () => {
  if (!lastR) return;

  try {
    const r = await get(`/restaurants/${lastR.id}?lang=${lang}`);
    lastR = { ...lastR, ...r };
  } catch (e) {
    console.error("Không tải được nội dung phát lại:", e);
  }

  play(lastR, true);
};

$("#pDetail").onclick = () => lastR && openDetail(lastR);
window.addEventListener("pagehide", () => {
  if (P && P.active && P.started)
    ev("listen_time", P.r.id, Math.round(P.ms / 1000));
});

function fmt(ms) {
  const s = Math.round(ms / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function ui() {
  if (!P) return;
  const now = Date.now();
  if (P.active && P.started && !P.paused) {
    P.ms += now - P.last;
  }
  P.last = now;
  const pr = prog(P);
  $("#pBar").style.width = pr * 100 + "%";
  const total =
    P.bound && P.ci > P.len * 0.1
      ? P.ms / (P.ci / P.len)
      : P.len * (/[\u3000-\u9fff\uac00-\ud7af]/.test(P.chunks[0]) ? 220 : 65);
  $("#pTime").textContent = `${fmt(P.ms)} / ${fmt(P.done ? P.ms : total)}`;
  maxProg[P.r.id] = Math.max(maxProg[P.r.id] || 0, pr);
  if (P.active && !P.sent90 && pr >= DONE) {
    P.sent90 = true;
    ev("complete", P.r.id);
  }
}
// ---------- Lượt ghé thăm ước tính ----------
function updateDwell() {
  if (!pos) return;
  const now = Date.now();
  for (const i of items) {
    if (hav(pos, i) <= VISIT_R) dwell[i.id] = dwell[i.id] || now;
    else delete dwell[i.id];
  }
}
function checkVisits() {
  const now = Date.now();
  for (const id in dwell)
    if (
      !visitSent.has(id) &&
      now - dwell[id] >= VISIT_DWELL * 1000 &&
      (maxProg[id] || 0) >= VISIT_LISTEN
    ) {
      visitSent.add(id);
      ev("visit_estimated", +id, Math.round((now - dwell[id]) / 1000));
    }
}
setInterval(() => {
  ui();
  updateDwell();
  checkVisits();
}, 500);

// ---------- Chi tiết ----------
async function openDetail(r) {
  ev("detail", r.id);
  let d = r;
  try {
    d = { ...r, ...(await get(`/restaurants/${r.id}?lang=${lang}`)) };
  } catch {}
  $("#dBody").innerHTML =
    `${d.image_url ? `<img src="${esc(d.image_url)}" alt="">` : ""}<h3>${esc(d.name)}</h3><div class="muted">${esc(d.address)}</div><p>${esc(d.description)}</p>`;
  $("#dListen").onclick = () => {
    $("#dlg").close();
    play(d, true);
  };
  $("#dlg").showModal();
}
$("#dClose").onclick = () => $("#dlg").close();
applyLang();
