console.log("APP START");

window.addEventListener("DOMContentLoaded", async () => {

  const tg = window.Telegram?.WebApp;

  if (!tg) return;

  tg.ready();

  const user = tg.initDataUnsafe?.user;

  if (!user) return;

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

  async function auth() {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: tg.initData
      })
    });

    const data = await res.json();

    if (!data.ok) throw new Error("Auth failed");

    userId = data.user_id;
  }

  async function loadWishlists() {
    const res = await fetch(`/api/wishlists?user_id=${userId}`);
    const data = await res.json();

    const list = document.getElementById("list");

    if (!data.length) {
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

  document.getElementById("create").onclick = async () => {
    const title = document.getElementById("title").value.trim();
    const date = document.getElementById("date").value;

    if (!title) return;

    const res = await fetch("/api/wishlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        title,
        event_date: date || null   // 🔥 FIX
      })
    });

    const data = await res.json();

    if (data.ok) {
      document.getElementById("status").innerText = "✅ Создано";
      loadWishlists();
    } else {
      document.getElementById("status").innerText = "❌ Ошибка";
    }
  };

  try {
    await auth();
    await loadWishlists();
  } catch (e) {
    document.getElementById("app").innerHTML =
      `<h2>Ошибка</h2><pre>${e.message}</pre>`;
    console.error(e);
  }

});