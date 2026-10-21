/* İlk 1000 Günüm – ebeveyn uygulaması (PWA)
   Veri: Google Sheets (CSV). Profil ve ilerleme: telefonun kendi hafızası (localStorage). */
(function () {
  const CFG = window.APP_CONFIG;
  const $ = (sel) => document.querySelector(sel);
  const app = $("#app");

  /* ---------- Çeviriler (arayüz) ---------- */
  const T = {
    tr: {
      appName: "İlk 1000 Günüm", tagline: "Bebeğinin bu haftaki gelişimine uygun, 5 dakikalık Türkçe-İngilizce oyunlar ve kitaplar.",
      name: "Bebeğin adı", dob: "Doğum tarihi", premature: "Doğumda kaç haftalıktı?", term: "37 hafta ve üzeri (zamanında)",
      start: "Başlayalım", thisWeek: "Bu hafta", allActivities: "Tümü", books: "Kitaplar", settings: "Ayarlar",
      age: (m, w) => `${m} aylık` + (w ? ` (düzeltilmiş)` : ""), weekOf: "haftasının oyunları",
      howTo: "Nasıl oynanır", phrases: "Bebeğe söyle", materials: "Malzeme", goal: "Hedef", min: "dk",
      done: "Oynadık ✓", markDone: "Oynadık olarak işaretle", noData: "Bu yaş için henüz içerik yok.",
      loading: "İçerik yükleniyor…", offline: "İnternet yok; en son kaydedilen içerik gösteriliyor.",
      error: "İçerik yüklenemedi. İnternet bağlantını kontrol et.",
      whyBook: "Neden bu kitap", howRead: "Nasıl okunur", by: "", all: "Hepsi", buy: "Satın al", affiliate: "Bu bağlantıdan alışveriş yaparsan uygulamaya küçük bir destek olur.",
      alan: { motor_kaba: "Kaba motor", motor_ince: "İnce motor", dil: "Dil", bilissel: "Bilişsel", sosyal_duygusal: "Sosyal-duygusal" },
      disclaimer: "Bu uygulama genel gelişim bilgisi sunar; tıbbi tavsiye değildir. Bebeğinin gelişimiyle ilgili endişen varsa çocuk doktoruna başvur.",
      edit: "Profili düzenle", reset: "Sıfırla", refresh: "İçeriği yenile", installTip: "Telefona kur: Safari'de Paylaş → Ana Ekrana Ekle. Android'de menü → Ana ekrana ekle.",
      speak: "Sesli dinle", weekLabel: (n) => `${n}. hafta`, filterAge: "Yaşına uygun", showAll: "Tüm yaşlar",
      months: "ay", playedCount: (n) => `${n} oyun oynandı`,
    },
    en: {
      appName: "My First 1000 Days", tagline: "Five-minute Turkish-English games and books matched to your baby's development this week.",
      name: "Baby's name", dob: "Date of birth", premature: "Weeks of pregnancy at birth", term: "37 weeks or more (full term)",
      start: "Let's start", thisWeek: "This week", allActivities: "All", books: "Books", settings: "Settings",
      age: (m, w) => `${m} months` + (w ? ` (corrected)` : ""), weekOf: "'s games this week",
      howTo: "How to play", phrases: "Say to baby", materials: "Materials", goal: "Goal", min: "min",
      done: "Played ✓", markDone: "Mark as played", noData: "No content for this age yet.",
      loading: "Loading content…", offline: "You're offline; showing last saved content.",
      error: "Could not load content. Check your connection.",
      whyBook: "Why this book", howRead: "How to read it", by: "by ", all: "All", buy: "Buy", affiliate: "Buying through this link gives the app a small boost.",
      alan: { motor_kaba: "Gross motor", motor_ince: "Fine motor", dil: "Language", bilissel: "Cognitive", sosyal_duygusal: "Social-emotional" },
      disclaimer: "This app offers general developmental information, not medical advice. If you have concerns about your baby's development, talk to your paediatrician.",
      edit: "Edit profile", reset: "Reset", refresh: "Refresh content", installTip: "Install: in Safari tap Share → Add to Home Screen. On Android, menu → Add to Home screen.",
      speak: "Listen", weekLabel: (n) => `week ${n}`, filterAge: "For this age", showAll: "All ages",
      months: "mo", playedCount: (n) => `${n} games played`,
    }
  };

  /* ---------- Durum ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  let state = {
    lang: store.get("lang", "tr"),
    child: store.get("child", null),
    done: store.get("done", {}),
    tab: "week",
    filterAlan: "all",
    onlyAge: true,
    activities: [], books: [], loading: true, error: null, offline: false
  };
  const t = () => T[state.lang];

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    const rows = []; let row = [], field = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (q) {
        if (c === '"' && n === '"') { field += '"'; i++; }
        else if (c === '"') q = false;
        else field += c;
      } else {
        if (c === '"') q = true;
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\n" || c === "\r") { if (c === "\r" && n === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    const head = rows.shift().map(h => h.trim());
    return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
  }
  async function fetchCSV(url, cacheKey) {
    if (!url) return [];
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      const data = parseCSV(await res.text());
      store.set(cacheKey, data); store.set(cacheKey + "_at", Date.now());
      return data;
    } catch (e) {
      const cached = store.get(cacheKey, null);
      if (cached) { state.offline = true; return cached; }
      throw e;
    }
  }
  async function loadData() {
    state.loading = true; state.error = null; state.offline = false; render();
    try {
      const [a, b] = await Promise.all([fetchCSV(CFG.etkinliklerCsv, "etk"), fetchCSV(CFG.kitaplarCsv, "kit")]);
      const ok = (r) => CFG.gosterilecekDurumlar.includes((r.durum || "").trim());
      state.activities = a.filter(ok); state.books = b.filter(ok);
    } catch (e) { state.error = t().error; }
    state.loading = false; render();
  }

  /* ---------- Yaş hesabı ---------- */
  function ageInfo(child) {
    const dob = new Date(child.dob + "T00:00:00");
    const now = new Date();
    let corrected = new Date(dob);
    const ga = Number(child.ga || 40);
    if (ga < 37) corrected.setDate(corrected.getDate() + (40 - ga) * 7);
    const diffDays = Math.floor((now - corrected) / 86400000);
    const months = Math.max(0, Math.floor(diffDays / 30.4375));
    const weeks = Math.max(0, Math.floor(diffDays / 7));
    return { months, weeks, correctedUsed: ga < 37, days: diffDays };
  }

  /* ---------- Haftalık seçim: aynı hafta her açılışta aynı set, her hafta döner ---------- */
  function pickWeekly(list, weekIdx, n) {
    if (!list.length) return [];
    const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
    const out = [], start = (weekIdx * n) % sorted.length;
    for (let i = 0; i < Math.min(n, sorted.length); i++) out.push(sorted[(start + i) % sorted.length]);
    return out;
  }
  function balancedWeekly(list, weekIdx, n) {
    // Mümkünse farklı gelişim alanlarından seç
    const byAlan = {};
    list.forEach(a => (byAlan[a.alan] = byAlan[a.alan] || []).push(a));
    const alans = Object.keys(byAlan).sort();
    if (alans.length < 2) return pickWeekly(list, weekIdx, n);
    const out = [], used = new Set();
    let i = 0;
    while (out.length < Math.min(n, list.length) && i < n * 4) {
      const alan = alans[(weekIdx + i) % alans.length];
      const pool = byAlan[alan].sort((a, b) => a.id.localeCompare(b.id));
      const cand = pool[Math.floor((weekIdx + i) / alans.length) % pool.length];
      if (cand && !used.has(cand.id)) { used.add(cand.id); out.push(cand); }
      i++;
    }
    return out;
  }
  const fitsAge = (r, months) => Number(r.ay_min) <= months && months < Number(r.ay_max || 99) + (Number(r.ay_max) === 36 ? 1 : 0);

  /* ---------- Ses (ücretsiz, telefonun kendi TTS'i) ---------- */
  function speak(text, lang) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ""));
    u.lang = lang === "tr" ? "tr-TR" : "en-US"; u.rate = 0.9;
    const v = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith(lang === "tr" ? "tr" : "en"));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  /* ---------- Yardımcılar ---------- */
  const esc = (s) => String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lines = (s) => String(s || "").split(/\n+/).map(x => x.trim()).filter(Boolean);
  const L = (r, key) => r[key + "_" + state.lang] || r[key + "_tr"] || "";

  /* ---------- Görünümler ---------- */
  function header(sub) {
    return `<div class="top"><div><h1>${esc(t().appName)}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div>
      <div class="lang"><button data-lang="tr" class="${state.lang === "tr" ? "on" : ""}">TR</button><button data-lang="en" class="${state.lang === "en" ? "on" : ""}">EN</button></div></div>`;
  }
  function onboarding() {
    const c = state.child || {};
    return header() + `
      <div class="hero"><div class="emoji">🐣</div><h1>${esc(t().appName)}</h1><p>${esc(t().tagline)}</p></div>
      <form class="card form" id="onb">
        <label>${t().name}</label><input name="name" required maxlength="30" value="${esc(c.name || "")}" placeholder="Defne">
        <label>${t().dob}</label><input name="dob" type="date" required value="${esc(c.dob || "")}" max="${new Date().toISOString().slice(0, 10)}">
        <label>${t().premature}</label>
        <select name="ga">${[40, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24].map(w => `<option value="${w}" ${Number(c.ga || 40) === w ? "selected" : ""}>${w === 40 ? t().term : w + (state.lang === "tr" ? " hafta" : " weeks")}</option>`).join("")}</select>
        <button class="primary" type="submit">${t().start}</button>
      </form>
      <p class="footer-note">${esc(t().disclaimer)}</p>`;
  }
  function activityCard(a, compact) {
    const isDone = !!state.done[a.id];
    const alanName = t().alan[a.alan] || a.alan;
    const ph = lines(L(a, "cumleler"));
    return `<div class="card" data-id="${esc(a.id)}">
      <h2>${esc(L(a, "baslik"))}</h2>
      <div class="meta"><span class="pill alan" style="background:var(--${esc(a.alan)})">${esc(alanName)}</span>
        <span class="pill">⏱ ${esc(a.sure_dk)} ${t().min}</span><span class="pill">${esc(a.ay_min)}–${esc(a.ay_max)} ${t().months}</span></div>
      <h3>${t().howTo}</h3><ul class="steps">${lines(L(a, "nasil")).map(s => `<li>${esc(s)}</li>`).join("")}</ul>
      ${ph.length ? `<h3>${t().phrases}</h3>` + ph.map(p => `<div class="phrase"><span>${esc(p)}</span><button data-speak="${esc(p)}" aria-label="${t().speak}">🔊</button></div>`).join("") : ""}
      ${a.malzeme && a.malzeme !== "Yok" ? `<p class="small"><b>${t().materials}:</b> ${esc(a.malzeme)}</p>` : ""}
      ${a.hedef_beceri ? `<p class="small"><b>${t().goal}:</b> ${esc(a.hedef_beceri)}</p>` : ""}
      ${a.uyari ? `<div class="warn">⚠️ ${esc(a.uyari)}</div>` : ""}
      <button class="done-btn ${isDone ? "on" : ""}" data-done="${esc(a.id)}">${isDone ? t().done : t().markDone}</button>
    </div>`;
  }
  function bookCard(b) {
    const neden = L(b, "neden") || b.neden_bu_kitap || "";
    const nasil = L(b, "nasil") || b.nasil_okunur || "";
    const link = (state.lang === "en" ? (b.link_en || b.link_tr) : (b.link_tr || b.link_en)) || "";
    const safeLink = /^https?:\/\//i.test(link) ? link : "";
    return `<div class="card"><h2>${esc(b.kitap_adi)}</h2>
      <div class="meta"><span class="pill">${b.dil === "tr" ? "🇹🇷 Türkçe" : "🇬🇧 English"}</span>${b.tur ? `<span class="pill">${esc(b.tur)}</span>` : ""}<span class="pill">${esc(b.ay_min)}–${esc(b.ay_max)} ${t().months}</span></div>
      ${b.yazar ? `<p class="small">${t().by}${esc(b.yazar)}</p>` : ""}
      ${neden ? `<h3>${t().whyBook}</h3><p>${esc(neden)}</p>` : ""}
      ${nasil ? `<h3>${t().howRead}</h3><p>${esc(nasil)}</p>` : ""}
      ${safeLink ? `<a class="done-btn buy" href="${esc(safeLink)}" target="_blank" rel="noopener sponsored">${t().buy}</a><p class="small">${t().affiliate}</p>` : ""}</div>`;
  }
  function nav() {
    const items = [["week", "🗓", t().thisWeek], ["all", "🧸", t().allActivities], ["books", "📚", t().books], ["settings", "⚙️", t().settings]];
    return `<div class="nav">${items.map(([k, i, l]) => `<button data-tab="${k}" class="${state.tab === k ? "on" : ""}"><span class="i">${i}</span>${l}</button>`).join("")}</div>`;
  }
  function main() {
    const info = ageInfo(state.child);
    const sub = `${esc(state.child.name)} · ${t().age(info.months, info.correctedUsed)}`;
    let body = "";
    if (state.loading) body = `<div class="loading">${t().loading}</div>`;
    else if (state.error && !state.activities.length) body = `<div class="error">${t().error}</div>`;
    else {
      const notice = state.offline ? `<div class="install-tip">📴 ${t().offline}</div>` : "";
      if (state.tab === "week") {
        const fit = state.activities.filter(a => fitsAge(a, info.months));
        const picks = balancedWeekly(fit, info.weeks, CFG.haftalikEtkinlikSayisi);
        const bookFit = state.books.filter(b => fitsAge(b, info.months));
        const bookPicks = pickWeekly(bookFit, info.weeks, CFG.haftalikKitapSayisi);
        const doneCount = Object.keys(state.done).length;
        body = notice + `<div class="section"><h2>${esc(state.child.name)}${state.lang === "tr" ? "'in " + info.weeks + ". " + t().weekOf : t().weekOf}</h2></div>
          ${doneCount ? `<p class="small">${t().playedCount(doneCount)}</p>` : ""}
          ${picks.length ? picks.map(a => activityCard(a)).join("") : `<div class="card">${t().noData}</div>`}
          ${bookPicks.length ? `<div class="section"><h2>📚 ${t().books}</h2></div>` + bookPicks.map(bookCard).join("") : ""}`;
      } else if (state.tab === "all") {
        let list = state.onlyAge ? state.activities.filter(a => fitsAge(a, info.months)) : state.activities;
        if (state.filterAlan !== "all") list = list.filter(a => a.alan === state.filterAlan);
        list = [...list].sort((a, b) => Number(a.ay_min) - Number(b.ay_min) || a.id.localeCompare(b.id));
        const alans = ["all", ...Object.keys(t().alan)];
        body = notice + `<div class="filters"><button data-age="toggle" class="${state.onlyAge ? "on" : ""}">${state.onlyAge ? t().filterAge : t().showAll}</button>
          ${alans.map(k => `<button data-alan="${k}" class="${state.filterAlan === k ? "on" : ""}">${k === "all" ? t().all : t().alan[k]}</button>`).join("")}</div>
          <p class="small">${list.length}</p>${list.map(a => activityCard(a)).join("")}`;
      } else if (state.tab === "books") {
        let list = state.onlyAge ? state.books.filter(b => fitsAge(b, info.months)) : state.books;
        list = [...list].sort((a, b) => Number(a.ay_min) - Number(b.ay_min) || a.dil.localeCompare(b.dil));
        body = notice + `<div class="filters"><button data-age="toggle" class="${state.onlyAge ? "on" : ""}">${state.onlyAge ? t().filterAge : t().showAll}</button></div>${list.map(bookCard).join("")}`;
      } else {
        body = `<div class="card"><h2>${esc(state.child.name)}</h2><p class="small">${t().dob}: ${esc(state.child.dob)} · ${t().age(info.months, info.correctedUsed)}</p>
          <button class="primary" data-act="edit">${t().edit}</button>
          <button class="done-btn" data-act="refresh">${t().refresh}</button>
          <button class="done-btn" data-act="reset" style="border-color:#c66;color:#c66">${t().reset}</button></div>
          <div class="install-tip">📲 ${t().installTip}</div>
          <p class="footer-note">${esc(t().disclaimer)}</p>`;
      }
    }
    return header(sub) + body + nav();
  }
  function render(force) {
    const showMain = state.child && !state.editing;
    // Form doldurulurken arka planda veri gelirse formu silme
    if (!showMain && !force && document.getElementById("onb")) return;
    document.documentElement.lang = state.lang;
    app.innerHTML = showMain ? main() : onboarding();
    window.scrollTo({ top: Math.min(window.scrollY, 0) });
  }

  /* ---------- Olaylar ---------- */
  app.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.lang) { state.lang = b.dataset.lang; store.set("lang", state.lang); render(true); }
    else if (b.dataset.tab) { state.tab = b.dataset.tab; render(); window.scrollTo(0, 0); }
    else if (b.dataset.speak) { speak(b.dataset.speak, state.lang); }
    else if (b.dataset.done) { const id = b.dataset.done; if (state.done[id]) delete state.done[id]; else state.done[id] = Date.now(); store.set("done", state.done); render(); }
    else if (b.dataset.alan) { state.filterAlan = b.dataset.alan; render(); }
    else if (b.dataset.age) { state.onlyAge = !state.onlyAge; render(); }
    else if (b.dataset.act === "edit") { state.editing = true; render(true); }
    else if (b.dataset.act === "refresh") { loadData(); }
    else if (b.dataset.act === "reset") { if (confirm(state.lang === "tr" ? "Tüm veriler silinsin mi?" : "Delete all data?")) { localStorage.clear(); location.reload(); } }
  });
  app.addEventListener("submit", (e) => {
    if (e.target.id !== "onb") return;
    e.preventDefault();
    const f = new FormData(e.target);
    state.child = { name: f.get("name").trim(), dob: f.get("dob"), ga: Number(f.get("ga")) };
    store.set("child", state.child); state.editing = false; state.tab = "week"; render();
    if (!state.activities.length) loadData();
  });

  /* ---------- Başlat ---------- */
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => {};
  render();
  loadData();
})();
