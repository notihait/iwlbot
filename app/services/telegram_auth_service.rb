require "json"
require "rack/utils"

class TelegramAuthService
  def self.call(init_data)
    params = Rack::Utils.parse_nested_query(init_data)

    raw_user = params["user"]
    raise "no user in initData" if raw_user.to_s.strip.empty?

    decoded_user = begin
      URI.decode_www_form_component(raw_user)
    rescue
      raw_user
    end

    user_data = JSON.parse(decoded_user) rescue JSON.parse(raw_user)

    telegram_id = user_data["id"]
    first_name  = user_data["first_name"]
    username    = user_data["username"]

    user = User.find_or_initialize_by(telegram_id: telegram_id)
    user.first_name = first_name
    user.username   = username

    user.save!

    user.id
  end
end