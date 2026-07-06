require "net/http"
require "uri"

class NotifyFollowersService
  def self.call(wishlist, text, exclude_user_id: nil)
    bot_token = ENV["BOT_TOKEN"]
    return if bot_token.to_s.empty?

    wishlist.followers.each do |follower|
      next if follower.telegram_id.nil?
      next if exclude_user_id && follower.id.to_s == exclude_user_id.to_s

      begin
        uri = URI.parse("https://api.telegram.org/bot#{bot_token}/sendMessage")
        Net::HTTP.post_form(uri, "chat_id" => follower.telegram_id, "text" => text)
      rescue => e
        warn "Failed to notify follower #{follower.id}: #{e.class} - #{e.message}"
      end
    end
  end
end