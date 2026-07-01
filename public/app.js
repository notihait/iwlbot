const tg = window.Telegram.WebApp;
tg.ready();

const telegramUser = tg.initDataUnsafe?.user;

if (!telegramUser) {
  document.getElementById("app").innerHTML =
    "<h2>❌ Откройте через Telegram</h2>";
  throw new Error("No Telegram user");
}

let userId = null;

const app = document.getElementById("app");

app.innerHTML = `
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
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      initData: tg.initData
    })
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error("Auth failed");
  }

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

  if (!title) {
    alert("Введите название");
    return;
  }

  const res = await fetch("/api/wishlists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      user_id: userId,
      title,
      event_date: date
    })
  });

  const data = await res.json();

  if (data.ok) {
    document.getElementById("status").innerText = "✅ Создано";
    document.getElementById("title").value = "";
    document.getElementById("date").value = "";

    loadWishlists();
  } else {
    document.getElementById("status").innerText = "❌ Ошибка";
  }
};

(async () => {
  try {
    await auth();
    await loadWishlists();
  } catch (e) {
    document.getElementById("app").innerHTML =
      `<h2>Ошибка</h2><pre>${e.message}</pre>`;
    console.error(e);
  }
})();