require "json"
require "rack/utils"
require_relative "../../db/connection"

class TelegramAuthService
  def self.call(init_data)
    params = Rack::Utils.parse_nested_query(init_data)

    raw_user = params["user"]
    raise "no user in initData" if raw_user.to_s.strip.empty?

    # 🔥 FIX: иногда приходит URL-encoded JSON
    decoded_user = begin
      URI.decode_www_form_component(raw_user)
    rescue
      raw_user
    end

    user_data = begin
      JSON.parse(decoded_user)
    rescue JSON::ParserError
      # fallback: иногда уже норм JSON
      JSON.parse(raw_user)
    end

    telegram_id = user_data["id"]
    first_name  = user_data["first_name"]
    username    = user_data["username"]

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