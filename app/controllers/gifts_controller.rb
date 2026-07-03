require "sinatra/base"
require "json"

class GiftsController < Sinatra::Base
  set :host_authorization, {}

  before do
    content_type :json
  end

  # =========================
  # CREATE GIFT
  # =========================
  post "/api/gifts" do
    payload = JSON.parse(request.body.read)

    wishlist_id = payload["wishlist_id"]
    name        = payload["name"]
    link        = payload["link"]
    pic         = payload["pic"]
    price       = payload["price"]

    halt 400, { ok: false, error: "wishlist_id required" }.to_json if wishlist_id.to_s.strip.empty?
    halt 400, { ok: false, error: "name required" }.to_json if name.to_s.strip.empty?

    wishlist = Wishlist.find(wishlist_id)

    gift = wishlist.gifts.new(
      name: name,
      link: link,
      pic: pic,
      price: price
    )

    gift.save!

    status 201
    { ok: true, id: gift.id }.to_json
  end

  # =========================
  # GET GIFTS (FIX FOR YOUR BUG)
  # =========================
  get "/api/gifts" do
    wishlist_id = params["wishlist_id"]

    halt 400, { ok: false, error: "wishlist_id required" }.to_json if wishlist_id.to_s.strip.empty?

    gifts = Gift.where(wishlist_id: wishlist_id)
                .order(created_at: :desc)

    gifts.to_json
  end

  # =========================
  # DELETE GIFT (USED IN FRONTEND)
  # =========================
  delete "/api/gifts/:id" do
    gift = Gift.find(params[:id])
    gift.destroy

    { ok: true }.to_json
  end
end