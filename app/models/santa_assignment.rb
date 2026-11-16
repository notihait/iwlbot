class SantaAssignment < ActiveRecord::Base
    belongs_to :santa_event
    belongs_to :giver, class_name: "User"
    belongs_to :receiver, class_name: "User"
  end