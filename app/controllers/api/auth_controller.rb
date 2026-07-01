require "sinatra/base"
require "json"
require_relative "../../services/telegram_auth_service"

class AuthController < Sinatra::Base

  set :protection, except: :host_authorization

  post "/api/auth" do
    content_type :json

    begin
      payload = JSON.parse(request.body.read)

      init_data = payload["initData"]

      if init_data.to_s.strip.empty?
        status 400
        return({ ok: false, error: "initData required" }.to_json)
      end

      user_id = TelegramAuthService.call(init_data)

      if user_id.nil?
        status 400
        return({ ok: false, error: "telegram auth failed" }.to_json)
      end

      { ok: true, user_id: user_id }.to_json

    rescue JSON::ParserError
      status 400
      { ok: false, error: "invalid json" }.to_json

    rescue => e
      puts "AUTH ERROR: #{e.message}"
      puts e.backtrace.join("\n")

      status 500
      { ok: false, error: "internal error" }.to_json
    end
  end

end