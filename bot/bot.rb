# bot/bot.rb
require "telegram/bot"
require "dotenv/load"

TOKEN = ENV["BOT_TOKEN"]
WEBAPP = ENV["WEBAPP_URL"]

Telegram::Bot::Client.run(TOKEN) do |bot|
  bot.listen do |msg|
    next unless msg.text == "/start"

    user = msg.from

    nick =
      if user.username
        "@#{user.username}"
      else
        user.first_name
      end

    text = <<~TEXT
    👋 Привет, #{nick} ^_^!

    🎉 Я бот для управления вишлистами!

    ✨ Что я умею:
    • Напоминать о предстоящих событиях
    • Показывать вишлисты по ссылке
    • Помогать не забыть о важных датах

    💡 Совет: Все вишлисты создаются и управляются через удобную миниапп!
    Там вы можете:
    • Создавать вишлисты с датами
    • Добавлять подарки с фото и ссылками
    • Делиться вишлистами с друзьями

    🚀 Откройте миниапп и начните создавать свои вишлисты!
    TEXT

    keyboard = Telegram::Bot::Types::InlineKeyboardMarkup.new(
      inline_keyboard: [
        [
          Telegram::Bot::Types::InlineKeyboardButton.new(
            text: "Open App",
            web_app: Telegram::Bot::Types::WebAppInfo.new(url: WEBAPP)
          )
        ]
      ]
    )

    bot.api.send_message(
      chat_id: msg.chat.id,
      text: text,
      reply_markup: keyboard
    )
  end
end