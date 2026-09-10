import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const WORKER_BASE = "https://aprsota-shield.test";
const SHIELDS_BASE = "https://img.shields.io/badge";

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<body>
  <div class="op-scoreboard-total">
    <b class="op-scoreboard-num">1,234</b>
    <span class="op-scoreboard-unit">points</span>
  </div>
  <span class="operator-minis">
    <b>56</b> QSOs
  </span>
</body>
</html>`;

function makeRequest(query = "", method = "GET") {
    return new Request(`${WORKER_BASE}/${query}`, {method});
}

function mockAprsota(t, {status = 200, body = SAMPLE_HTML, error} = {}) {
    if (error) {
        t.mock.method(globalThis, "fetch", () => {
            throw error;
        });
        return;
    }
    t.mock.method(globalThis, "fetch", (url, init) => {
        assert.match(url, /^https:\/\/aprsota\.org\/[A-Z0-9]+$/i, "should fetch aprsota.org with an uppercased callsign");
        assert.match(init.headers["User-Agent"], /^aprsota-shield\//);
        return Promise.resolve(new Response(body, {status}));
    });
}

test("rejects non-GET requests with 405", async () => {
    const res = await worker.fetch(makeRequest("?callsign=M7HDD", "POST"), {});
    assert.equal(res.status, 405);
    assert.match(await res.text(), /Method not allowed/);
});

test("rejects a missing callsign with 400", async () => {
    const res = await worker.fetch(makeRequest(""), {});
    assert.equal(res.status, 400);
    assert.match(await res.text(), /Missing callsign/);
});

test("rejects an invalid callsign with 400", async () => {
    for (const qs of ["?callsign=!!!!", "?callsign=ABCDEFG", "?callsign=AB CD"]) {
        const res = await worker.fetch(makeRequest(qs), {});
        assert.equal(res.status, 400, `expected 400 for ${qs}`);
    }
});

test("uppercases lowercase callsigns and supports the call alias", async (t) => {
    mockAprsota(t);
    for (const qs of ["?callsign=m7hdd", "?call=g0abc"]) {
        const res = await worker.fetch(makeRequest(qs), {});
        assert.equal(res.status, 302, `expected 302 for ${qs}`);
    }
});

test("returns 404 when aprsota.org has no profile", async (t) => {
    mockAprsota(t, {status: 404});
    const res = await worker.fetch(makeRequest("?callsign=NOPE"), {});
    assert.equal(res.status, 404);
    assert.match(await res.text(), /No APRS OTA profile found/);
});

test("returns 502 when aprsota.org errors", async (t) => {
    mockAprsota(t, {status: 500});
    const res = await worker.fetch(makeRequest("?callsign=M7HDD"), {});
    assert.equal(res.status, 502);
    assert.match(await res.text(), /aprsota.org returned 500/);
});

test("returns 502 when aprsota.org is unreachable", async (t) => {
    mockAprsota(t, {error: new Error("boom")});
    const res = await worker.fetch(makeRequest("?callsign=M7HDD"), {});
    assert.equal(res.status, 502);
    assert.match(await res.text(), /Failed to fetch aprsota.org: boom/);
});

test("returns 502 when the stats page cannot be parsed", async (t) => {
    mockAprsota(t, {body: "<html><body>nothing here</body></html>"});
    const res = await worker.fetch(makeRequest("?callsign=M7HDD"), {});
    assert.equal(res.status, 502);
    assert.match(await res.text(), /Could not parse stats page/);
});

test("redirects to a shields.io badge with points, QSOs and colour", async (t) => {
    mockAprsota(t);
    const res = await worker.fetch(makeRequest("?callsign=M7HDD"), {CACHE_TTL: "900"});

    assert.equal(res.status, 302);
    assert.equal(
        res.headers.get("Location"),
        `${SHIELDS_BASE}/APRS%20OTA-1%2C234%20pts%20%2F%2056%20QSOs-orange`
    );
});

test("applies the Cache-Control TTL from env", async (t) => {
    mockAprsota(t);
    for (const ttl of ["120", "3600"]) {
        const res = await worker.fetch(makeRequest("?callsign=M7HDD"), {CACHE_TTL: ttl});
        assert.equal(res.headers.get("Cache-Control"), `public, max-age=${ttl}, s-maxage=${ttl}`);
    }
});

test("defaults to the built-in TTL when env is missing", async (t) => {
    mockAprsota(t);
    const res = await worker.fetch(makeRequest("?callsign=M7HDD"), {});
    assert.equal(res.headers.get("Cache-Control"), "public, max-age=900, s-maxage=900");
});