require "sinatra/base"
require "json"
require_relative "../../app/services/telegram_auth_service"

class AuthController < Sinatra::Base

  post "/api/auth" do
    payload = JSON.parse(request.body.read)

    user_id = TelegramAuthService.call(payload["initData"])

    content_type :json
    { ok: true, user_id: user_id }.to_json
  end

end