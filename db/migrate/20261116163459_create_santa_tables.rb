class CreateSantaTables < ActiveRecord::Migration[7.0]
  def change
    create_table :santa_events do |t|
      t.bigint  :owner_id, null: false
      t.string  :title, null: false
      t.integer :budget
      t.string  :currency, null: false, default: "RUB"
      t.date    :exchange_date, null: false
      t.string  :status, null: false, default: "open"
      t.string  :invite_code, null: false
      t.timestamps
    end
    add_index :santa_events, :invite_code, unique: true

    create_table :santa_participants do |t|
      t.references :santa_event, null: false, foreign_key: true
      t.bigint :user_id, null: false
      t.bigint :wishlist_id
      t.timestamps
    end
    add_index :santa_participants, [:santa_event_id, :user_id], unique: true

    create_table :santa_assignments do |t|
      t.references :santa_event, null: false, foreign_key: true
      t.bigint :giver_id, null: false
      t.bigint :receiver_id, null: false
      t.timestamps
    end
    add_index :santa_assignments, [:santa_event_id, :giver_id], unique: true
    add_index :santa_assignments, [:santa_event_id, :receiver_id], unique: true
  end
end