const tg = window.Telegram.WebApp;

tg.ready();

document.body.innerHTML = `
  <h2>Hello ${tg.initDataUnsafe.user.first_name}</h2>
  <p>ID: ${tg.initDataUnsafe.user.id}</p>
`;