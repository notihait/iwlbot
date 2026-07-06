class User < ActiveRecord::Base
  has_many :wishlists, dependent: :destroy
  has_many :wishlist_follows, dependent: :destroy
  has_many :followed_wishlists, through: :wishlist_follows, source: :wishlist
end