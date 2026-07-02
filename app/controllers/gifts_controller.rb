require "sinatra/base"
require "json"
require_relative "../../db/connection"
require_relative "../models/wishlist"
require_relative "../models/gift"

class GiftsController < Sinatra::Base

  set :host_authorization, {}

  post "/api/gifts" do
    content_type :json

    payload = JSON.parse(request.body.read)

    wishlist_id = payload["wishlist_id"]
    name        = payload["name"]
    link        = payload["link"]
    pic         = payload["pic"]
    price       = payload["price"]

    halt 400, { ok: false, error: "wishlist_id required" }.to_json if wishlist_id.to_s.strip.empty?
    halt 400, { ok: false, error: "name required" }.to_json if name.to_s.strip.empty?

    link  = nil if link.to_s.strip.empty?
    pic   = nil if pic.to_s.strip.empty?
    price = nil if price.to_s.strip.empty?

    wishlist = Wishlist.find_by(id: wishlist_id)
    halt 404, { ok: false, error: "wishlist not found" }.to_json unless wishlist

    gift = wishlist.gifts.new(name: name, link: link, pic: pic, price: price)

    if gift.save
      status 201
      { ok: true, id: gift.id }.to_json
    else
      status 422
      { ok: false, error: gift.errors.full_messages.join(", ") }.to_json
    end
  rescue ActiveRecord::RecordInvalid, ArgumentError => e
    status 400
    { ok: false, error: "invalid price format" }.to_json
  end

  get "/api/gifts" do
    content_type :json

    wishlist_id = params["wishlist_id"]
    halt 400, { ok: false, error: "wishlist_id required" }.to_json if wishlist_id.to_s.strip.empty?

    gifts = Gift.where(wishlist_id: wishlist_id).order(created_at: :desc)

    gifts.map { |g|
      {
        id: g.id,
        name: g.name,
        price: g.price,
        link: g.link,
        pic: g.pic,
        created_at: g.created_at
      }
    }.to_json
  end

  delete "/api/gifts/:id" do
    content_type :json

    gift = Gift.find_by(id: params["id"])

    if gift
      gift.destroy
      { ok: true }.to_json
    else
      status 404
      { ok: false, error: "gift not found" }.to_json
    end
  end

end