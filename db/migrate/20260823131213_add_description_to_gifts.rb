class AddDescriptionToGifts < ActiveRecord::Migration[7.1]
  def change
    return if column_exists?(:gifts, :description)

    add_column :gifts, :description, :text
  end
end
