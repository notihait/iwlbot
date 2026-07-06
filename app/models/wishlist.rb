class Wishlist < ActiveRecord::Base
  belongs_to :user
  has_many :gifts, dependent: :destroy

  before_create :generate_public_id

  scope :active, -> { where(deleted_at: nil) }
  scope :archived, -> { where.not(deleted_at: nil) }

  def archive!
    update!(deleted_at: Time.now)
    gifts.active.update_all(deleted_at: Time.now)
  end

  private

  def generate_public_id
    self.public_id ||= SecureRandom.urlsafe_base64(16)
  end
end