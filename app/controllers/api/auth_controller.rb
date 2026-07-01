require "sinatra/base"
require "json"
require_relative "../services/telegram_auth_service"

class AuthController < Sinatra::Base

  post "/api/auth" do
    begin
      payload = JSON.parse(request.body.read)

      init_data = payload["initData"]
      halt 400, { ok: false, error: "initData required" }.to_json if init_data.to_s.strip.empty?

      user_id = TelegramAuthService.call(init_data)

      content_type :json
      { ok: true, user_id: user_id }.to_json

    rescue JSON::ParserError => e
      puts "AUTH JSON ERROR: #{e.message}"

      status 400
      { ok: false, error: "invalid json" }.to_json

    rescue => e
      puts "AUTH ERROR: #{e.message}"
      puts e.backtrace.join("\n")

      status 500
      content_type :json
      { ok: false, error: e.message }.to_json
    end
  end

end