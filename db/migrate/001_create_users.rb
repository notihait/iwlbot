class CreateUsers < ActiveRecord::Migration[7.1]
    def change
      return if table_exists?(:users)
  
      create_table :users do |t|
        t.bigint :telegram_id, null: false
        t.text :first_name
        t.text :username
        t.timestamp :created_at, default: -> { "NOW()" }
      end
  
      add_index :users, :telegram_id, unique: true
    end
  end