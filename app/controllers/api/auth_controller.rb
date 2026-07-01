require "sinatra/base"
require_relative "../../app/services/telegram_auth_service"

class AuthController < Sinatra::Base
  post "/api/auth" do
    payload = JSON.parse(request.body.read)

    result = TelegramAuthService.call(payload["initData"])

    content_type :json
    { ok: true, user_id: result }.to_json
  end
end