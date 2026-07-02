require "sinatra/base"
require "json"
require_relative "../../db/connection"

class GiftsController < Sinatra::Base

  set :host_authorization, {}

  # Создать подарок
  post "/api/gifts" do
    content_type :json

    begin
      payload = JSON.parse(request.body.read)

      wishlist_id = payload["wishlist_id"]
      name        = payload["name"]
      link        = payload["link"]
      pic         = payload["pic"]
      price       = payload["price"]

      if wishlist_id.to_s.strip.empty?
        status 400
        return({ ok: false, error: "wishlist_id required" }.to_json)
      end

      if name.to_s.strip.empty?
        status 400
        return({ ok: false, error: "name required" }.to_json)
      end

      link  = nil if link.to_s.strip.empty?
      pic   = nil if pic.to_s.strip.empty?
      price = nil if price.to_s.strip.empty?

      # Проверяем, что вишлист существует
      exists = DB.conn.exec_params(
        "SELECT id FROM wishlists WHERE id = $1",
        [wishlist_id]
      )

      if exists.ntuples.zero?
        status 404
        return({ ok: false, error: "wishlist not found" }.to_json)
      end

      result = DB.conn.exec_params(
        "INSERT INTO gifts (wishlist_id, name, price, link, pic)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id",
        [wishlist_id, name, price, link, pic]
      )

      status 201
      { ok: true, id: result[0]["id"] }.to_json

    rescue JSON::ParserError
      status 400
      { ok: false, error: "invalid json" }.to_json

    rescue PG::InvalidTextRepresentation
      status 400
      { ok: false, error: "invalid price format" }.to_json

    rescue => e
      puts "GIFTS CREATE ERROR: #{e.message}"
      puts e.backtrace.join("\n")

      status 500
      { ok: false, error: "internal error" }.to_json
    end
  end

  # Список подарков конкретного вишлиста
  get "/api/gifts" do
    content_type :json

    wishlist_id = params["wishlist_id"]

    if wishlist_id.to_s.strip.empty?
      status 400
      return({ ok: false, error: "wishlist_id required" }.to_json)
    end

    result = DB.conn.exec_params(
      "SELECT id, name, price, link, pic, created_at
       FROM gifts
       WHERE wishlist_id = $1
       ORDER BY created_at DESC",
      [wishlist_id]
    )

    result.to_a.to_json
  end

  # Удалить подарок
  delete "/api/gifts/:id" do
    content_type :json

    id = params["id"]

    result = DB.conn.exec_params(
      "DELETE FROM gifts WHERE id = $1 RETURNING id",
      [id]
    )

    if result.ntuples.zero?
      status 404
      return({ ok: false, error: "gift not found" }.to_json)
    end

    { ok: true }.to_json
  end

end