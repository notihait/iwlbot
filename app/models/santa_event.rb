class SantaEvent < ActiveRecord::Base
    belongs_to :owner, class_name: "User"
    has_many :santa_participants, dependent: :destroy
    has_many :santa_assignments, dependent: :destroy
  
    before_validation :set_invite_code, on: :create
  
    def open? = status == "open"
  
    def draw!
      ids = santa_participants.pluck(:user_id)
      raise "MIN_3_PARTICIPANTS" if ids.size < 3
  
      shuffled = ids.shuffle(random: SecureRandom)
      shuffled.each_with_index do |giver, i|
        santa_assignments.create!(giver_id: giver, receiver_id: shuffled[(i + 1) % shuffled.size])
      end
      update!(status: "drawn")
    end
  
    private
  
    def set_invite_code
      self.invite_code ||= SecureRandom.alphanumeric(8)
    end
  end