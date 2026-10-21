const express = require("express");
const mysql = require("mysql2/promise");
const crypto = require("node:crypto");
const demoTranslations = require("./demo-translations.json");
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
const AZURE_LANGS = { vi: "vi", en: "en", zh: "zh-Hans", ja: "ja", ko: "ko" };
const AZURE_TRANSLATOR_KEY = process.env.AZURE_TRANSLATOR_KEY;
const AZURE_TRANSLATOR_REGION = process.env.AZURE_TRANSLATOR_REGION;
const cache = new Map();
const inFlight = new Map();
const normalizeText = (text) => text.normalize("NFC").trim().replace(/\s+/g, " ");
const bundledDemoTranslations = Object.fromEntries(
  Object.entries(demoTranslations).map(([text, translations]) => [normalizeText(text), translations]),
);
const cacheDb = process.env.CACHE_DB_HOST && process.env.CACHE_DB_USER && process.env.CACHE_DB_NAME
  ? mysql.createPool({
      host: process.env.CACHE_DB_HOST,
      port: +(process.env.CACHE_DB_PORT || 3306),
      user: process.env.CACHE_DB_USER,
      password: process.env.CACHE_DB_PASSWORD || "",
      database: process.env.CACHE_DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      charset: "utf8mb4",
      ssl: process.env.CACHE_DB_SSL === "true" ? { minVersion: "TLSv1.2" } : undefined,
    })
  : null;
let cacheTableReady = false;
let cacheTableInit;

async function ensureCacheTable() {
  if (!cacheDb) return false;
  if (cacheTableReady) return true;
  if (!cacheTableInit) {
    cacheTableInit = cacheDb.query(`CREATE TABLE IF NOT EXISTS translation_cache (
      cache_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      source_lang VARCHAR(5) NOT NULL,
      target_lang VARCHAR(5) NOT NULL,
      translated_text MEDIUMTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4`)
      .then(() => {
        cacheTableReady = true;
        console.log("Persistent translation cache ready");
        return true;
      })
      .catch((e) => {
        console.error("Persistent translation cache unavailable:", e.code || e.message);
        return false;
      })
      .finally(() => { cacheTableInit = null; });
  }
  return cacheTableInit;
}

function cacheKey(source, target, text) {
  return crypto.createHash("sha256").update(`${source}|${target}|${text}`).digest("hex");
}

async function readCache(key) {
  if (cache.has(key)) return cache.get(key);
  if (await ensureCacheTable()) {
    try {
      const [[row]] = await cacheDb.query(
        "SELECT translated_text FROM translation_cache WHERE cache_key = ?",
        [key],
      );
      if (row) {
        cache.set(key, row.translated_text);
        return row.translated_text;
      }
    } catch (e) {
      console.error("Translation cache read failed:", e.code || e.message);
    }
  }
  return undefined;
}

async function writeCache(key, source, target, translatedText) {
  cache.set(key, translatedText);
  if (await ensureCacheTable()) {
    try {
      await cacheDb.query(
        `INSERT INTO translation_cache (cache_key, source_lang, target_lang, translated_text)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE translated_text = VALUES(translated_text)`,
        [key, source, target, translatedText],
      );
    } catch (e) {
      console.error("Translation cache write failed:", e.code || e.message);
    }
  }
}

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

async function azureTranslate(q, from, to) {
  const url = new URL("https://api.cognitive.microsofttranslator.com/translate");
  url.searchParams.set("api-version", "3.0");
  url.searchParams.set("from", AZURE_LANGS[from]);
  url.searchParams.set("to", AZURE_LANGS[to]);
  const headers = {
    "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_KEY,
    "Content-Type": "application/json; charset=UTF-8",
  };
  if (AZURE_TRANSLATOR_REGION) {
    headers["Ocp-Apim-Subscription-Region"] = AZURE_TRANSLATOR_REGION;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify([{ Text: q }]),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || `Azure Translator HTTP ${response.status}`);
  }
  const translated = result?.[0]?.translations?.[0]?.text;
  if (typeof translated !== "string") throw new Error("Azure Translator returned an invalid response");
  return translated;
}

async function translateChunk(q, source, target) {
  if (AZURE_TRANSLATOR_KEY) {
    try {
      return await azureTranslate(q, source, target);
    } catch (azureError) {
      console.error("Azure Translator failed; trying MyMemory fallback:", azureError.message);
      try {
        return await mymemory(q, MM[source], MM[target]);
      } catch (myMemoryError) {
        throw new Error(`Azure Translator: ${azureError.message}; MyMemory: ${myMemoryError.message}`);
      }
    }
  }
  return mymemory(q, MM[source], MM[target]);
}

app.post("/translate", async (req, res) => {
  const { text, source, target } = req.body || {};
  if (!text || !MM[source] || !MM[target])
    return res.status(400).json({ error: "Tham số không hợp lệ" });
  if (source === target) return res.json({ text });
  // Pretranslated current demo restaurants so the presentation doesn't depend on a live free API quota.
  const bundled = source === "vi" && bundledDemoTranslations[normalizeText(text)]?.[target];
  if (bundled) {
    return res.json({ text: bundled, cached: true });
  }
  const key = cacheKey(source, target, text);
  const cached = await readCache(key);
  if (cached !== undefined) return res.json({ text: cached, cached: true });
  if (inFlight.has(key)) {
    try {
      return res.json({ text: await inFlight.get(key), cached: true });
    } catch (e) {
      return res.status(502).json({
        error: "Dịch vụ dịch (MyMemory) không phản hồi hoặc hết hạn mức: " + e.message,
      });
    }
  }
  const translation = (async () => {
    const out = [];
    for (const c of chunk(text))
      out.push(await translateChunk(c, source, target));
    const result = out.join(" ").trim();
    await writeCache(key, source, target, result);
    return result;
  })();
  inFlight.set(key, translation);
  try {
    const result = await translation;
    res.json({ text: result });
  } catch (e) {
    console.error(e.message);
    res
      .status(502)
      .json({
        error: "Dịch vụ dịch không phản hồi hoặc hết hạn mức: " + e.message,
      });
  } finally {
    inFlight.delete(key);
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
if (cacheDb) void ensureCacheTable();
else console.log("Persistent translation cache disabled; using memory only");

app.listen(3002, () => console.log("translation-service :3002"));
