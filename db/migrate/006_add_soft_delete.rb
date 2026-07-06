class AddSoftDelete < ActiveRecord::Migration[7.1]
    def change
      unless column_exists?(:wishlists, :deleted_at)
        add_column :wishlists, :deleted_at, :timestamp
        add_index :wishlists, :deleted_at
      end
  
      unless column_exists?(:gifts, :deleted_at)
        add_column :gifts, :deleted_at, :timestamp
        add_index :gifts, :deleted_at
      end
    end
  end