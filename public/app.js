console.log("APP START");
console.log("VERSION 2026-07-05-IMAGES");

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
  if (!isoDate) return "без даты";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  return `${d}.${m}.${y}`;
}

// =========================
// СЖАТИЕ КАРТИНОК
// =========================

const MAX_IMAGE_INPUT_SIZE = 10 * 1024 * 1024; // 10 МБ — лимит на исходный файл до сжатия

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

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Не удалось прочитать изображение"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

window.addEventListener("DOMContentLoaded", async () => {

  const tg = window.Telegram?.WebApp;

  if (!tg) {
    console.error("Telegram WebApp not found");
    return;
  }

  tg.ready();

  const user = tg.initDataUnsafe?.user;
  const startParam = tg.initDataUnsafe?.start_param;

  console.log("USER:", user);
  console.log("START PARAM:", startParam);

  if (!user) {
    console.error("No Telegram user");
    return;
  }

  document.getElementById("out").innerHTML = `
    <b>Telegram ID:</b> ${user.id}<br>
    <b>Имя:</b> ${user.first_name}<br>
    <b>Username:</b> ${user.username || "нет"}
  `;

  let userId = null;

  document.getElementById("app").innerHTML = `
    <h2>🎁 Вишлисты</h2>
    <input id="title" placeholder="Название">
    <br><br>
    <input id="date" type="date">
    <br><br>
    <button id="create">Создать</button>
    <p id="status"></p>
    <hr>
    <h3>Список</h3>
    <div id="list">Загрузка...</div>
  `;

  // =========================
  // AUTH
  // =========================
  async function auth() {
    console.log("AUTH: start");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });

    const text = await res.text();
    console.log("AUTH RAW RESPONSE:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("NON-JSON RESPONSE:", text);
      throw new Error("Server returned non-JSON");
    }

    console.log("AUTH PARSED:", data);

    if (!data.ok) throw new Error(data.error || "Auth failed");
    if (!data.user_id) throw new Error("No user_id");

    userId = data.user_id;
    console.log("AUTH OK, userId:", userId);
  }

  // =========================
  // LOAD GIFTS
  // =========================
  async function loadGifts(wishlistId, container, readOnly = false) {
    container.innerHTML = "Загрузка подарков...";

    const res = await fetch(`/api/gifts?wishlist_id=${wishlistId}`);
    const gifts = await res.json();

    if (!Array.isArray(gifts) || gifts.length === 0) {
      container.innerHTML = "<p>Подарков пока нет</p>";
      return;
    }

    container.innerHTML = "";

    gifts.forEach(g => {
      const giftDiv = document.createElement("div");
      giftDiv.style.padding = "8px";
      giftDiv.style.border = "1px solid #ddd";
      giftDiv.style.marginBottom = "6px";
      giftDiv.style.display = "flex";
      giftDiv.style.gap = "8px";
      giftDiv.style.alignItems = "center";

      const img = g.pic
        ? `<img src="${g.pic}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width:40px;height:40px;object-fit:cover;border-radius:4px;flex-shrink:0;">
           <div style="display:none;width:40px;height:40px;background:#eee;border-radius:4px;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🎁</div>`
        : `<div style="width:40px;height:40px;background:#eee;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🎁</div>`;

      const linkHtml = g.link
        ? `<a href="${g.link}" target="_blank">ссылка</a>`
        : "";

      const deleteBtn = readOnly
        ? ""
        : `<button data-gift-id="${g.id}" class="delete-gift">✖</button>`;

      giftDiv.innerHTML = `
        ${img}
        <div style="flex:1;">
          <b>${g.name}</b><br>
          ${g.price ? `💰 ${g.price}<br>` : ""}
          ${linkHtml}
        </div>
        ${deleteBtn}
      `;

      container.appendChild(giftDiv);
    });

    if (!readOnly) {
      container.querySelectorAll(".delete-gift").forEach(btn => {
        btn.onclick = async () => {
          const giftId = btn.dataset.giftId;
          await fetch(`/api/gifts/${giftId}`, { method: "DELETE" });
          await loadGifts(wishlistId, container);
        };
      });
    }
  }

  // =========================
  // SHOW SHARED WISHLIST
  // =========================
  async function showSharedWishlist(wishlistId) {
    console.log("showSharedWishlist:", wishlistId);
    const app = document.getElementById("app");

    const block = document.createElement("div");
    block.id = "shared-wishlist";
    block.style.border = "2px solid #4caf50";
    block.style.borderRadius = "6px";
    block.style.padding = "12px";
    block.style.marginBottom = "16px";
    block.innerHTML = "Загрузка вишлиста...";
    app.prepend(block);

    try {
      const res = await fetch(`/api/wishlists/${wishlistId}`);
      if (!res.ok) throw new Error("not found");
      const w = await res.json();

      block.innerHTML = `
        <h3>🎁 Вишлист от ${w.owner_name || "друга"}</h3>
        <b>${w.title}</b><br>
        📅 ${formatDateRu(w.event_date)}
        <div class="shared-gifts" style="margin-top:10px;"></div>
      `;

      await loadGifts(w.id, block.querySelector(".shared-gifts"), true);
    } catch (e) {
      console.error("SHARED WISHLIST ERROR:", e);
      block.innerHTML = "<p>Не удалось загрузить вишлист по ссылке 😕</p>";
    }
  }

  // =========================
  // LOAD WISHLISTS
  // =========================
  async function loadWishlists() {
    console.log("loadWishlists: start, userId =", userId);

    if (!userId) {
      console.log("loadWishlists: NO userId, abort");
      return;
    }

    const res = await fetch(`/api/wishlists?user_id=${userId}`);
    const data = await res.json();

    const list = document.getElementById("list");

    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = "<p>Пока пусто</p>";
      return;
    }

    list.innerHTML = "";

    data.forEach((w) => {
      const div = document.createElement("div");
      div.style.padding = "10px";
      div.style.border = "1px solid #ccc";
      div.style.marginBottom = "8px";

      div.innerHTML = `
        <b>${w.title}</b><br>
        📅 ${formatDateRu(w.event_date)}
        <br><br>
        <button class="toggle-gifts" data-wishlist-id="${w.id}">🎁 Подарки</button>
        <button class="share-wishlist" data-wishlist-id="${w.id}">🔗 Поделиться</button>
        <button class="delete-wishlist" data-wishlist-id="${w.id}">🗑 Удалить</button>
        <div class="gifts-container" style="display:none; margin-top:10px;">
          <div class="gifts-list"></div>
          <hr>
          <input class="gift-name" placeholder="Название подарка">
          <br><br>
          <input class="gift-link" placeholder="Ссылка на товар (необязательно)">
          <br><br>
          <label style="font-size:13px;color:#666;">Картинка (необязательно):</label>
          <br>
          <input class="gift-pic-file" type="file" accept="image/*">
          <br>
          <img class="gift-pic-preview" style="display:none;width:60px;height:60px;object-fit:cover;border-radius:4px;margin-top:6px;">
          <br><br>
          <input class="gift-price" placeholder="Цена (необязательно)" type="text" inputmode="decimal">
          <br><br>
          <button class="add-gift" data-wishlist-id="${w.id}">Добавить подарок</button>
          <p class="gift-status"></p>
        </div>
      `;

      list.appendChild(div);

      const toggleBtn = div.querySelector(".toggle-gifts");
      const shareBtn = div.querySelector(".share-wishlist");
      const deleteBtn = div.querySelector(".delete-wishlist");
      const giftsContainer = div.querySelector(".gifts-container");
      const giftsList = div.querySelector(".gifts-list");

      toggleBtn.onclick = async () => {
        const isHidden = giftsContainer.style.display === "none";
        giftsContainer.style.display = isHidden ? "block" : "none";
        if (isHidden) {
          await loadGifts(w.id, giftsList);
        }
      };

      shareBtn.onclick = async () => {
        const wishlistId = shareBtn.dataset.wishlistId;
        const url = `https://t.me/${BOT_USERNAME}?startapp=wishlist_${wishlistId}`;

        try {
          await navigator.clipboard.writeText(url);
          alert("Ссылка скопирована:\n" + url);
        } catch (e) {
          prompt("Скопируй ссылку вручную:", url);
        }
      };

      deleteBtn.onclick = async () => {
        const wishlistId = deleteBtn.dataset.wishlistId;

        if (!confirm("Удалить вишлист?")) return;

        try {
          const res = await fetch(`/api/wishlists/${wishlistId}`, {
            method: "DELETE"
          });

          const data = await res.json().catch(() => ({}));

          if (res.ok && data.ok !== false) {
            div.remove();
          } else {
            alert("❌ Ошибка удаления");
          }
        } catch (e) {
          alert("❌ Сетевая ошибка");
        }
      };

      // === Обработка выбора файла картинки ===
      const picFileInput = div.querySelector(".gift-pic-file");
      const picPreview = div.querySelector(".gift-pic-preview");
      let compressedPicData = null;

      picFileInput.onchange = async () => {
        const file = picFileInput.files[0];
        if (!file) return;

        const giftStatus = div.querySelector(".gift-status");

        if (file.size > MAX_IMAGE_INPUT_SIZE) {
          giftStatus.innerText = "❌ Файл слишком большой (макс. 10 МБ)";
          picFileInput.value = "";
          return;
        }

        try {
          giftStatus.innerText = "⏳ Обработка изображения...";
          compressedPicData = await compressImage(file);
          picPreview.src = compressedPicData;
          picPreview.style.display = "block";
          giftStatus.innerText = "";
        } catch (e) {
          giftStatus.innerText = "❌ Не удалось обработать картинку";
          compressedPicData = null;
        }
      };

      const addGiftBtn = div.querySelector(".add-gift");
      const giftStatus = div.querySelector(".gift-status");

      addGiftBtn.onclick = async () => {
        const name = div.querySelector(".gift-name").value.trim();
        const link = div.querySelector(".gift-link").value.trim();
        const price = div.querySelector(".gift-price").value.trim();

        // === ВАЛИДАЦИЯ ПЕРЕД ОТПРАВКОЙ ===
        if (!isValidName(name)) {
          giftStatus.innerText = "❌ Введите название подарка (до 200 символов)";
          return;
        }
        if (!isValidPrice(price)) {
          giftStatus.innerText = "❌ Цена должна быть числом, например 1500 или 1500.50";
          return;
        }
        if (!isValidUrl(link)) {
          giftStatus.innerText = "❌ Ссылка должна начинаться с http:// или https://";
          return;
        }

        giftStatus.innerText = "";

        try {
          const res = await fetch("/api/gifts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wishlist_id: w.id,
              name,
              link: link || null,
              pic: compressedPicData || null,
              price: price ? price.replace(",", ".") : null
            })
          });

          const data = await res.json();

          if (data.ok) {
            giftStatus.innerText = "✅ Добавлено";
            div.querySelector(".gift-name").value = "";
            div.querySelector(".gift-link").value = "";
            div.querySelector(".gift-price").value = "";
            picFileInput.value = "";
            picPreview.style.display = "none";
            compressedPicData = null;
            await loadGifts(w.id, giftsList);
          } else {
            giftStatus.innerText = "❌ " + (data.error || "Ошибка");
          }
        } catch (err) {
          giftStatus.innerText = "❌ Сетевая ошибка";
        }
      };
    });
  }

  // =========================
  // CREATE WISHLIST
  // =========================
  document.getElementById("create").onclick = async () => {
    if (!userId) {
      document.getElementById("status").innerText = "❌ Нет авторизации";
      return;
    }

    const title = document.getElementById("title").value.trim();
    const date = document.getElementById("date").value;

    if (!isValidName(title)) {
      document.getElementById("status").innerText = "❌ Введите название (до 200 символов)";
      return;
    }
    if (!isValidDate(date)) {
      document.getElementById("status").innerText = "❌ Некорректная дата";
      return;
    }

    document.getElementById("status").innerText = "";

    try {
      const res = await fetch("/api/wishlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          title,
          event_date: date || null
        })
      });

      const data = await res.json();

      if (data.ok) {
        document.getElementById("status").innerText = "✅ Создано";
        document.getElementById("title").value = "";
        document.getElementById("date").value = "";
        await loadWishlists();
      } else {
        document.getElementById("status").innerText = "❌ " + (data.error || "Ошибка");
      }
    } catch (err) {
      document.getElementById("status").innerText = "❌ Сетевая ошибка";
    }
  };

  await auth();
  await loadWishlists();

  if (startParam && startParam.startsWith("wishlist_")) {
    const sharedId = startParam.replace("wishlist_", "");
    await showSharedWishlist(sharedId);
  }

});