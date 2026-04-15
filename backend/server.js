import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// CORS PRO+
// =========================
app.use(cors({
    origin: "*",
    methods: ["GET"],
    allowedHeaders: ["Content-Type"]
}));

// =========================
// FETCH PRO+
// =========================
async function safeFetch(url) {
    try {
        console.log("[FETCH] →", url);

        const res = await fetch(url);
        console.log("[FETCH] STATUS:", res.status);

        const text = await res.text();

        if (!res.ok) {
            console.error("[FETCH ERROR]", text);
            return { fallback: true, status: res.status, body: text };
        }

        try {
            return JSON.parse(text);
        } catch (err) {
            console.error("[FETCH PARSE ERROR]", err);
            return { fallback: true, error: "Invalid JSON", raw: text };
        }

    } catch (err) {
        console.error("[FETCH EXCEPTION]", err);
        return { fallback: true, error: err.message };
    }
}

// =========================
// METAR
// =========================
app.get("/metar", async (req, res) => {
    const data = await safeFetch(
        `https://api.checkwx.com/metar/EBLG/decoded?x-api-key=${process.env.CHECKWX_KEY}`
    );

    if (data.fallback) {
        return res.json({
            fallback: true,
            data: [{
                raw_text: "METAR unavailable",
                wind: { degrees: 0, speed_kts: 0 }
            }],
            timestamp: new Date().toISOString()
        });
    }

    res.json(data);
});

// =========================
// TAF (corrigé)
// =========================
app.get("/taf", async (req, res) => {
    const data = await safeFetch(
        `https://api.checkwx.com/taf/EBLG/decoded?x-api-key=${process.env.CHECKWX_KEY}`
    );

    if (data.fallback) {
        return res.json({
            fallback: true,
            data: [{
                raw_text: "TAF unavailable"
            }],
            timestamp: new Date().toISOString()
        });
    }

    res.json(data);
});

// =========================
// FIDS (OpenSky → fallback propre)
// =========================
app.get("/fids", async (req, res) => {
    const now = Math.floor(Date.now() / 1000);
    const begin = now - 3600;

    const url = `https://opensky-network.org/api/flights/departure?airport=EBLG&begin=${begin}&end=${now}`;
    const data = await safeFetch(url);

    if (data.fallback) {
        return res.json([{
            flight: "N/A",
            destination: "N/A",
            time: "N/A",
            status: "Unavailable",
            fallback: true,
            timestamp: new Date().toISOString()
        }]);
    }

    res.json(data);
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
    console.log("[PROXY] Running on port", PORT);
});
