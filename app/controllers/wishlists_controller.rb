require "sinatra/base"
require "json"
require_relative "../../db/connection"

class WishlistsController < Sinatra::Base

  post "/api/wishlists" do
    payload = JSON.parse(request.body.read)

    user_id = payload["user_id"]
    title = payload["title"]
    event_date = payload["event_date"]

    halt 400, { ok: false, error: "title required" }.to_json if title.to_s.strip.empty?
    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?

    # 💥 FIX: empty string -> NULL
    event_date = nil if event_date.to_s.strip.empty?

    result = DB.conn.exec_params(
      "INSERT INTO wishlists (user_id, title, event_date)
       VALUES ($1, $2, $3)
       RETURNING id",
      [user_id, title, event_date]
    )

    content_type :json
    { ok: true, id: result[0]["id"] }.to_json
  end


  get "/api/wishlists" do
    user_id = params["user_id"]

    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?

    result = DB.conn.exec_params(
      "SELECT id, title, event_date, created_at
       FROM wishlists
       WHERE user_id = $1
       ORDER BY created_at DESC",
      [user_id]
    )

    content_type :json
    result.to_a.to_json
  end

end