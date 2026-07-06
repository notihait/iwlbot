require "telegram/bot"
require "dotenv/load"

TOKEN = ENV["BOT_TOKEN"]
WEBAPP = ENV["WEBAPP_URL"]

puts ENV["WEBAPP_URL"]

Telegram::Bot::Client.run(TOKEN) do |bot|
  bot.listen do |msg|
    next unless msg.text

    text_in = msg.text.strip

    if text_in.start_with?("/start")
      payload = text_in.split(" ", 2)[1]

      # /start с параметром (wishlist_123)
      if payload && !payload.strip.empty?
        bot.api.send_message(
          chat_id: msg.chat.id,
          text: "🎁 Открываю вишлист #{payload}"
        )

        # deep link
        bot.api.send_message(
          chat_id: msg.chat.id,
          text: "👇 Открыть миниапп",
          reply_markup: Telegram::Bot::Types::InlineKeyboardMarkup.new(
            inline_keyboard: [
              [
                Telegram::Bot::Types::InlineKeyboardButton.new(
                  text: "Open App",
                  web_app: Telegram::Bot::Types::WebAppInfo.new(
                    url: "#{WEBAPP}?startapp=#{payload}"
                  )
                )
              ]
            ]
          )
        )

        next
      end

      # обычный /start
      user = msg.from
      nick = user.first_name.to_s

      text = <<~TEXT
        Привет, #{nick}! 👋

        Я помогаю собирать списки подарков, чтобы друзья не гадали, что тебе подарить 🎁

        А еще я умею напоминать о выбранных подарках, чтобы точно ничего не забыть ⏳

        Заведи вишлист, скинь ссылку — и дальше всё само разрулится.

        Открывай приложение, там всё и происходит 👇
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
end