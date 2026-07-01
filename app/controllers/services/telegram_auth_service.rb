# app/services/telegram_auth_service.rb
require "openssl"
require "uri"
require "cgi"

class TelegramAuthService
  def self.call(init_data)
    # тут будет проверка подписи Telegram
    # (очень важно для безопасности Mini App)

    parsed = CGI.parse(init_data)

    user = parsed["user"]&.first
    JSON.parse(user)["id"]
  end
end