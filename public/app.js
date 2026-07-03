console.log("APP START");
console.log("VERSION 2026-07-03-DEBUG");

const BOT_USERNAME = "IWIshList_bot";

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
        ? `<img src="${g.pic}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">`
        : "";

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
        📅 ${w.event_date || "без даты"}
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
    console.log("loadWishlists: response status", res.status);

    const data = await res.json();
    console.log("loadWishlists: data =", data);
    console.log("loadWishlists: isArray =", Array.isArray(data), "length =", data?.length);

    const list = document.getElementById("list");
    console.log("loadWishlists: list element =", list);

    if (!Array.isArray(data) || data.length === 0) {
      console.log("loadWishlists: пусто или не массив");
      list.innerHTML = "<p>Пока пусто</p>";
      return;
    }

    console.log("loadWishlists: рендерим", data.length, "вишлистов");
    list.innerHTML = "";

    data.forEach((w, i) => {
      console.log(`loadWishlists: рендер карточки ${i}`, w);

      const div = document.createElement("div");
      div.style.padding = "10px";
      div.style.border = "1px solid #ccc";
      div.style.marginBottom = "8px";

      div.innerHTML = `
        <b>${w.title}</b><br>
        📅 ${w.event_date || "без даты"}
        <br><br>
        <button class="toggle-gifts" data-wishlist-id="${w.id}">🎁 Подарки</button>
        <button class="share-wishlist" data-wishlist-id="${w.id}">🔗 Поделиться</button>
        <div class="gifts-container" style="display:none; margin-top:10px;">
          <div class="gifts-list"></div>
          <hr>
          <input class="gift-name" placeholder="Название подарка">
          <br><br>
          <input class="gift-link" placeholder="Ссылка (необязательно)">
          <br><br>
          <input class="gift-pic" placeholder="URL картинки (необязательно)">
          <br><br>
          <input class="gift-price" placeholder="Цена (необязательно)" type="number">
          <br><br>
          <button class="add-gift" data-wishlist-id="${w.id}">Добавить подарок</button>
          <p class="gift-status"></p>
        </div>
      `;

      list.appendChild(div);
      console.log(`loadWishlists: карточка ${i} добавлена в DOM`);

      const toggleBtn = div.querySelector(".toggle-gifts");
      const shareBtn = div.querySelector(".share-wishlist");
      const giftsContainer = div.querySelector(".gifts-container");
      const giftsList = div.querySelector(".gifts-list");

      console.log(`loadWishlists: shareBtn для ${w.id} =`, shareBtn);

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
        console.log("SHARE URL:", url);
        try {
          await navigator.clipboard.writeText(url);
          alert("Ссылка скопирована:\n" + url);
        } catch (e) {
          prompt("Скопируй ссылку вручную:", url);
        }
      };

      const addGiftBtn = div.querySelector(".add-gift");
      const giftStatus = div.querySelector(".gift-status");

      addGiftBtn.onclick = async () => {
        const name = div.querySelector(".gift-name").value.trim();
        const link = div.querySelector(".gift-link").value.trim();
        const pic = div.querySelector(".gift-pic").value.trim();
        const price = div.querySelector(".gift-price").value.trim();

        if (!name) {
          giftStatus.innerText = "❌ Введите название подарка";
          return;
        }

        try {
          const res = await fetch("/api/gifts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wishlist_id: w.id,
              name,
              link: link || null,
              pic: pic || null,
              price: price || null
            })
          });

          const data = await res.json();

          if (data.ok) {
            giftStatus.innerText = "✅ Добавлено";
            await loadGifts(w.id, giftsList);
          } else {
            giftStatus.innerText = "❌ Ошибка";
          }
        } catch (err) {
          console.error(err);
          giftStatus.innerText = "❌ Сетевая ошибка";
        }
      };
    });

    console.log("loadWishlists: DONE");
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

    if (!title) {
      document.getElementById("status").innerText = "❌ Введите название";
      return;
    }

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
        await loadWishlists();
      } else {
        document.getElementById("status").innerText = "❌ Ошибка";
      }
    } catch (err) {
      console.error(err);
      document.getElementById("status").innerText = "❌ Сетевая ошибка";
    }
  };
