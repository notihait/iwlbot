class Gift < ActiveRecord::Base
  belongs_to :wishlist
  belongs_to :reserved_by, class_name: "User", optional: true, foreign_key: :reserved_by_id
end