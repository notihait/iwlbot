# bot/bot.rb
require "telegram/bot"
require "dotenv/load"

TOKEN = ENV["BOT_TOKEN"]
WEBAPP = ENV["WEBAPP_URL"]

Telegram::Bot::Client.run(TOKEN) do |bot|
  bot.listen do |msg|
    next unless msg.text == "/start"

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
      text: "Open Mini App",
      reply_markup: keyboard
    )
  end
end