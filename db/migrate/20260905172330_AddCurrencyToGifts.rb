class AddCurrencyToGifts < ActiveRecord::Migration[7.1]
  def change
    add_column :gifts, :currency, :integer, null: false, default: 0
  end
end