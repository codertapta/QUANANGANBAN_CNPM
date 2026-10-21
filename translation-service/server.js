const express = require("express");
const app = express();
app.use(express.json({ limit: "1mb" }));
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
app.use((req, res, next) => {
  if (!INTERNAL_API_KEY || req.get("x-internal-api-key") !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

const MM = { vi: "vi", en: "en", zh: "zh-CN", ja: "ja", ko: "ko" }; // mã ngôn ngữ MyMemory
const cache = new Map();

function chunk(text, max = 450) {
  // MyMemory giới hạn ~500 ký tự/yêu cầu
  const parts = text.match(/[^.!?。！？\n]+[.!?。！？]*\s*/g) || [text];
  const out = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + p).length > max && cur) {
      out.push(cur);
      cur = "";
    }
    cur += p;
    while (cur.length > max) {
      out.push(cur.slice(0, max));
      cur = cur.slice(max);
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}
async function mymemory(q, from, to) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${from}|${to}`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.responseStatus != 200)
    throw new Error(j.responseDetails || "MyMemory error");
  return j.responseData.translatedText;
}

app.post("/translate", async (req, res) => {
  const { text, source, target } = req.body || {};
  if (!text || !MM[source] || !MM[target])
    return res.status(400).json({ error: "Tham số không hợp lệ" });
  if (source === target) return res.json({ text });
  const key = `${source}|${target}|${text}`;
  if (cache.has(key)) return res.json({ text: cache.get(key), cached: true });
  try {
    const out = [];
    for (const c of chunk(text))
      out.push(await mymemory(c, MM[source], MM[target]));
    const result = out.join(" ").trim();
    cache.set(key, result);
    res.json({ text: result });
  } catch (e) {
    console.error(e.message);
    res
      .status(502)
      .json({
        error:
          "Dịch vụ dịch (MyMemory) không phản hồi hoặc hết hạn mức: " +
          e.message,
      });
  }
});

// Giọng đọc dự phòng (mp3) cho thiết bị không có giọng đọc – đi qua backend để tránh lỗi CORS
const TL = { vi: "vi", en: "en", zh: "zh-CN", ja: "ja", ko: "ko" };
app.get("/tts", async (req, res) => {
  const L = TL[req.query.lang],
    q = String(req.query.q || "");
  if (!L || !q || q.length > 200) return res.status(400).end();
  try {
    const r = await fetch(
      `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${L}&q=${encodeURIComponent(q)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://translate.google.com/",
        },
      },
    );
    if (!r.ok) throw new Error("HTTP " + r.status);
    res.set({
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    });
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error("tts", e.message);
    res.status(502).end();
  }
});
app.listen(3002, () => console.log("translation-service :3002"));
