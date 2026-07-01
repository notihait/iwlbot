const tg = window.Telegram?.WebApp;

tg.ready();

const user = tg.initDataUnsafe?.user;

if (!user) {
  document.body.innerHTML = `
    <h2>NO USER DATA</h2>
    <p>Open via Telegram button</p>
  `;
} else {
  document.body.innerHTML = `
    <h2>Hello ${user.first_name}</h2>
    <p>ID: ${user.id}</p>
  `;
}

// безопасный fetch (НЕ ломает страницу)
try {
  fetch("/debug", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      initData: tg.initData,
      user: user
    })
  });
} catch (e) {
  console.log("fetch failed", e);
}