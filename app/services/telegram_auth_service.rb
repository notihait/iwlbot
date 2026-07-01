require "uri"
require "json"
require_relative "../../db/connection"

class TelegramAuthService
  def self.call(init_data)
    puts "=== INIT DATA ==="
    puts init_data.inspect

    params = URI.decode_www_form(init_data).to_h

    puts "=== PARSED PARAMS ==="
    puts params.inspect

    user_json = params["user"]

    if user_json.nil? || user_json.strip.empty?
      puts "❌ USER IS NIL"
      return nil
    end

    puts "=== USER JSON ==="
    puts user_json

    user_data = JSON.parse(user_json)

    puts "=== USER DATA ==="
    puts user_data.inspect

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

    puts "=== DB RESULT ==="
    puts result.inspect

    result[0]["id"]
  rescue => e
    puts "🔥 TELEGRAM AUTH ERROR: #{e.message}"
    puts e.backtrace
    raise e
  end
end