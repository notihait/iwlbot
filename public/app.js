const tg = window.Telegram.WebApp;

tg.ready();

// показываем данные на экране
document.body.innerHTML = `
  <h2>Hello ${tg.initDataUnsafe.user.first_name}</h2>
  <p>ID: ${tg.initDataUnsafe.user.id}</p>
`;

// 👉 ВОТ ЭТО ДОБАВЛЯЕШЬ СЮДА
fetch("/debug", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    initData: tg.initData,
    user: tg.initDataUnsafe.user
  })
});