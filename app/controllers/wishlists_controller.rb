require "sinatra/base"
require "json"
require "date"
require_relative "../services/notify_followers_service"

class WishlistsController < Sinatra::Base
  set :host_authorization, {}
  disable :protection

  before do
    content_type :json
  end

  # CREATE WISHLIST

  post "/api/wishlists" do
    payload = JSON.parse(request.body.read) rescue halt(400, { ok: false, error: "invalid json" }.to_json)

    user_id    = payload["user_id"]
    title      = payload["title"]
    event_date = payload["event_date"]

    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?
    halt 400, { ok: false, error: "user_id must be a number" }.to_json unless user_id.to_s.match?(/\A\d+\z/)

    halt 400, { ok: false, error: "title required" }.to_json if title.to_s.strip.empty?
    halt 400, { ok: false, error: "title too long (max 255)" }.to_json if title.to_s.length > 255

    if event_date && !event_date.to_s.strip.empty?
      begin
        Date.iso8601(event_date)
      rescue ArgumentError
        halt 400, { ok: false, error: "invalid event_date format, expected YYYY-MM-DD" }.to_json
      end
    else
      event_date = nil
    end

    user = User.find_by(id: user_id)
    halt 404, { ok: false, error: "user not found" }.to_json unless user

    wishlist = user.wishlists.new(
      title: title.to_s.strip,
      event_date: event_date
    )

    if wishlist.save
      status 201
      { ok: true, id: wishlist.id }.to_json
    else
      halt 422, { ok: false, error: wishlist.errors.full_messages.join(", ") }.to_json
    end
  end

  # UPDATE WISHLIST

  put "/api/wishlists/:id" do
    halt 400, { ok: false, error: "invalid id" }.to_json unless params[:id].to_s.match?(/\A\d+\z/)

    wishlist = Wishlist.active.find_by(id: params[:id])
    halt 404, { ok: false, error: "wishlist not found" }.to_json unless wishlist

    payload = JSON.parse(request.body.read) rescue halt(400, { ok: false, error: "invalid json" }.to_json)

    title      = payload["title"]
    event_date = payload["event_date"]

    halt 400, { ok: false, error: "title required" }.to_json if title.to_s.strip.empty?
    halt 400, { ok: false, error: "title too long (max 255)" }.to_json if title.to_s.length > 255

    if event_date && !event_date.to_s.strip.empty?
      begin
        Date.iso8601(event_date)
      rescue ArgumentError
        halt 400, { ok: false, error: "invalid event_date format, expected YYYY-MM-DD" }.to_json
      end
    else
      event_date = nil
    end

    if wishlist.update(title: title.to_s.strip, event_date: event_date)
      owner_name = wishlist.user&.first_name || "друга"

      NotifyFollowersService.call(
        wishlist,
        "✏️ #{owner_name} обновил(а) вишлист «#{wishlist.title}»"
      )
      { ok: true }.to_json
    else
      halt 422, { ok: false, error: wishlist.errors.full_messages.join(", ") }.to_json
    end
  end

  # GET WISHLISTS FOR USR

  get "/api/wishlists" do
    user_id = params["user_id"]

    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?
    halt 400, { ok: false, error: "user_id must be a number" }.to_json unless user_id.to_s.match?(/\A\d+\z/)

    Wishlist.active
            .where(user_id: user_id)
            .order(created_at: :desc)
            .to_json
  end

  # GET SINGLE WISHLIST BY PUBLIC ID (для расшаренных ссылок)
  get "/api/wishlists/public/:public_id" do
    viewer_id = params["viewer_id"]

    wishlist = Wishlist.active.find_by(public_id: params[:public_id])
    halt 404, { ok: false, error: "wishlist not found" }.to_json unless wishlist

    is_following = viewer_id.present? &&
      WishlistFollow.exists?(wishlist_id: wishlist.id, user_id: viewer_id)

    {
      id: wishlist.id,
      owner_id: wishlist.user_id,
      title: wishlist.title,
      event_date: wishlist.event_date,
      owner_name: wishlist.user&.first_name,
      is_following: is_following
    }.to_json
  end

  # FOLLOW WISHLIST

  post "/api/wishlists/:id/follow" do
    payload = JSON.parse(request.body.read) rescue halt(400, { ok: false, error: "invalid json" }.to_json)
    user_id = payload["user_id"]

    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?

    wishlist = Wishlist.active.find_by(id: params[:id])
    halt 404, { ok: false, error: "wishlist not found" }.to_json unless wishlist

    user = User.find_by(id: user_id)
    halt 404, { ok: false, error: "user not found" }.to_json unless user

    halt 400, { ok: false, error: "нельзя подписаться на свой вишлист" }.to_json if wishlist.user_id.to_s == user_id.to_s

    WishlistFollow.find_or_create_by!(user: user, wishlist: wishlist)

    { ok: true }.to_json
  end

  # UNFOLLOW WISHLIST

  delete "/api/wishlists/:id/follow" do
    payload = JSON.parse(request.body.read) rescue {}
    user_id = payload["user_id"] || params["user_id"]

    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?

    follow = WishlistFollow.find_by(wishlist_id: params[:id], user_id: user_id)
    follow&.destroy

    { ok: true }.to_json
  end

  # GET FOLLOWED WISHLISTS

  get "/api/wishlists/followed" do
    user_id = params["user_id"]

    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?

    user = User.find_by(id: user_id)
    halt 404, { ok: false, error: "user not found" }.to_json unless user

    result = user.followed_wishlists
                 .merge(Wishlist.active)
                 .order(created_at: :desc)
                 .map do |w|
      {
        id: w.id,
        public_id: w.public_id,
        title: w.title,
        event_date: w.event_date,
        owner_name: w.user&.first_name
      }
    end

    result.to_json
  end

  # DELETE WISHLIST (soft delete / архивация)

  delete "/api/wishlists/:id" do
    halt 400, { ok: false, error: "invalid id" }.to_json unless params[:id].to_s.match?(/\A\d+\z/)

    wishlist = Wishlist.active.find_by(id: params[:id])
    halt 404, { ok: false, error: "wishlist not found" }.to_json unless wishlist

    owner_name = wishlist.user&.first_name || "друга"

    NotifyFollowersService.call(
      wishlist,
      "🗑 #{owner_name} удалил(а) вишлист «#{wishlist.title}»"
    )

    wishlist.archive!

    { ok: true }.to_json
  end
end