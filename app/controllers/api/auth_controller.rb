require "sinatra/base"
require "json"
require_relative "../../services/telegram_auth_service"
require_relative "../../lib/session_token"

class AuthController < Sinatra::Base
  set :host_authorization, {}
  disable :protection

  post "/api/auth" do
    content_type :json

    payload = JSON.parse(request.body.read)

    init_data = payload["initData"]

    halt 400, { ok: false, error: "initData required" }.to_json if init_data.to_s.strip.empty?

    user_id = TelegramAuthService.call(init_data)

    halt 400, { ok: false, error: "telegram auth failed" }.to_json if user_id.nil?

    token = SessionToken.generate(user_id)

    { ok: true, user_id: user_id, token: token }.to_json
  end
end