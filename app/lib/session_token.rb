require "openssl"
require "base64"

module SessionToken
  SECRET = ENV["APP_SECRET"] || ENV.fetch("BOT_TOKEN")
  TTL = 7 * 24 * 60 * 60 # 7 дней — токен обновляется при каждом открытии мини-аппа

  def self.generate(user_id)
    expires_at = Time.now.to_i + TTL
    payload = "#{user_id}:#{expires_at}"
    signature = OpenSSL::HMAC.hexdigest("SHA256", SECRET, payload)
    Base64.urlsafe_encode64("#{payload}:#{signature}")
  end

  def self.verify(token)
    return nil if token.to_s.strip.empty?

    decoded = begin
      Base64.urlsafe_decode64(token)
    rescue ArgumentError
      nil
    end
    return nil if decoded.nil?

    user_id, expires_at, signature = decoded.split(":", 3)
    return nil if user_id.nil? || expires_at.nil? || signature.nil?

    payload = "#{user_id}:#{expires_at}"
    expected_signature = OpenSSL::HMAC.hexdigest("SHA256", SECRET, payload)

    return nil unless secure_compare(signature, expected_signature)
    return nil if expires_at.to_i < Time.now.to_i

    user_id
  end

  def self.secure_compare(a, b)
    return false unless a.bytesize == b.bytesize
    OpenSSL.fixed_length_secure_compare(a, b)
  end
end