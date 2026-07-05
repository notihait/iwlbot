class Wishlist < ActiveRecord::Base
    belongs_to :user
    has_many :gifts, dependent: :destroy
  
    before_create :generate_public_id
  
    private
  
    def generate_public_id
      self.public_id ||= SecureRandom.urlsafe_base64(16)
    end
  end