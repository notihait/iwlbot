class AddReservationToGifts < ActiveRecord::Migration[7.1]
    def change
      return if column_exists?(:gifts, :reserved_by_id)
  
      add_column :gifts, :reserved_by_id, :bigint
      add_column :gifts, :reserved_at, :timestamp
      add_foreign_key :gifts, :users, column: :reserved_by_id, on_delete: :nullify
      add_index :gifts, :reserved_by_id
    end
  end