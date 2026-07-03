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

  if (!user) return;

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

  async function auth() {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    userId = data.user_id;
  }

  async function loadGifts(wishlistId, container, readOnly = false) {
    container.innerHTML = "Загрузка...";

    const res = await fetch(`/api/gifts?wishlist_id=${wishlistId}`);
    const gifts = await res.json();

    if (!Array.isArray(gifts) || gifts.length === 0) {
      container.innerHTML = "<p>Подарков нет</p>";
      return;
    }

    container.innerHTML = "";

    gifts.forEach(g => {
      const div = document.createElement("div");
      div.style.border = "1px solid #ddd";
      div.style.margin = "6px";
      div.style.padding = "6px";

      div.innerHTML = `
        <b>${g.name}</b>
        ${readOnly ? "" : `<button class="del" data-id="${g.id}">✖</button>`}
      `;

      container.appendChild(div);
    });

    if (!readOnly) {
      container.querySelectorAll(".del").forEach(b => {
        b.onclick = async () => {
          await fetch(`/api/gifts/${b.dataset.id}`, { method: "DELETE" });
          loadGifts(wishlistId, container);
        };
      });
    }
  }

  async function loadWishlists() {
    const res = await fetch(`/api/wishlists?user_id=${userId}`);
    const data = await res.json();

    const list = document.getElementById("list");
    list.innerHTML = "";

    data.forEach(w => {
      const div = document.createElement("div");
      div.style.border = "1px solid #ccc";
      div.style.padding = "10px";
      div.style.marginBottom = "8px";

      div.innerHTML = `
        <b>${w.title}</b>
        <br>
        📅 ${w.event_date || "—"}

        <br><br>

        <button class="toggle">🎁</button>
        <button class="share">🔗</button>
        <button class="delete">🗑</button>

        <div class="gifts" style="display:none"></div>
      `;

      const giftsBox = div.querySelector(".gifts");

      // 🎁 toggle + lazy load FIX
      div.querySelector(".toggle").onclick = async () => {
        const open = giftsBox.style.display === "none";
        giftsBox.style.display = open ? "block" : "none";
        if (open && !giftsBox.dataset.loaded) {
          await loadGifts(w.id, giftsBox);
          giftsBox.dataset.loaded = "1";
        }
      };

      // 🔗 share
      div.querySelector(".share").onclick = async () => {
        const url = `https://t.me/${BOT_USERNAME}?startapp=wishlist_${w.id}`;
        await navigator.clipboard.writeText(url);
        alert(url);
      };

      // 🗑 delete wishlist FIX
      div.querySelector(".delete").onclick = async () => {
        if (!confirm("Удалить вишлист?")) return;

        await fetch(`/api/wishlists/${w.id}`, {
          method: "DELETE"
        });

        div.remove();
      };

      list.appendChild(div);
    });
  }

  // CREATE
  document.getElementById("create").onclick = async () => {
    const title = document.getElementById("title").value;

    await fetch("/api/wishlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        title
      })
    });

    loadWishlists();
  };

  try {
    await auth();
    await loadWishlists();
  } catch (e) {
    console.error(e);
  }
});