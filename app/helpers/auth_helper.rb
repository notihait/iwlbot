require_relative "../lib/session_token"

module AuthHelper
  # Возвращает user_id из валидного токена, либо прерывает запрос 401
  def current_user_id!
    header = request.env["HTTP_AUTHORIZATION"].to_s
    token = header.sub(/\ABearer\s+/i, "").strip

    halt 401, { ok: false, error: "unauthorized" }.to_json if token.empty?

    user_id = SessionToken.verify(token)
    halt 401, { ok: false, error: "invalid or expired token" }.to_json if user_id.nil?

    user_id
  end
end