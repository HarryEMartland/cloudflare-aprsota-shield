const APRSOTA_BASE = "https://aprsota.org";
const SHIELDS_BASE = "https://img.shields.io/badge";
const BADGE_DEFAULTS = {
    label: "APRS OTA",
    style: "flat",
    color: "orange",
    labelColor: "555555"
};

function badgeUrl({
                      message,
                      label = BADGE_DEFAULTS.label,
                      color = BADGE_DEFAULTS.color,
                      style = BADGE_DEFAULTS.style,
                      labelColor = BADGE_DEFAULTS.labelColor
                  }) {
    const parts = [encodeURIComponent(label), encodeURIComponent(message), encodeURIComponent(color)];
    return `${SHIELDS_BASE}/${parts.join("-")}`;
}


function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {"Content-Type": "application/json; charset=utf-8"}
    });
}

function extractStats(html) {
    const points = html.match(
        /<b class="op-scoreboard-num">(\d+)<\/b>[\s\S]*?<span class="op-scoreboard-unit">points<\/span>/
    );
    const qsos = html.match(
        /<span class="operator-minis">[\s\S]*?<b>(\d+)<\/b>\s*QSOs/
    );
    return {points: points ? points[1] : null, qsos: qsos ? qsos[1] : null};
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const callsign = (url.searchParams.get("callsign") || url.searchParams.get("call") || "").trim().toUpperCase();

        if (!callsign) {
            return jsonResponse({error: "Missing callsign query parameter. e.g. ?callsign=M7HDD"}, 400);
        }

        let target;
        try {
            const res = await fetch(`${APRSOTA_BASE}/${callsign}`, {
                headers: {"User-Agent": "aprsota-shield/1.0 (cloudflare worker)"}
            });
            if (res.status === 404) {
                return jsonResponse({error: `No APRS OTA profile found for callsign ${callsign}`}, 404);
            }
            if (!res.ok) {
                return jsonResponse({error: `aprsota.org returned ${res.status} for ${callsign}`}, 502);
            }
            target = await res.text();
        } catch (err) {
            return jsonResponse({error: `Failed to fetch aprsota.org: ${err.message}`}, 502);
        }

        const stats = extractStats(target);

        if (!stats.points || !stats.qsos) {
            return jsonResponse({error: `Could not parse stats page for ${callsign}`}, 502);
        }

        const message = `${stats.points} pts / ${stats.qsos} QSOs`;


        const ttl = env.CACHE_TTL || 900;
        return new Response(null, {
            status: 302,
            headers: {
                Location: badgeUrl({message}),
                "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}`
            }
        });

    }
};
