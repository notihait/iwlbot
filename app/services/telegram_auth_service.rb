require "openssl"
require "json"
require "rack/utils"

class TelegramAuthService
  BOT_TOKEN = ENV.fetch("BOT_TOKEN")

  def self.call(init_data)
    params = Rack::Utils.parse_nested_query(init_data)
    hash = params.delete("hash")
    return nil if hash.nil?

    # строка для проверки — все параметры кроме hash, отсортированные, key=value через \n
    data_check_string = params.sort.map { |k, v| "#{k}=#{v}" }.join("\n")

    secret_key = OpenSSL::HMAC.digest("SHA256", "WebAppData", BOT_TOKEN)
    calculated_hash = OpenSSL::HMAC.hexdigest("SHA256", secret_key, data_check_string)

    return nil unless secure_compare(calculated_hash, hash)

    # опционально: проверка auth_date на "не старше N минут"
    auth_date = params["auth_date"].to_i
    return nil if auth_date.zero? || (Time.now.to_i - auth_date) > 86400

    raw_user = params["user"]
    return nil if raw_user.to_s.strip.empty?

    user_data = JSON.parse(raw_user)

    user = User.find_or_initialize_by(telegram_id: user_data["id"])
    user.first_name = user_data["first_name"]
    user.username    = user_data["username"]
    user.save!

    user.id
  rescue => e
    nil
  end

  def self.secure_compare(a, b)
    return false unless a.bytesize == b.bytesize
    OpenSSL.fixed_length_secure_compare(a, b)
  end
end