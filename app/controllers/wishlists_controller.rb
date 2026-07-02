require "sinatra/base"
require "json"

class WishlistsController < Sinatra::Base
  set :host_authorization, {}

  post "/api/wishlists" do
    content_type :json

    payload = JSON.parse(request.body.read)

    user_id    = payload["user_id"]
    title      = payload["title"]
    event_date = payload["event_date"]

    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?
    halt 400, { ok: false, error: "title required" }.to_json if title.to_s.strip.empty?

    user = User.find(user_id)

    wishlist = user.wishlists.new(
      title: title,
      event_date: event_date
    )

    wishlist.save!

    { ok: true, id: wishlist.id }.to_json
  end

  get "/api/wishlists" do
    content_type :json

    user_id = params["user_id"]
    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?

    Wishlist.where(user_id: user_id)
            .order(created_at: :desc)
            .to_json
  end
end