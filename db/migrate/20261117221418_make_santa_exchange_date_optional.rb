class MakeSantaExchangeDateOptional < ActiveRecord::Migration[7.1]
  def change
    change_column_null :santa_events, :exchange_date, true
  end
end