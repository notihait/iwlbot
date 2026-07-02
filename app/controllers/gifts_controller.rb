require "sinatra/base"
require "json"

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
end