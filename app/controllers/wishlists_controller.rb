require "sinatra/base"
require "json"
require_relative "../../db/connection"
require_relative "../models/user"
require_relative "../models/wishlist"

class WishlistsController < Sinatra::Base

  set :host_authorization, {}

  post "/api/wishlists" do
    content_type :json

    payload = JSON.parse(request.body.read)

    user_id = payload["user_id"]
    title = payload["title"]
    event_date = payload["event_date"]

    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?
    halt 400, { ok: false, error: "title required" }.to_json if title.to_s.strip.empty?

    event_date = nil if event_date.to_s.strip.empty?

    user = User.find_by(id: user_id)
    halt 404, { ok: false, error: "user not found" }.to_json unless user

    wishlist = user.wishlists.new(title: title, event_date: event_date)

    if wishlist.save
      { ok: true, id: wishlist.id }.to_json
    else
      status 422
      { ok: false, error: wishlist.errors.full_messages.join(", ") }.to_json
    end
  end

  get "/api/wishlists" do
    content_type :json

    user_id = params["user_id"]
    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?

    wishlists = Wishlist.where(user_id: user_id).order(created_at: :desc)

    wishlists.map { |w|
      {
        id: w.id,
        title: w.title,
        event_date: w.event_date,
        created_at: w.created_at
      }
    }.to_json
  end

end