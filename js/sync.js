(function () {
  const BACKUP = "megasync-backup";
  const SKIP = new Set([BACKUP]);
  const QR_SRC = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";

  const ls = {
    keys() { const out = []; try { for (let i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) {} return out; },
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };

  const b64u = {
    enc(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); },
    dec(str) { const s = atob(str.replace(/-/g, "+").replace(/_/g, "/")); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; },
  };

  async function squeeze(text, mode) {
    const stream = new Blob([text]).stream().pipeThrough(mode === "in" ? new DecompressionStream("deflate-raw") : new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function pack() {
    const data = {};
    ls.keys().forEach((k) => { if (!SKIP.has(k)) data[k] = ls.get(k); });
    const bytes = await squeeze(JSON.stringify({ v: 1, at: Date.now(), data }), "out");
    return { code: b64u.enc(bytes), count: Object.keys(data).length };
  }

  async function unpack(code) {
    const bytes = await squeeze(b64u.dec(code), "in");
    const p = JSON.parse(new TextDecoder().decode(bytes));
    if (!p || p.v !== 1 || typeof p.data !== "object") throw new Error("not a Mega Lab sync code");
    return p;
  }

  function merge(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.every((x) => typeof x !== "object") && b.every((x) => typeof x !== "object")) return Array.from(new Set(a.concat(b)));
      return b.length >= a.length ? b : a;
    }
    if (a && b && typeof a === "object" && typeof b === "object") {
      const out = Object.assign({}, a);
      for (const k of Object.keys(b)) out[k] = k in a ? merge(a[k], b[k]) : b[k];
      return out;
    }
    if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
    if (typeof a === "boolean" && typeof b === "boolean") return a || b;
    return b === undefined || b === null ? a : b;
  }

  function mergeValue(oldRaw, newRaw) {
    if (oldRaw == null) return newRaw;
    let o, n;
    try { o = JSON.parse(oldRaw); n = JSON.parse(newRaw); } catch (e) { return newRaw; }
    if (o && n && typeof o === "object" && typeof n === "object") return JSON.stringify(merge(o, n));
    if (typeof o === "number" && typeof n === "number") return JSON.stringify(Math.max(o, n));
    return newRaw;
  }

  function apply(p) {
    const backup = {};
    let changed = 0;
    for (const [k, v] of Object.entries(p.data)) {
      if (SKIP.has(k) || typeof v !== "string") continue;
      const old = ls.get(k);
      const next = mergeValue(old, v);
      if (next !== old) { backup[k] = old; ls.set(k, next); changed++; }
    }
    ls.set(BACKUP, JSON.stringify({ at: Date.now(), data: backup }));
    return changed;
  }

  function undo() {
    let b; try { b = JSON.parse(ls.get(BACKUP)); } catch (e) { b = null; }
    if (!b || !b.data) return 0;
    let n = 0;
    for (const [k, v] of Object.entries(b.data)) { if (v === null) { try { localStorage.removeItem(k); } catch (e) {} } else ls.set(k, v); n++; }
    try { localStorage.removeItem(BACKUP); } catch (e) {}
    return n;
  }

  function loadQr() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = QR_SRC; s.onload = () => res(window.qrcode); s.onerror = rej; document.head.appendChild(s); });
  }

  const CSS = `.msync{position:fixed;inset:0;z-index:9999;background:rgba(8,10,14,.6);display:flex;align-items:flex-end;justify-content:center;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
@media (min-width:700px){.msync{align-items:center}.msync .sh{border-radius:16px}}
.msync .sh{width:100%;max-width:440px;background:#17191d;color:#e9eaec;border:1px solid #2b2e34;border-radius:16px 16px 0 0;padding:20px 20px calc(20px + env(safe-area-inset-bottom));box-shadow:0 20px 60px rgba(0,0,0,.45)}
.msync h3{margin:0 0 4px;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-weight:500;font-size:21px;color:#f2f2f3}
.msync p{margin:0 0 12px;font-size:13px;line-height:1.55;color:#a3a7ae}
.msync .qr{display:flex;justify-content:center;margin:8px 0 14px}
.msync .qr svg{width:220px;height:220px;background:#fff;padding:12px;border-radius:12px}
.msync .row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.msync .row.one{grid-template-columns:1fr}
.msync button{height:48px;border-radius:11px;border:1px solid #33363d;background:#202328;color:#e9eaec;font:inherit;font-weight:600;cursor:pointer}
.msync button.main{background:#d8b25e;border-color:#d8b25e;color:#17191d}
.msync .meta{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#d8b25e;margin-bottom:10px}`;

  function sheet(html) {
    if (!document.getElementById("msync-css")) { const st = document.createElement("style"); st.id = "msync-css"; st.textContent = CSS; document.head.appendChild(st); }
    const el = document.createElement("div");
    el.className = "msync";
    el.innerHTML = `<div class="sh">${html}</div>`;
    el.addEventListener("click", (e) => { if (e.target === el) el.remove(); });
    document.body.appendChild(el);
    return el;
  }

  function target() {
    const u = new URL(location.href);
    const base = u.pathname.replace(/[^/]*$/, "");
    const path = /\/labs\/$/.test(base) ? base + "pockle.html" : base + "labs/pockle.html";
    return u.origin + path;
  }

  async function send() {
    const { code, count } = await pack();
    const url = target() + "#sync=" + code;
    const kb = Math.round(url.length / 1024);
    const el = sheet(`<h3>Send progress</h3><div class="meta">${count} saves · ${kb} kB link</div>
      <p>Scan this with your other device, or share the link to yourself. It opens Pockle and merges your progress in, keeping the best of both.</p>
      <div class="qr" id="msyncQr"></div>
      <div class="row${navigator.share ? "" : " one"}"><button id="msyncCopy"${navigator.share ? "" : ' class="main"'}>Copy link</button>${navigator.share ? '<button class="main" id="msyncShare">Share</button>' : ""}</div>
      <div class="row one"><button id="msyncClose">Close</button></div>`);
    el.querySelector("#msyncClose").onclick = () => el.remove();
    el.querySelector("#msyncCopy").onclick = async () => { try { await navigator.clipboard.writeText(url); el.querySelector("#msyncCopy").textContent = "Copied"; } catch (e) { prompt("Copy this link", url); } };
    const sh = el.querySelector("#msyncShare");
    if (sh) sh.onclick = () => navigator.share({ title: "Mega Lab progress", url }).catch(() => {});
    const box = el.querySelector("#msyncQr");
    if (url.length > 2900) { box.innerHTML = `<p style="text-align:center">Too much progress for a QR code. Use Share or Copy link.</p>`; return; }
    try {
      const qrcode = await loadQr();
      const q = qrcode(0, "L"); q.addData(url, "Byte"); q.make();
      box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch (e) { box.innerHTML = `<p style="text-align:center">QR code needs internet. Use Share or Copy link.</p>`; }
  }

  async function receive(onDone) {
    const m = location.hash.match(/[#&]sync=([A-Za-z0-9_-]+)/);
    if (!m) return;
    history.replaceState(null, "", location.pathname + location.search);
    let p;
    try { p = await unpack(m[1]); } catch (e) { sheet(`<h3>Sync link broken</h3><p>${String(e.message || e)}. Make a new link on the other device.</p><div class="row one"><button class="main" onclick="this.closest('.msync').remove()">OK</button></div>`); return; }
    const when = new Date(p.at).toLocaleString();
    const el = sheet(`<h3>Load progress?</h3><div class="meta">${Object.keys(p.data).length} saves · made ${when}</div>
      <p>This merges the progress from your other device into this one. Finished lessons, xp and streaks keep the best of both. You can undo it straight after.</p>
      <div class="row"><button id="msyncNo">Not now</button><button class="main" id="msyncYes">Load it</button></div>`);
    el.querySelector("#msyncNo").onclick = () => el.remove();
    el.querySelector("#msyncYes").onclick = () => {
      const n = apply(p);
      el.innerHTML = `<div class="sh"><h3>Synced</h3><p>${n} lab saves updated on this device.</p><div class="row"><button id="msyncUndo">Undo</button><button class="main" id="msyncOk">Done</button></div></div>`;
      el.querySelector("#msyncOk").onclick = () => { el.remove(); onDone && onDone(n); };
      el.querySelector("#msyncUndo").onclick = () => { undo(); el.remove(); onDone && onDone(0); };
    };
  }

  function listen(onDone) { receive(onDone); window.addEventListener("hashchange", () => receive(onDone)); }

  window.MegaSync = { send, receive, listen, pack, unpack, apply, undo, merge };
})();
