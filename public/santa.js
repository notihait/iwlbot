// =========================
// ТАЙНЫЙ САНТА (мини-апп)
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
  
    const CSS = `
      .santa-section { margin-top: 24px; }
      .santa-actions { display: flex; gap: 8px; margin: 0 0 12px; flex-wrap: wrap; }
      .santa-badge { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #ede9fe; color: #6d28d9; }
      .santa-badge.drawn { background: #dcfce7; color: #166534; }
      .santa-modal { position: fixed; inset: 0; z-index: 2000; display: none; }
      .santa-modal.open { display: block; }
      .santa-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.45); }
      .santa-panel { position: absolute; left: 0; right: 0; bottom: 0; max-height: 92vh; overflow-y: auto;
        background: #fff; color: #1a1a1a; border-radius: 20px 20px 0 0; padding: 20px 16px 28px; box-sizing: border-box; }
      .santa-panel h2 { margin: 0 0 4px; font-size: 20px; padding-right: 36px; }
      .santa-close { position: absolute; top: 12px; right: 14px; border: 0; background: #f3f4f6; width: 32px; height: 32px;
        border-radius: 16px; font-size: 16px; cursor: pointer; }
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
  
    window.initSanta = function (ctx) {
      const { authFetch, tg, loadGifts, escapeHtml, formatDateRu, currencySymbol, botUsername } = ctx;
  
      // ---------- стили ----------
      const styleEl = document.createElement("style");
      styleEl.textContent = CSS;
      document.head.appendChild(styleEl);
  
      // ---------- секция на главной ----------
      const section = document.createElement("div");
      section.className = "santa-section";
      section.innerHTML = `
        <div class="section-head"><h1>🎅 Тайный Санта</h1></div>
        <div class="santa-actions">
          <button class="chip-btn primary" id="santaCreateBtn">+ Создать игру</button>
          <button class="chip-btn" id="santaJoinBtn">🔑 Вступить по коду</button>
        </div>
        <div id="santaList"></div>
      `;
      const anchor = document.getElementById("followedList");
      if (anchor) anchor.insertAdjacentElement("afterend", section);
      else (document.getElementById("mainContent") || document.body).appendChild(section);
  
      const listEl = section.querySelector("#santaList");
  
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
  
      // ---------- список моих игр ----------
      async function loadMine() {
        const { data } = await api("/api/santa/mine");
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
          await loadMine();
          openGame(data.id);
        };
      }
  
      // ---------- вступление по коду ----------
      function renderJoin(prefill = "") {
        openModal(`
          <h2>Вступить в игру</h2>
          <div class="santa-meta">Введи код приглашения</div>
          <input class="santa-input" id="sCode" placeholder="Код" value="${escapeHtml(prefill)}" autocapitalize="off" autocomplete="off">
          <div class="form-status" id="sStatus"></div>
          <button class="santa-btn" id="sJoin">Вступить</button>
        `);
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
        await loadMine();
        openGame(data.id);
      }
  
      // ---------- экран игры ----------
      async function openGame(id) {
        openModal(`<div class="gifts-empty">Загрузка…</div>`);
        const { ok, data: g } = await api(`/api/santa/${id}`);
        if (!ok || !g) {
          openModal(`<h2>Не получилось 😕</h2><div class="santa-meta">${escapeHtml(errText(g))}</div>`);
          return;
        }
  
        const isOpen = g.status === "open";
        const dateStr = formatDateRu(g.exchange_date);
        const participants = g.participants || [];
  
        let html = `
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
  
        // --- кнопки приглашения ---
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
          await loadMine();
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
  
      // ---------- события ----------
      section.querySelector("#santaCreateBtn").onclick = renderCreate;
      section.querySelector("#santaJoinBtn").onclick = () => renderJoin();
  
      loadMine();
  
      return { joinByCode: (code) => joinByCode(code), reload: loadMine };
    };
  })();