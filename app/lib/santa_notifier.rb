require "net/http"
require "json"
require "uri"

# Отправляет участникам Тайного Санты сообщение в Telegram после жеребьёвки.
# ВАЖНО: проверь три значения ниже (помечены CHECK) под свой проект.
module SantaNotifier
  # CHECK 1: имя переменной окружения с токеном бота
  BOT_TOKEN_ENV = "BOT_TOKEN".freeze
  # CHECK 2: username бота без @
  BOT_USERNAME_ENV = "BOT_USERNAME".freeze

  module_function

  def drawn(event)
    token = ENV[BOT_TOKEN_ENV]
    bot = ENV[BOT_USERNAME_ENV]
    return warn("[santa] no #{BOT_TOKEN_ENV}, skip notify") if token.to_s.empty?

    link = bot.to_s.empty? ? nil : "https://t.me/#{bot}?startapp=santa_#{event.invite_code}"
    text = "🎅 В игре «#{event.title}» прошла жеребьёвка!\n\nОткрой приложение и узнай, кому ты даришь подарок 🎁"

    event.santa_participants.includes(:user).each do |p|
      # CHECK 3: поле с Telegram-id пользователя (здесь telegram_id)
      chat_id = p.user.telegram_id
      next if chat_id.to_s.empty?

      send_message(token, chat_id, text, link)
    end
  end

  def send_message(token, chat_id, text, link)
    uri = URI("https://api.telegram.org/bot#{token}/sendMessage")
    body = { chat_id: chat_id, text: text }
    body[:reply_markup] = { inline_keyboard: [[{ text: "🎁 Открыть", url: link }]] } if link

    res = Net::HTTP.post(uri, body.to_json, "Content-Type" => "application/json")
    warn "[santa] tg #{chat_id}: #{res.code} #{res.body}" unless res.is_a?(Net::HTTPSuccess)
  rescue => e
    warn "[santa] tg #{chat_id}: #{e.class}: #{e.message}"
  end
end