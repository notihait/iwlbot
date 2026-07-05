require "securerandom"

class AddPublicIdToWishlists < ActiveRecord::Migration[7.1]
  def change
    return if column_exists?(:wishlists, :public_id)

    add_column :wishlists, :public_id, :string
    add_index :wishlists, :public_id, unique: true

    reversible do |dir|
      dir.up do
        Wishlist.reset_column_information
        Wishlist.find_each do |w|
          w.update_column(:public_id, SecureRandom.urlsafe_base64(16))
        end
      end
    end

    change_column_null :wishlists, :public_id, false
  end
end