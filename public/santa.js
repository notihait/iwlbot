// =========================
// ТАЙНЫЙ САНТА + СЕЗОННЫЙ БАННЕР (мини-апп)
// Подключается ДО app.js. Инициализируется из app.js: window.initSanta({...})
// =========================
(function () {
    const CURRENCIES = ["RUB", "USD", "EUR", "UAH", "KZT", "BYN"];
  
    const ERRORS = {
      "event not found": "Игра не найдена. Проверь код.",
      "already drawn": "Жеребьёвка уже проведена.",
      "forbidden": "Это может сделать только создатель игры.",
      "not enough participants": "Участников пока недостаточно для жеребьёвки."
    };
  
    // Иконка Деда Мороза для круглой кнопки.
    // Если хочется проще — замени всё содержимое на: `<span style="font-size:24px;line-height:1">🎅</span>`
    const SANTA_ICON = `
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="9" y="16" width="14" height="9" rx="4" fill="#fde2c8"/>
        <path d="M7 19 C7 28 11 30.5 16 30.5 C21 30.5 25 28 25 19 C23 22.3 20 23 16 23 C12 23 9 22.3 7 19 Z"
              fill="#fff" stroke="#dc2626" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M7 14 C7 8 11 4 17 4 C20 4 23 5.5 25 8 L25 14 Z" fill="#dc2626"/>
        <rect x="5" y="13" width="22" height="4.5" rx="2.25" fill="#fff" stroke="#dc2626" stroke-width="1.4"/>
        <circle cx="26" cy="7.5" r="2.6" fill="#fff" stroke="#dc2626" stroke-width="1.4"/>
        <circle cx="13.2" cy="20" r="0.9" fill="#1f2937"/>
        <circle cx="18.8" cy="20" r="0.9" fill="#1f2937"/>
        <circle cx="16" cy="21.4" r="1.2" fill="#f87171"/>
      </svg>`;
  
    const CSS = `
      /* --- круглая кнопка Санты (над основной «+») --- */
      .santa-fab { position: fixed; right: 22px; bottom: 96px; width: 44px; height: 44px; border-radius: 50%;
        border: 2px solid #dc2626; background: #fff; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 14px rgba(220,38,38,.3); cursor: pointer; padding: 0; z-index: 40; }
      .santa-fab:active { transform: scale(.94); }
  
      /* --- сезонный баннер --- */
      .santa-banner { position: relative; display: flex; align-items: center; gap: 12px; margin: 0 0 16px;
        padding: 14px 40px 14px 16px; border-radius: 18px; color: #fff; overflow: hidden;
        background:
          radial-gradient(circle at 12% 30%, rgba(255,255,255,.25) 0 2px, transparent 3px),
          radial-gradient(circle at 70% 20%, rgba(255,255,255,.2) 0 2px, transparent 3px),
          radial-gradient(circle at 88% 75%, rgba(255,255,255,.25) 0 2px, transparent 3px),
          radial-gradient(circle at 40% 85%, rgba(255,255,255,.18) 0 2px, transparent 3px),
          linear-gradient(135deg, #b91c1c 0%, #8b5cf6 100%); }
      .santa-banner-text { flex: 1; min-width: 0; }
      .santa-banner-title { font-weight: 700; font-size: 16px; line-height: 1.25; }
      .santa-banner-sub { font-size: 13px; opacity: .92; margin-top: 3px; line-height: 1.3; }
      .santa-banner-cta { flex-shrink: 0; border: 0; border-radius: 12px; padding: 9px 12px; font-size: 14px;
        font-weight: 600; background: #fff; color: #b91c1c; cursor: pointer; }
      .santa-banner-close { position: absolute; top: 6px; right: 8px; border: 0; background: transparent;
        color: rgba(255,255,255,.85); font-size: 15px; width: 28px; height: 28px; cursor: pointer; }
  
      /* --- окно Санты --- */
      .santa-badge { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #ede9fe; color: #6d28d9; }
      .santa-badge.drawn { background: #dcfce7; color: #166534; }
      .santa-modal { position: fixed; inset: 0; z-index: 500; display: none; }
      .santa-modal.open { display: block; }
      .santa-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.45); }
      .santa-panel { position: absolute; left: 0; right: 0; bottom: 0; max-height: 92vh; overflow-y: auto;
        background: #fff; color: #1a1a1a; border-radius: 20px 20px 0 0; padding: 20px 16px 28px; box-sizing: border-box; }
      .santa-panel h2 { margin: 0 0 4px; font-size: 20px; padding-right: 36px; }
      .santa-close { position: absolute; top: 12px; right: 14px; border: 0; background: #f3f4f6; width: 32px; height: 32px;
        border-radius: 16px; font-size: 16px; cursor: pointer; }
      .santa-back { border: 0; background: transparent; color: #6d28d9; font-size: 14px; font-weight: 600;
        padding: 0 0 10px; cursor: pointer; }
      .santa-meta { color: #6b7280; font-size: 14px; margin: 4px 0 14px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .santa-block { border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px; margin-bottom: 12px; }
      .santa-block h4 { margin: 0 0 8px; font-size: 15px; }
      .santa-input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 12px;
        font-size: 16px; margin-bottom: 10px; background: #fff; color: #1a1a1a; }
      .santa-row { display: flex; gap: 8px; }
      .santa-row > * { flex: 1; }
      .santa-btn { border: 0; border-radius: 12px; padding: 12px 14px; font-size: 15px; font-weight: 600; cursor: pointer;
        background: #8b5cf6; color: #fff; width: 100%; }
      .santa-btn.secondary { background: #ede9fe; color: #6d28d9; }
      .santa-btn[disabled] { opacity: .6; }
      .santa-plist { list-style: none; margin: 0; padding: 0; }
      .santa-plist li { padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; }
      .santa-plist li:last-child { border-bottom: 0; }
      .santa-target { text-align: center; padding: 8px 0 4px; }
      .santa-target .name { font-size: 20px; font-weight: 700; margin: 6px 0 12px; }
      .santa-invite { word-break: break-all; font-size: 13px; color: #6b7280; margin-bottom: 8px; }
    `;
  
    // ---------- сезонный баннер: данные ----------
    function pluralDays(n) {
      const m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return "день";
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "дня";
      return "дней";
    }
  
    // Возвращает описание баннера на сегодня или null, если сезона нет.
    // Сейчас один сезон: Новый год (с 15 ноября по 10 января).
    function seasonInfo() {
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  
      if ((m === 10 && d >= 15) || m === 11) {
        const days = Math.round((new Date(y + 1, 0, 1) - new Date(y, m, d)) / 86400000);
        return {
          key: "ny_" + y,
          title: `🎄 До Нового года ${days} ${pluralDays(days)}`,
          sub: "Составь вишлист и сыграй в Тайного Санту",
          cta: true
        };
      }
      if (m === 0 && d <= 10) {
        return {
          key: "ny_" + (y - 1),
          title: "🎉 С Новым годом!",
          sub: "Пусть все желания из вишлистов сбываются",
          cta: false
        };
      }
      return null;
    }
  
    window.initSanta = function (ctx) {
      const { authFetch, tg, loadGifts, escapeHtml, formatDateRu, currencySymbol, botUsername } = ctx;
  
      // ---------- стили ----------
      const styleEl = document.createElement("style");
      styleEl.textContent = CSS;
      document.head.appendChild(styleEl);
  
      // ---------- модальное окно ----------
      const modal = document.createElement("div");
      modal.className = "santa-modal";
      modal.innerHTML = `<div class="santa-backdrop"></div><div class="santa-panel"><button class="santa-close" aria-label="Закрыть">✕</button><div class="santa-body"></div></div>`;
      document.body.appendChild(modal);
      const bodyEl = modal.querySelector(".santa-body");
      modal.querySelector(".santa-backdrop").onclick = closeModal;
      modal.querySelector(".santa-close").onclick = closeModal;
  
      function openModal(html) {
        bodyEl.innerHTML = html;
        modal.classList.add("open");
        modal.querySelector(".santa-panel").scrollTop = 0;
      }
      function closeModal() {
        modal.classList.remove("open");
        bodyEl.innerHTML = "";
      }
      function wireBack() {
        const b = bodyEl.querySelector("#sBack");
        if (b) b.onclick = showHome;
      }
  
      // ---------- хелперы ----------
      async function api(url, method = "GET", body) {
        const opts = { method };
        if (body !== undefined) {
          opts.headers = { "Content-Type": "application/json" };
          opts.body = JSON.stringify(body);
        }
        const res = await authFetch(url, opts);
        let data = null;
        try { data = await res.json(); } catch (e) { /* пустой/не-JSON ответ */ }
        return { ok: res.ok && data?.ok !== false, data };
      }
  
      function errText(data) {
        return ERRORS[data?.error] || data?.error || "Ошибка. Попробуй ещё раз.";
      }
  
      function notify(msg) {
        if (tg?.showAlert) tg.showAlert(msg);
        else alert(msg);
      }
  
      function inviteLink(code) {
        return `https://t.me/${botUsername}?startapp=santa_${code}`;
      }
  
      async function copyText(text) {
        try {
          await navigator.clipboard.writeText(text);
          notify("Скопировано:\n" + text);
        } catch (e) {
          prompt("Скопируй вручную:", text);
        }
      }
  
      function budgetLine(g) {
        return g.budget ? `💰 ${escapeHtml(g.budget)} ${currencySymbol(g.currency)}` : "";
      }
  
      function statusBadge(g) {
        return g.status === "open"
          ? `<span class="santa-badge">набор участников</span>`
          : `<span class="santa-badge drawn">жеребьёвка проведена</span>`;
      }
  
      // ---------- главный экран Санты: список игр ----------
      function showHome() {
        openModal(`
          <h2>🎅 Тайный Санта</h2>
          <div class="santa-meta">Анонимный обмен подарками с друзьями</div>
          <div class="santa-row" style="margin-bottom:14px">
            <button class="santa-btn" id="sNew">+ Создать игру</button>
            <button class="santa-btn secondary" id="sJoinOpen">🔑 Вступить по коду</button>
          </div>
          <div id="santaList"><div class="gifts-empty">Загрузка…</div></div>
        `);
        bodyEl.querySelector("#sNew").onclick = renderCreate;
        bodyEl.querySelector("#sJoinOpen").onclick = () => renderJoin();
        loadMine();
      }
  
      async function loadMine() {
        const { data } = await api("/api/santa/mine");
        const listEl = bodyEl.querySelector("#santaList");
        if (!listEl) return; // пользователь уже ушёл с этого экрана
        if (!Array.isArray(data) || data.length === 0) {
          listEl.innerHTML = `<div class="gifts-empty">Пока нет игр. Создай свою или вступи по коду 🎄</div>`;
          return;
        }
        listEl.innerHTML = data.map((g) => {
          const dateStr = formatDateRu(g.exchange_date);
          return `
            <div class="tag-card santa-card" data-id="${g.id}">
              <div class="tag-card-head">
                <div class="tag-card-title">🎅 ${escapeHtml(g.title)}</div>
                <div class="tag-date ${dateStr ? "" : "no-date"}">${dateStr ? "📅 " + dateStr : "без даты"}</div>
              </div>
              <div class="santa-meta">${statusBadge(g)} ${budgetLine(g)}</div>
            </div>`;
        }).join("");
        listEl.querySelectorAll(".santa-card").forEach((el) => {
          el.onclick = () => openGame(el.dataset.id);
        });
      }
  
      // ---------- создание игры ----------
      function renderCreate() {
        openModal(`
          <button class="santa-back" id="sBack">← Назад</button>
          <h2>Новая игра</h2>
          <div class="santa-meta">Тайный Санта</div>
          <input class="santa-input" id="sTitle" placeholder="Название, например «Новый год в офисе»" maxlength="200">
          <input class="santa-input" id="sDate" type="date">
          <div class="santa-row">
            <input class="santa-input" id="sBudget" type="text" inputmode="numeric" placeholder="Бюджет">
            <select class="santa-input" id="sCurrency">
              ${CURRENCIES.map((c) => `<option value="${c}">${c} ${currencySymbol(c)}</option>`).join("")}
            </select>
          </div>
          <div class="form-status" id="sStatus"></div>
          <button class="santa-btn" id="sCreate">Создать игру</button>
        `);
        wireBack();
  
        let busy = false;
        bodyEl.querySelector("#sCreate").onclick = async (e) => {
          if (busy) return;
          const status = bodyEl.querySelector("#sStatus");
          const title = bodyEl.querySelector("#sTitle").value.trim();
          const date = bodyEl.querySelector("#sDate").value;
          const budgetRaw = bodyEl.querySelector("#sBudget").value.trim();
          const currency = bodyEl.querySelector("#sCurrency").value;
  
          if (!title || title.length > 200) { status.textContent = "❌ Введи название (до 200 символов)"; status.className = "form-status error"; return; }
          if (!/^[1-9]\d*$/.test(budgetRaw)) { status.textContent = "❌ Бюджет — целое число больше нуля"; status.className = "form-status error"; return; }
  
          busy = true;
          e.target.disabled = true;
          const { ok, data } = await api("/api/santa", "POST", {
            title, exchange_date: date || null, budget: Number(budgetRaw), currency
          });
          busy = false;
          e.target.disabled = false;
  
          if (!ok) { status.textContent = "❌ " + errText(data); status.className = "form-status error"; return; }
          openGame(data.id);
        };
      }
  
      // ---------- вступление по коду ----------
      function renderJoin(prefill = "") {
        openModal(`
          <button class="santa-back" id="sBack">← Назад</button>
          <h2>Вступить в игру</h2>
          <div class="santa-meta">Введи код приглашения</div>
          <input class="santa-input" id="sCode" placeholder="Код" value="${escapeHtml(prefill)}" autocapitalize="off" autocomplete="off">
          <div class="form-status" id="sStatus"></div>
          <button class="santa-btn" id="sJoin">Вступить</button>
        `);
        wireBack();
        bodyEl.querySelector("#sJoin").onclick = (e) => {
          const code = bodyEl.querySelector("#sCode").value.trim();
          if (!code) return;
          joinByCode(code, e.target);
        };
      }
  
      async function joinByCode(code, btn) {
        if (btn) btn.disabled = true;
        const { ok, data } = await api(`/api/santa/join/${encodeURIComponent(code)}`, "POST", {});
        if (btn) btn.disabled = false;
  
        if (!ok) {
          const status = bodyEl.querySelector("#sStatus");
          if (status && modal.classList.contains("open")) {
            status.textContent = "❌ " + errText(data);
            status.className = "form-status error";
          } else {
            notify(errText(data));
          }
          return;
        }
        openGame(data.id);
      }
  
      // ---------- экран игры ----------
      async function openGame(id) {
        openModal(`<button class="santa-back" id="sBack">← К списку</button><div class="gifts-empty">Загрузка…</div>`);
        wireBack();
  
        const { ok, data: g } = await api(`/api/santa/${id}`);
        if (!ok || !g) {
          openModal(`<button class="santa-back" id="sBack">← К списку</button><h2>Не получилось 😕</h2><div class="santa-meta">${escapeHtml(errText(g))}</div>`);
          wireBack();
          return;
        }
  
        const isOpen = g.status === "open";
        const dateStr = formatDateRu(g.exchange_date);
        const participants = g.participants || [];
  
        let html = `
          <button class="santa-back" id="sBack">← К списку</button>
          <h2>🎅 ${escapeHtml(g.title)}</h2>
          <div class="santa-meta">
            ${statusBadge(g)}
            ${dateStr ? `<span>📅 ${dateStr}</span>` : ""}
            ${budgetLine(g) ? `<span>${budgetLine(g)}</span>` : ""}
          </div>
        `;
  
        if (isOpen && g.invite_code) {
          html += `
            <div class="santa-block">
              <h4>Пригласить друзей</h4>
              <div class="santa-invite">${escapeHtml(inviteLink(g.invite_code))}</div>
              <div class="santa-row">
                <button class="santa-btn secondary" id="sCopyLink">🔗 Ссылка</button>
                <button class="santa-btn secondary" id="sCopyCode">Код: ${escapeHtml(g.invite_code)}</button>
              </div>
            </div>`;
        }
  
        html += `
          <div class="santa-block">
            <h4>Участники (${participants.length})</h4>
            <ul class="santa-plist">
              ${participants.map((p) => `<li>${escapeHtml(p.first_name || "Без имени")}</li>`).join("")}
            </ul>
          </div>`;
  
        if (isOpen) {
          html += `
            <div class="santa-block">
              <h4>Мой вишлист для Санты</h4>
              <select class="santa-input" id="sWishSelect"><option value="">Загрузка…</option></select>
              <div class="form-status" id="sWishStatus"></div>
              <button class="santa-btn secondary" id="sWishSave">Прикрепить вишлист</button>
            </div>`;
          if (g.is_owner) {
            html += `<button class="santa-btn" id="sDraw">🎲 Провести жеребьёвку</button>`;
          } else {
            html += `<div class="santa-meta">Жеребьёвку проведёт создатель игры.</div>`;
          }
        } else {
          html += `
            <div class="santa-block" id="sTargetBlock">
              <h4>Тебе выпал(а)</h4>
              <div class="gifts-empty">Загрузка…</div>
            </div>`;
        }
  
        openModal(html);
        wireBack();
  
        const copyLink = bodyEl.querySelector("#sCopyLink");
        if (copyLink) copyLink.onclick = () => copyText(inviteLink(g.invite_code));
        const copyCode = bodyEl.querySelector("#sCopyCode");
        if (copyCode) copyCode.onclick = () => copyText(g.invite_code);
  
        if (isOpen) {
          await setupWishlistPicker(g);
          const drawBtn = bodyEl.querySelector("#sDraw");
          if (drawBtn) drawBtn.onclick = () => confirmDraw(g);
        } else {
          await renderTarget(g);
        }
      }
  
      // ---------- выбор вишлиста ----------
      async function setupWishlistPicker(g) {
        const select = bodyEl.querySelector("#sWishSelect");
        const status = bodyEl.querySelector("#sWishStatus");
        const saveBtn = bodyEl.querySelector("#sWishSave");
        if (!select) return;
  
        const { data } = await api("/api/wishlists");
        if (!Array.isArray(data) || data.length === 0) {
          select.innerHTML = `<option value="">У тебя пока нет вишлистов</option>`;
          saveBtn.disabled = true;
          return;
        }
        select.innerHTML = `<option value="">— выбери вишлист —</option>` +
          data.map((w) => `<option value="${w.id}">${escapeHtml(w.title)}</option>`).join("");
  
        saveBtn.onclick = async () => {
          const wid = select.value;
          if (!wid) { status.textContent = "❌ Выбери вишлист"; status.className = "form-status error"; return; }
          saveBtn.disabled = true;
          const res = await api(`/api/santa/${g.id}/wishlist`, "PUT", { wishlist_id: Number(wid) });
          saveBtn.disabled = false;
          if (res.ok) { status.textContent = "✅ Вишлист прикреплён"; status.className = "form-status success"; }
          else { status.textContent = "❌ " + errText(res.data); status.className = "form-status error"; }
        };
      }
  
      // ---------- жеребьёвка ----------
      function confirmDraw(g) {
        const run = async () => {
          const btn = bodyEl.querySelector("#sDraw");
          if (btn) btn.disabled = true;
          const { ok, data } = await api(`/api/santa/${g.id}/draw`, "POST", {});
          if (!ok) {
            if (btn) btn.disabled = false;
            notify(errText(data));
            return;
          }
          openGame(g.id);
        };
  
        if (tg?.showPopup) {
          tg.showPopup({
            title: "Провести жеребьёвку?",
            message: "После этого новые участники вступить не смогут, а пары изменить нельзя.",
            buttons: [
              { id: "cancel", type: "cancel" },
              { id: "go", type: "default", text: "Провести" }
            ]
          }, (id) => { if (id === "go") run(); });
        } else if (confirm("Провести жеребьёвку? Это нельзя отменить.")) {
          run();
        }
      }
  
      // ---------- «кому я дарю» ----------
      async function renderTarget(g) {
        const block = bodyEl.querySelector("#sTargetBlock");
        if (!block) return;
        const { ok, data } = await api(`/api/santa/${g.id}/my-target`);
        if (!ok || !data?.receiver) {
          block.innerHTML = `<h4>Тебе выпал(а)</h4><div class="gifts-empty">${escapeHtml(errText(data))}</div>`;
          return;
        }
        block.innerHTML = `
          <div class="santa-target">
            <div>🎁 Ты даришь подарок</div>
            <div class="name">${escapeHtml(data.receiver.first_name || "Без имени")}</div>
          </div>
          <div class="gifts-grid" id="sTargetGifts"></div>
        `;
        const grid = block.querySelector("#sTargetGifts");
        if (data.wishlist_id) {
          await loadGifts(data.wishlist_id, grid, true);
        } else {
          grid.innerHTML = `<div class="gifts-empty">Он(а) пока не прикрепил(а) вишлист 🎈</div>`;
        }
      }
  
      // ---------- круглая кнопка над основной «+» ----------
      function mountFab() {
        const mainFab = document.getElementById("fabCreate");
        const btn = document.createElement("button");
        btn.className = "santa-fab";
        btn.type = "button";
        btn.setAttribute("aria-label", "Тайный Санта");
        btn.innerHTML = SANTA_ICON;
        btn.onclick = showHome;
        document.body.appendChild(btn);
        if (!mainFab) return;
  
        let raf = null;
        function place() {
          raf = null;
          const r = mainFab.getBoundingClientRect();
          if (!r.width) return;
          const size = 44;
          // центрируем над основной кнопкой, на 12px выше неё
          btn.style.right = Math.max(0, window.innerWidth - r.right + (r.width - size) / 2) + "px";
          btn.style.bottom = Math.max(0, window.innerHeight - r.top + 12) + "px";
          const z = parseInt(getComputedStyle(mainFab).zIndex, 10);
          btn.style.zIndex = isNaN(z) ? 40 : z;
        }
        const schedule = () => { if (!raf) raf = requestAnimationFrame(place); };
  
        place();
        setTimeout(place, 300);
        window.addEventListener("resize", schedule);
        window.addEventListener("scroll", schedule, { passive: true });
        if (tg?.onEvent) tg.onEvent("viewportChanged", schedule);
      }
  
      // ---------- сезонный баннер ----------
      function mountBanner() {
        const season = seasonInfo();
        if (!season) return;
  
        const storageKey = "santa_banner_closed_" + season.key;
        try { if (localStorage.getItem(storageKey)) return; } catch (e) { /* хранилище недоступно */ }
  
        const host = document.getElementById("mainContent");
        if (!host) return;
  
        const banner = document.createElement("div");
        banner.className = "santa-banner";
        banner.innerHTML = `
          <button class="santa-banner-close" aria-label="Скрыть">✕</button>
          <div class="santa-banner-text">
            <div class="santa-banner-title">${escapeHtml(season.title)}</div>
            <div class="santa-banner-sub">${escapeHtml(season.sub)}</div>
          </div>
          ${season.cta ? `<button class="santa-banner-cta">🎅 Играть</button>` : ""}
        `;
        host.insertBefore(banner, host.firstChild);
  
        banner.querySelector(".santa-banner-close").onclick = () => {
          banner.remove();
          try { localStorage.setItem(storageKey, "1"); } catch (e) { /* ничего страшного */ }
        };
        const cta = banner.querySelector(".santa-banner-cta");
        if (cta) cta.onclick = showHome;
      }
  
      mountBanner();
      mountFab();
  
      return { open: showHome, joinByCode: (code) => joinByCode(code) };
    };
  })();