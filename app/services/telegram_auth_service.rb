require "openssl"
require "json"
require "cgi"
require_relative "../db/connection"

class TelegramAuthService
  def self.call(init_data)
    parsed = CGI.parse(init_data)
    user_json = parsed["user"]&.first
    user_data = JSON.parse(user_json)

    telegram_id = user_data["id"]
    first_name = user_data["first_name"]
    username = user_data["username"]

    result = DB.conn.exec_params(<<~SQL, [telegram_id, first_name, username])
      INSERT INTO users (telegram_id, first_name, username)
      VALUES ($1, $2, $3)
      ON CONFLICT (telegram_id)
      DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    SQL

    result[0]["id"] # <-- ВАЖНО: это users.id
  end
end