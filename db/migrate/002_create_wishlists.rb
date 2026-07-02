class CreateWishlists < ActiveRecord::Migration[7.1]
    def change
      return if table_exists?(:wishlists)
  
      create_table :wishlists do |t|
        t.references :user, null: false, foreign_key: { on_delete: :cascade }
        t.text :title, null: false
        t.date :event_date
        t.timestamp :created_at, default: -> { "NOW()" }
      end
    end
  end