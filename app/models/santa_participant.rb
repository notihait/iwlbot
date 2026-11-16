class SantaParticipant < ActiveRecord::Base
  belongs_to :santa_event
  belongs_to :user
end