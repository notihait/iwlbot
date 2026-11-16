class User < ActiveRecord::Base
  has_many :wishlists, dependent: :destroy
  has_many :wishlist_follows, dependent: :destroy
  has_many :followed_wishlists, through: :wishlist_follows, source: :wishlist
  has_many :santa_participants, dependent: :destroy
  has_many :owned_santa_events, class_name: "SantaEvent", foreign_key: :owner_id
end