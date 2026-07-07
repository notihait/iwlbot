require "sinatra/base"
require "json"
require_relative "../services/notify_followers_service"
require_relative "../helpers/auth_helper"

class GiftsController < Sinatra::Base
  set :host_authorization, {}
  disable :protection
  helpers AuthHelper

  MAX_NAME_LENGTH = 200
  MAX_PIC_BASE64_SIZE = 500_000 # ~500 КБ base64-строки, с запасом на сжатую картинку 300x300
  PRICE_REGEX = /\A\d+(\.\d{1,2})?\z/
  PIC_DATA_URL_REGEX = /\Adata:image\/(png|jpe?g|webp|gif);base64,/
  LINK_REGEX = /\Ahttps?:\/\//i

  before do
    content_type :json
  end

  # CREATE GIFT

  post "/api/gifts" do
    user_id = current_user_id!

    payload = JSON.parse(request.body.read)

    wishlist_id = payload["wishlist_id"]
    name        = payload["name"]
    link        = payload["link"]
    pic         = payload["pic"]
    price       = payload["price"]

    halt 400, { ok: false, error: "wishlist_id required" }.to_json if wishlist_id.to_s.strip.empty?
    halt 400, { ok: false, error: "name required" }.to_json if name.to_s.strip.empty?
    halt 400, { ok: false, error: "name too long" }.to_json if name.to_s.strip.length > MAX_NAME_LENGTH

    if price && !price.to_s.strip.empty?
      halt 400, { ok: false, error: "price must be a valid number" }.to_json unless price.to_s.strip.match?(PRICE_REGEX)
    end

    if link && !link.to_s.strip.empty?
      halt 400, { ok: false, error: "link must start with http:// or https://" }.to_json unless link.to_s.strip.match?(LINK_REGEX)
    end

    if pic && !pic.to_s.strip.empty?
      halt 400, { ok: false, error: "invalid image format" }.to_json unless pic.match?(PIC_DATA_URL_REGEX)
      halt 400, { ok: false, error: "image too large" }.to_json if pic.bytesize > MAX_PIC_BASE64_SIZE
    end

    wishlist = Wishlist.active.find_by(id: wishlist_id)
    halt 404, { ok: false, error: "wishlist not found" }.to_json unless wishlist
    halt 403, { ok: false, error: "forbidden" }.to_json unless wishlist.user_id.to_s == user_id.to_s

    gift = wishlist.gifts.new(
      name: name.strip,
      link: link,
      pic: pic,
      price: (price && !price.to_s.strip.empty?) ? price : nil
    )

    gift.save!

    owner_name = wishlist.user&.first_name || "друга"
    wishlist_link = NotifyFollowersService.wishlist_link_html(wishlist)

    NotifyFollowersService.call(
      wishlist,
      "🎁 #{owner_name} добавил(а) новый подарок в вишлист #{wishlist_link}: #{gift.name}",
      exclude_user_id: user_id
    )

    status 201
    { ok: true, id: gift.id }.to_json
  end

  # UPDATE GIFT

  put "/api/gifts/:id" do
    user_id = current_user_id!

    gift = Gift.active.find_by(id: params[:id])
    halt 404, { ok: false, error: "gift not found" }.to_json unless gift
    halt 403, { ok: false, error: "forbidden" }.to_json unless gift.wishlist.user_id.to_s == user_id.to_s

    payload = JSON.parse(request.body.read) rescue halt(400, { ok: false, error: "invalid json" }.to_json)

    name  = payload["name"]
    link  = payload["link"]
    pic   = payload["pic"]
    price = payload["price"]

    halt 400, { ok: false, error: "name required" }.to_json if name.to_s.strip.empty?
    halt 400, { ok: false, error: "name too long" }.to_json if name.to_s.strip.length > MAX_NAME_LENGTH

    if price && !price.to_s.strip.empty?
      halt 400, { ok: false, error: "price must be a valid number" }.to_json unless price.to_s.strip.match?(PRICE_REGEX)
    end

    if link && !link.to_s.strip.empty?
      halt 400, { ok: false, error: "link must start with http:// or https://" }.to_json unless link.to_s.strip.match?(LINK_REGEX)
    end

    if pic && !pic.to_s.strip.empty?
      halt 400, { ok: false, error: "invalid image format" }.to_json unless pic.match?(PIC_DATA_URL_REGEX)
      halt 400, { ok: false, error: "image too large" }.to_json if pic.bytesize > MAX_PIC_BASE64_SIZE
    end

    gift.update!(
      name: name.strip,
      link: link,
      pic: pic,
      price: (price && !price.to_s.strip.empty?) ? price : nil
    )

    { ok: true }.to_json
  end

  # GET GIFTS (публичный просмотр — используется и владельцем, и по расшаренной ссылке)

  get "/api/gifts" do
    viewer_id = current_user_id!

    wishlist_id = params["wishlist_id"]

    halt 400, { ok: false, error: "wishlist_id required" }.to_json if wishlist_id.to_s.strip.empty?

    gifts = Gift.active
                .where(wishlist_id: wishlist_id)
                .order(created_at: :desc)

    result = gifts.map do |g|
      {
        id: g.id,
        name: g.name,
        link: g.link,
        pic: g.pic,
        price: g.price,
        reserved: g.reserved_by_id.present?,
        reserved_by_me: g.reserved_by_id.to_s == viewer_id.to_s
      }
    end

    result.to_json
  end

  # RESERVE GIFT

  post "/api/gifts/:id/reserve" do
    user_id = current_user_id!

    gift = Gift.active.find_by(id: params[:id])
    halt 404, { ok: false, error: "gift not found" }.to_json unless gift

    if gift.reserved_by_id && gift.reserved_by_id.to_s != user_id.to_s
      halt 409, { ok: false, error: "подарок уже забронирован" }.to_json
    end

    already_reserved_by_same_user = gift.reserved_by_id.to_s == user_id.to_s

    gift.update!(reserved_by_id: user_id, reserved_at: Time.now)

    wishlist = gift.wishlist
    if !already_reserved_by_same_user && wishlist.user_id.to_s != user_id.to_s
      NotifyFollowersService.notify_owner(
        wishlist,
        "🔒 Подарок «#{gift.name}» в вишлисте «#{wishlist.title}» кто-то забронировал"
      )
    end

    { ok: true }.to_json
  end

  # CANCEL RESERVATION

  delete "/api/gifts/:id/reserve" do
    user_id = current_user_id!

    gift = Gift.active.find_by(id: params[:id])
    halt 404, { ok: false, error: "gift not found" }.to_json unless gift

    wishlist = gift.wishlist

    is_owner    = wishlist.user_id.to_s == user_id.to_s
    is_reserver = gift.reserved_by_id && gift.reserved_by_id.to_s == user_id.to_s

    if gift.reserved_by_id && !is_owner && !is_reserver
      halt 403, { ok: false, error: "бронь принадлежит другому пользователю" }.to_json
    end

    was_reserved = gift.reserved_by_id.present?

    gift.update!(reserved_by_id: nil, reserved_at: nil)

    if was_reserved && !is_owner
      NotifyFollowersService.notify_owner(
        wishlist,
        "🔓 Бронь с подарка «#{gift.name}» в вишлисте «#{wishlist.title}» снята"
      )
    end

    { ok: true }.to_json
  end

  # DELETE GIFT (soft delete / архивация)

  delete "/api/gifts/:id" do
    user_id = current_user_id!

    gift = Gift.active.find_by(id: params[:id])
    halt 404, { ok: false, error: "gift not found" }.to_json unless gift
    halt 403, { ok: false, error: "forbidden" }.to_json unless gift.wishlist.user_id.to_s == user_id.to_s

    gift.update!(deleted_at: Time.now)

    { ok: true }.to_json
  end
end