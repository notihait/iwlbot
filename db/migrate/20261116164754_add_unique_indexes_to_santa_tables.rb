class AddUniqueIndexesToSantaTables < ActiveRecord::Migration[7.2]
  def change
    add_index :santa_events, :invite_code, unique: true
    add_index :santa_participants, [:santa_event_id, :user_id], unique: true
    add_index :santa_assignments, [:santa_event_id, :giver_id], unique: true
    add_index :santa_assignments, [:santa_event_id, :receiver_id], unique: true
  end
end