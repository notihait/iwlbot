class AddRemindersToGifts < ActiveRecord::Migration[7.1]
    def change
      unless column_exists?(:gifts, :reminder_7d_sent_at)
        add_column :gifts, :reminder_7d_sent_at, :timestamp
      end
  
      unless column_exists?(:gifts, :reminder_3d_sent_at)
        add_column :gifts, :reminder_3d_sent_at, :timestamp
      end
    end
  end