class CreateGifts < ActiveRecord::Migration[7.1]
    def change
      return if table_exists?(:gifts)
  
      create_table :gifts do |t|
        t.references :wishlist, null: false, foreign_key: { on_delete: :cascade }
        t.text :name, null: false
        t.decimal :price
        t.text :link
        t.text :pic
        t.timestamp :created_at, default: -> { "NOW()" }
      end
    end
  end
  