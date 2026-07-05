require "sinatra/base"
require "json"
require "date"

class WishlistsController < Sinatra::Base
  set :host_authorization, {}

  before do
    content_type :json
  end

  # CREATE WISHLIST

  post "/api/wishlists" do
    payload = JSON.parse(request.body.read) rescue halt(400, { ok: false, error: "invalid json" }.to_json)

    user_id    = payload["user_id"]
    title      = payload["title"]
    event_date = payload["event_date"]

    # user_id
    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?
    halt 400, { ok: false, error: "user_id must be a number" }.to_json unless user_id.to_s.match?(/\A\d+\z/)

    # title
    halt 400, { ok: false, error: "title required" }.to_json if title.to_s.strip.empty?
    halt 400, { ok: false, error: "title too long (max 255)" }.to_json if title.to_s.length > 255

    # event_date
    if event_date && !event_date.to_s.strip.empty?
      begin
        Date.iso8601(event_date)
      rescue ArgumentError
        halt 400, { ok: false, error: "invalid event_date format, expected YYYY-MM-DD" }.to_json
      end
    else
      event_date = nil
    end

    # проверяем сущ юзера
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

  # GET WISHLISTS FOR USR

  get "/api/wishlists" do
    user_id = params["user_id"]

    halt 400, { ok: false, error: "user_id required" }.to_json if user_id.to_s.strip.empty?
    halt 400, { ok: false, error: "user_id must be a number" }.to_json unless user_id.to_s.match?(/\A\d+\z/)

    Wishlist.where(user_id: user_id)
            .order(created_at: :desc)
            .to_json
  end

  # GET SINGLE WISHLIST
  get "/api/wishlists/:id" do
    halt 400, { ok: false, error: "invalid id" }.to_json unless params[:id].to_s.match?(/\A\d+\z/)

    wishlist = Wishlist.find_by(id: params[:id])
    halt 404, { ok: false, error: "wishlist not found" }.to_json unless wishlist

    {
      id: wishlist.id,
      title: wishlist.title,
      event_date: wishlist.event_date,
      owner_name: wishlist.user&.first_name
    }.to_json
  end

  # DELETE WISHLIST

  delete "/api/wishlists/:id" do
    halt 400, { ok: false, error: "invalid id" }.to_json unless params[:id].to_s.match?(/\A\d+\z/)

    wishlist = Wishlist.find_by(id: params[:id])
    halt 404, { ok: false, error: "wishlist not found" }.to_json unless wishlist

    wishlist.destroy

    { ok: true }.to_json
  end
end
