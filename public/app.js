console.log("APP START");
console.log("VERSION 2026-07-06");

const BOT_USERNAME = "IWIshList_bot";

// =========================
// ВАЛИДАЦИЯ (общие хелперы)
// =========================

function isValidPrice(value) {
  if (value === "" || value === null || value === undefined) return true;
  return /^\d+([.,]\d{1,2})?$/.test(value.trim());
}

function isValidUrl(value) {
  if (value === "" || value === null || value === undefined) return true;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidName(value) {
  const v = value.trim();
  return v.length > 0 && v.length <= 200;
}

function isValidDate(value) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatDateRu(isoDate) {
  if (!isoDate) return null;
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  return `${d}.${m}.${y}`;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// =========================
// СЖАТИЕ КАРТИНОК
// =========================

const MAX_IMAGE_INPUT_SIZE = 10 * 1024 * 1024; // 10 МБ

function compressImage(file, maxSize = 300, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round(height * (maxSize / width));
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round(width * (maxSize / height));
            height = maxSize;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Не удалось прочитать изображение"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

// =========================
// BOTTOM SHEETS
// =========================

const overlay = document.getElementById("overlay");
const sheetCreate = document.getElementById("sheetCreate");
const sheetGift = document.getElementById("sheetGift");

function openSheet(sheetEl) {
  overlay.classList.add("visible");
  sheetEl.classList.add("open");
  sheetEl.setAttribute("aria-hidden", "false");
}

function closeSheets() {
  overlay.classList.remove("visible");
  [sheetCreate, sheetGift].forEach((s) => {
    s.classList.remove("open");
    s.setAttribute("aria-hidden", "true");
  });
}

overlay.addEventListener("click", closeSheets);

window.addEventListener("DOMContentLoaded", async () => {

  const tg = window.Telegram?.WebApp;
  const notTelegramScreen = document.getElementById("notTelegramScreen");
  const mainContent = document.getElementById("mainContent");
  const fabCreate = document.getElementById("fabCreate");
  const topbar = document.getElementById("topbar");

  const isRunningInTelegram = !!(tg && tg.initData && tg.initData.length > 0);

  if (!isRunningInTelegram) {
    console.error("Not running inside Telegram");
    notTelegramScreen.style.display = "block";
    mainContent.style.display = "none";
    fabCreate.style.display = "none";
    if (topbar) topbar.style.display = "none";
    return;
  }

  tg.ready();
  tg.expand?.();

  const user = tg.initDataUnsafe?.user;

  const urlStartParam = new URLSearchParams(window.location.search).get("startapp")
    || new URLSearchParams(window.location.search).get("tgWebAppStartParam");

  const startParam = tg.initDataUnsafe?.start_param || urlStartParam;

  console.log("USER:", user);
  console.log("START PARAM:", startParam, "(tg:", tg.initDataUnsafe?.start_param, ", url:", urlStartParam, ")");

  const userPillText = document.getElementById("userPillText");

  if (!user) {
    console.error("No Telegram user");
    userPillText.textContent = "нет данных Telegram";
    return;
  }

  userPillText.textContent = user.first_name || user.username || "гость";

  let userId = null;
  let currentGiftWishlistId = null;
  let currentGiftsContainer = null;
  let compressedPicData = null;

  let editingWishlistId = null;
  let editingGiftId = null;
  let editingGiftOriginalPic = null;

  const wishlistsList = document.getElementById("wishlistsList");
  const sharedBanner = document.getElementById("sharedBanner");

  // =========================
  // AUTH
  // =========================
  async function auth() {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("NON-JSON RESPONSE:", text);
      throw new Error("Server returned non-JSON");
    }

    if (!data.ok) throw new Error(data.error || "Auth failed");
    if (!data.user_id) throw new Error("No user_id");

    userId = data.user_id;
  }

  // =========================
  // GIFT CARD RENDERING
  // =========================
  function giftCardHtml(g, readOnly) {
    const img = g.pic
      ? `<img src="${escapeHtml(g.pic)}" onerror="this.style.display='none'; this.parentElement.innerHTML='🎁';">`
      : "🎁";

    const price = g.price
      ? `<div class="price-tag">${escapeHtml(g.price)} ₽</div>`
      : "";

    const link = g.link
      ? `<a class="gift-link-chip" href="${escapeHtml(g.link)}" target="_blank" rel="noopener">🔗 ссылка</a>`
      : "";

    const removeBtn = readOnly
      ? ""
      : `<button class="gift-remove" data-gift-id="${g.id}" aria-label="Удалить подарок">✕</button>`;

    const editBtn = readOnly
      ? ""
      : `<button class="gift-edit" data-gift-id="${g.id}">✏️ Изменить</button>`;

    let reserveControl;
    if (g.reserved && !g.reserved_by_me) {
      reserveControl = `<div class="gift-reserved-badge">🔒 забронировано</div>`;
    } else {
      const label = g.reserved_by_me ? "Отменить бронь" : "Забронировать";
      reserveControl = `<button class="gift-reserve" data-gift-id="${g.id}" data-reserved="${g.reserved_by_me}">${label}</button>`;
    }

    return `
      <div class="gift-card">
        <div class="gift-thumb-wrap">${img}${price}</div>
        ${removeBtn}
        <div class="gift-name">${escapeHtml(g.name)}</div>
        ${link}
        <div class="gift-actions-row">
          ${editBtn}
          ${reserveControl}
        </div>
      </div>
    `;
  }

  // =========================
  // GIFT SHEET (add / edit)
  // =========================
  function resetGiftSheet() {
    document.getElementById("giftName").value = "";
    document.getElementById("giftLink").value = "";
    document.getElementById("giftPrice").value = "";
    document.getElementById("giftPicFile").value = "";
    document.getElementById("giftPicPreview").style.display = "none";
    document.getElementById("giftStatus").textContent = "";
    document.getElementById("giftStatus").className = "form-status";
    compressedPicData = null;
    editingGiftId = null;
    editingGiftOriginalPic = null;
    document.getElementById("sheetGiftTitle").textContent = "Добавить подарок";
    document.getElementById("addGift").textContent = "Добавить в список";
  }

  function openGiftSheetForEdit(gift, wishlistId, container) {
    currentGiftWishlistId = wishlistId;
    currentGiftsContainer = container;
    editingGiftId = gift.id;
    editingGiftOriginalPic = gift.pic || null;
    compressedPicData = null;

    document.getElementById("giftName").value = gift.name || "";
    document.getElementById("giftLink").value = gift.link || "";
    document.getElementById("giftPrice").value = gift.price || "";

    const preview = document.getElementById("giftPicPreview");
    if (gift.pic) {
      preview.src = gift.pic;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }

    document.getElementById("giftPicFile").value = "";
    document.getElementById("giftStatus").textContent = "";
    document.getElementById("giftStatus").className = "form-status";

    document.getElementById("sheetGiftTitle").textContent = "Изменить подарок";
    document.getElementById("addGift").textContent = "Сохранить изменения";

    openSheet(sheetGift);
  }

  // =========================
  // LOAD GIFTS
  // =========================
  async function loadGifts(wishlistId, container, readOnly = false) {
    container.innerHTML = `<div class="gifts-empty">Загрузка подарков…</div>`;

    const res = await fetch(`/api/gifts?wishlist_id=${wishlistId}&viewer_id=${userId || ""}`);
    const gifts = await res.json();

    if (!Array.isArray(gifts) || gifts.length === 0) {
      container.innerHTML = `<div class="gifts-empty">Подарков пока нет 🎈</div>`;
      return;
    }

    container.innerHTML = gifts.map((g) => giftCardHtml(g, readOnly)).join("");

    if (!readOnly) {
      container.querySelectorAll(".gift-remove").forEach((btn) => {
        btn.onclick = async () => {
          const giftId = btn.dataset.giftId;
          await fetch(`/api/gifts/${giftId}`, { method: "DELETE" });
          await loadGifts(wishlistId, container, readOnly);
        };
      });

      container.querySelectorAll(".gift-edit").forEach((btn) => {
        btn.onclick = () => {
          const giftId = btn.dataset.giftId;
          const gift = gifts.find((g) => String(g.id) === String(giftId));
          if (gift) openGiftSheetForEdit(gift, wishlistId, container);
        };
      });
    }

    container.querySelectorAll(".gift-reserve").forEach((btn) => {
      btn.onclick = async () => {
        const giftId = btn.dataset.giftId;
        const reserved = btn.dataset.reserved === "true";
        const method = reserved ? "DELETE" : "POST";
        try {
          const res = await fetch(`/api/gifts/${giftId}/reserve`, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId })
          });
          const data = await res.json();
          if (data.ok) {
            await loadGifts(wishlistId, container, readOnly);
          } else {
            alert(data.error || "Ошибка");
          }
        } catch (e) {
          alert("❌ Сетевая ошибка");
        }
      };
    });
  }

  // =========================
  // SHOW SHARED WISHLIST
  // =========================
  async function showSharedWishlist(publicId) {
    sharedBanner.innerHTML = `
      <div class="shared-banner">
        <div class="eyebrow">Вишлист по ссылке</div>
        <h3>Загрузка…</h3>
      </div>
    `;

    try {
      const res = await fetch(`/api/wishlists/public/${publicId}`);
      if (!res.ok) throw new Error("not found");
      const w = await res.json();
      const dateStr = formatDateRu(w.event_date);

      sharedBanner.innerHTML = `
        <div class="shared-banner">
          <div class="eyebrow">🎁 Вишлист от ${escapeHtml(w.owner_name || "друга")}</div>
          <h3>${escapeHtml(w.title)}</h3>
          ${dateStr ? `<div class="date-line">📅 ${dateStr}</div>` : ""}
          <div class="gifts-grid" id="sharedGiftsGrid"></div>
        </div>
      `;

      await loadGifts(w.id, document.getElementById("sharedGiftsGrid"), true);
    } catch (e) {
      console.error("SHARED WISHLIST ERROR:", e);
      sharedBanner.innerHTML = `
        <div class="shared-banner">
          <div class="eyebrow">Не получилось 😕</div>
          <h3>Вишлист не найден или был удалён</h3>
        </div>
      `;
    }
  }

  // =========================
  // LOAD WISHLISTS
  // =========================
  async function loadWishlists() {
    if (!userId) return;

    const res = await fetch(`/api/wishlists?user_id=${userId}`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      wishlistsList.innerHTML = `
        <div class="empty-state">
          <span class="glyph">🎁</span>
          <h3>Пока пусто</h3>
          <p>Нажмите «+», чтобы создать первый вишлист</p>
        </div>
      `;
      return;
    }

    wishlistsList.innerHTML = "";

    data.forEach((w) => {
      const dateStr = formatDateRu(w.event_date);

      const card = document.createElement("div");
      card.className = "tag-card";
      card.innerHTML = `
        <div class="tag-card-head">
          <div class="tag-card-title">${escapeHtml(w.title)}</div>
          <div class="tag-date ${dateStr ? "" : "no-date"}">${dateStr ? "📅 " + dateStr : "без даты"}</div>
        </div>
        <div class="tag-card-actions">
          <button class="chip-btn primary toggle-gifts">🎁 Подарки</button>
          <button class="chip-btn edit-wishlist">✏️ Изменить</button>
          <button class="chip-btn share-wishlist">🔗 Поделиться</button>
          <button class="chip-btn danger delete-wishlist">🗑 Удалить</button>
        </div>
        <div class="gifts-panel">
          <div class="gifts-grid"></div>
          <button class="add-gift-trigger">+ Добавить подарок</button>
        </div>
      `;

      wishlistsList.appendChild(card);

      const panel = card.querySelector(".gifts-panel");
      const grid = card.querySelector(".gifts-grid");

      card.querySelector(".toggle-gifts").onclick = async () => {
        const isOpen = panel.classList.toggle("open");
        if (isOpen) await loadGifts(w.id, grid, false);
      };

      card.querySelector(".edit-wishlist").onclick = () => {
        editingWishlistId = w.id;
        document.getElementById("title").value = w.title || "";
        document.getElementById("date").value = w.event_date || "";
        document.getElementById("status").textContent = "";
        document.getElementById("status").className = "form-status";
        document.getElementById("sheetCreateTitle").textContent = "Изменить вишлист";
        document.getElementById("create").textContent = "Сохранить изменения";
        openSheet(sheetCreate);
      };

      card.querySelector(".share-wishlist").onclick = async () => {
        const url = `https://t.me/${BOT_USERNAME}?startapp=wishlist_${w.public_id}`;
        try {
          await navigator.clipboard.writeText(url);
          alert("Ссылка скопирована:\n" + url);
        } catch (e) {
          prompt("Скопируй ссылку вручную:", url);
        }
      };

      card.querySelector(".delete-wishlist").onclick = () => {
        tg.showPopup(
          {
            title: "Удалить вишлист?",
            message: "Это действие нельзя отменить.",
            buttons: [
              { id: "cancel", type: "cancel" },
              { id: "delete", type: "destructive", text: "Удалить" }
            ]
          },
          async (buttonId) => {
            if (buttonId !== "delete") return;
            try {
              const res = await fetch(`/api/wishlists/${w.id}`, { method: "DELETE" });
              const data = await res.json().catch(() => ({}));
              if (res.ok && data.ok !== false) {
                card.remove();
                if (!wishlistsList.querySelector(".tag-card")) await loadWishlists();
              } else {
                alert("❌ Ошибка удаления");
              }
            } catch (e) {
              alert("❌ Сетевая ошибка");
            }
          }
        );
      };

      card.querySelector(".add-gift-trigger").onclick = () => {
        currentGiftWishlistId = w.id;
        currentGiftsContainer = grid;
        resetGiftSheet();
        openSheet(sheetGift);
      };
    });
  }

  // =========================
  // CREATE / EDIT WISHLIST (sheet)
  // =========================
  document.getElementById("fabCreate").onclick = () => {
    editingWishlistId = null;
    document.getElementById("title").value = "";
    document.getElementById("date").value = "";
    document.getElementById("status").textContent = "";
    document.getElementById("status").className = "form-status";
    document.getElementById("sheetCreateTitle").textContent = "Новый вишлист";
    document.getElementById("create").textContent = "Создать вишлист";
    openSheet(sheetCreate);
  };

  document.getElementById("create").onclick = async () => {
    const statusEl = document.getElementById("status");

    if (!userId) {
      statusEl.textContent = "❌ Нет авторизации";
      statusEl.className = "form-status error";
      return;
    }

    const title = document.getElementById("title").value.trim();
    const date = document.getElementById("date").value;

    if (!isValidName(title)) {
      statusEl.textContent = "❌ Введите название (до 200 символов)";
      statusEl.className = "form-status error";
      return;
    }
    if (!isValidDate(date)) {
      statusEl.textContent = "❌ Некорректная дата";
      statusEl.className = "form-status error";
      return;
    }

    statusEl.textContent = "";
    statusEl.className = "form-status";

    try {
      const isEditing = !!editingWishlistId;
      const url = isEditing ? `/api/wishlists/${editingWishlistId}` : "/api/wishlists";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing
        ? { title, event_date: date || null }
        : { user_id: userId, title, event_date: date || null };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (data.ok) {
        statusEl.textContent = isEditing ? "✅ Сохранено" : "✅ Создано";
        statusEl.className = "form-status success";
        await loadWishlists();
        setTimeout(closeSheets, 500);
      } else {
        statusEl.textContent = "❌ " + (data.error || "Ошибка");
        statusEl.className = "form-status error";
      }
    } catch (err) {
      statusEl.textContent = "❌ Сетевая ошибка";
      statusEl.className = "form-status error";
    }
  };

  // =========================
  // ADD / EDIT GIFT (sheet)
  // =========================
  const picFileInput = document.getElementById("giftPicFile");
  const picPreview = document.getElementById("giftPicPreview");

  picFileInput.onchange = async () => {
    const file = picFileInput.files[0];
    if (!file) return;

    const giftStatus = document.getElementById("giftStatus");

    if (file.size > MAX_IMAGE_INPUT_SIZE) {
      giftStatus.textContent = "❌ Файл слишком большой (макс. 10 МБ)";
      giftStatus.className = "form-status error";
      picFileInput.value = "";
      return;
    }

    try {
      giftStatus.textContent = "⏳ Обработка изображения…";
      giftStatus.className = "form-status";
      compressedPicData = await compressImage(file);
      picPreview.src = compressedPicData;
      picPreview.style.display = "block";
      giftStatus.textContent = "";
    } catch (e) {
      giftStatus.textContent = "❌ Не удалось обработать картинку";
      giftStatus.className = "form-status error";
      compressedPicData = null;
    }
  };

  document.getElementById("addGift").onclick = async () => {
    const giftStatus = document.getElementById("giftStatus");
    const name = document.getElementById("giftName").value.trim();
    const link = document.getElementById("giftLink").value.trim();
    const price = document.getElementById("giftPrice").value.trim();

    if (!isValidName(name)) {
      giftStatus.textContent = "❌ Введите название подарка (до 200 символов)";
      giftStatus.className = "form-status error";
      return;
    }
    if (!isValidPrice(price)) {
      giftStatus.textContent = "❌ Цена должна быть числом, например 1500 или 1500.50";
      giftStatus.className = "form-status error";
      return;
    }
    if (!isValidUrl(link)) {
      giftStatus.textContent = "❌ Ссылка должна начинаться с http:// или https://";
      giftStatus.className = "form-status error";
      return;
    }

    giftStatus.textContent = "";
    giftStatus.className = "form-status";

    // при редактировании: если пользователь не выбирал новую картинку,
    // сохраняем ту, что уже была у подарка
    const picToSend = compressedPicData || (editingGiftId ? editingGiftOriginalPic : null);

    try {
      const isEditing = !!editingGiftId;
      const url = isEditing ? `/api/gifts/${editingGiftId}` : "/api/gifts";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing
        ? {
            name,
            link: link || null,
            pic: picToSend || null,
            price: price ? price.replace(",", ".") : null
          }
        : {
            wishlist_id: currentGiftWishlistId,
            name,
            link: link || null,
            pic: picToSend || null,
            price: price ? price.replace(",", ".") : null
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (data.ok) {
        giftStatus.textContent = isEditing ? "✅ Сохранено" : "✅ Добавлено";
        giftStatus.className = "form-status success";
        if (currentGiftsContainer) {
          await loadGifts(currentGiftWishlistId, currentGiftsContainer, false);
        }
        setTimeout(closeSheets, 450);
      } else {
        giftStatus.textContent = "❌ " + (data.error || "Ошибка");
        giftStatus.className = "form-status error";
      }
    } catch (err) {
      giftStatus.textContent = "❌ Сетевая ошибка";
      giftStatus.className = "form-status error";
    }
  };

  // =========================
  // INIT
  // =========================
  try {
    await auth();
    userPillText.textContent = user.first_name || user.username || "гость";
    await loadWishlists();
  } catch (e) {
    console.error("AUTH ERROR:", e);
    userPillText.textContent = "ошибка авторизации";
    wishlistsList.innerHTML = `
      <div class="empty-state">
        <span class="glyph">⚠️</span>
        <h3>Не удалось авторизоваться</h3>
        <p>Откройте приложение через Telegram-бота ещё раз</p>
      </div>
    `;
  }

  if (startParam && startParam.startsWith("wishlist_")) {
    const sharedId = startParam.replace("wishlist_", "");
    await showSharedWishlist(sharedId);
  }

});