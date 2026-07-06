ENV["RACK_ENV"] ||= "production"

require "dotenv/load"
require_relative "../db/connection"
require_relative "../app/models/user"
require_relative "../app/models/wishlist"
require_relative "../app/models/gift"

CUTOFF = 30.days rescue nil # на случай без ActiveSupport core_ext — считаем вручную
cutoff_time = Time.now - (30 * 24 * 60 * 60)

gifts_deleted = Gift.archived.where("deleted_at < ?", cutoff_time).delete_all
wishlists_to_purge = Wishlist.archived.where("deleted_at < ?", cutoff_time)
wishlists_count = wishlists_to_purge.count
wishlists_to_purge.destroy_all # destroy_all чтобы сработал dependent: :destroy на оставшихся связях

puts "Purged: #{wishlists_count} wishlists, #{gifts_deleted} standalone archived gifts"