require "uri"
require "json"
require_relative "../db/connection"

class TelegramAuthService
  def self.call(init_data)
    puts "INIT_DATA: #{init_data}"
    # Парсим Telegram initData (правильный способ)
    params = URI.decode_www_form(init_data).to_h

    user_json = params["user"]

    raise "user missing in initData" if user_json.nil? || user_json.strip.empty?

    user_data = JSON.parse(user_json)

    telegram_id = user_data["id"]
    first_name = user_data["first_name"]
    username = user_data["username"]

    result = DB.conn.exec_params(<<~SQL, [telegram_id, first_name, username])
      INSERT INTO users (telegram_id, first_name, username)
      VALUES ($1, $2, $3)
      ON CONFLICT (telegram_id)
      DO UPDATE SET first_name = EXCLUDED.first_name,
                    username = EXCLUDED.username
      RETURNING id
    SQL

    result[0]["id"]
  end
end