console.log("APP START");

window.addEventListener("DOMContentLoaded", async () => {

  const tg = window.Telegram?.WebApp;

  if (!tg) {
    console.error("Telegram WebApp not found");
    return;
  }

  tg.ready();

  const user = tg.initDataUnsafe?.user;

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

  // 🔥 AUTH
  async function auth() {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: tg.initData
      })
    });

    // ⚠️ защита от HTML-ошибок (403/500)
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("NON-JSON RESPONSE:", text);
      throw new Error("Server returned non-JSON (check backend logs)");
    }

    console.log("AUTH RESPONSE:", data);

    if (!data.ok) {
      throw new Error(data.error || "Auth failed");
    }

    if (!data.user_id) {
      throw new Error("No user_id from backend");
    }

    userId = data.user_id;
  }

  // 🔥 LOAD LIST
  async function loadWishlists() {
    if (!userId) return;

    const res = await fetch(`/api/wishlists?user_id=${userId}`);
    const data = await res.json();

    const list = document.getElementById("list");

    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = "<p>Пока пусто</p>";
      return;
    }

    list.innerHTML = "";

    data.forEach(w => {
      const div = document.createElement("div");
      div.style.padding = "10px";
      div.style.border = "1px solid #ccc";
      div.style.marginBottom = "8px";

      div.innerHTML = `
        <b>${w.title}</b><br>
        📅 ${w.event_date || "без даты"}
      `;

      list.appendChild(div);
    });
  }

  // 🔥 CREATE
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

  // 🔥 INIT
  try {
    await auth();
    await loadWishlists();
  } catch (e) {
    console.error("INIT ERROR:", e);
    document.getElementById("app").innerHTML =
      `<h2>Ошибка авторизации</h2><pre>${e.message}</pre>`;
  }

});