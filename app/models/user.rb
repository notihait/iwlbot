class User < ActiveRecord::Base
    has_many :wishlists, dependent: :destroy
  end