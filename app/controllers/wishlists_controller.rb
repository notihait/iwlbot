require "sinatra/base"
require_relative "../db/connection"

class WishlistsController < Sinatra::Base
  post "/api/wishlists" do
    payload = JSON.parse(request.body.read)

    user_id = payload["user_id"]
    title = payload["title"]
    event_date = payload["event_date"]

    result = DB.conn.exec_params(
      "INSERT INTO wishlists (user_id, title, event_date)
       VALUES ($1, $2, $3)
       RETURNING id",
      [user_id, title, event_date]
    )

    content_type :json
    { ok: true, id: result[0]["id"] }.to_json
  end
end