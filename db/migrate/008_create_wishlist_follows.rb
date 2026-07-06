class CreateWishlistFollows < ActiveRecord::Migration[7.1]
    def change
      return if table_exists?(:wishlist_follows)
  
      create_table :wishlist_follows do |t|
        t.references :user, null: false, foreign_key: { on_delete: :cascade }
        t.references :wishlist, null: false, foreign_key: { on_delete: :cascade }
        t.timestamp :created_at, default: -> { "NOW()" }
      end
  
      add_index :wishlist_follows, [:user_id, :wishlist_id], unique: true
    end
  end