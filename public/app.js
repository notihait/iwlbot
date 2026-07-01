const tg = window.Telegram.WebApp;
tg.ready();

const user = tg.initDataUnsafe?.user;

document.body.innerHTML = `
  <h2>🎁 Create Wishlist</h2>

  <input id="title" placeholder="Wishlist title" />
  <input id="date" type="date" />

  <button id="create">Create</button>

  <div id="status"></div>
`;

document.getElementById("create").onclick = async () => {
  const title = document.getElementById("title").value;
  const date = document.getElementById("date").value;

  const res = await fetch("/api/wishlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: user.id,
      title,
      event_date: date
    })
  });

  const data = await res.json();

  document.getElementById("status").innerText =
    data.ok ? "✅ Created!" : "❌ Error";
};