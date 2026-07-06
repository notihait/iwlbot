require "net/http"
require "uri"

class NotifyFollowersService
  BOT_USERNAME = ENV["BOT_USERNAME"] || "IWIshList_bot"

  def self.call(wishlist, text, exclude_user_id: nil)
    bot_token = ENV["BOT_TOKEN"]
    return if bot_token.to_s.empty?

    full_text = "#{text}\n\n#{wishlist_link(wishlist)}"

    wishlist.followers.each do |follower|
      next if follower.telegram_id.nil?
      next if exclude_user_id && follower.id.to_s == exclude_user_id.to_s

      send_message(bot_token, follower.telegram_id, full_text)
    end
  end

  def self.notify_owner(wishlist, text)
    bot_token = ENV["BOT_TOKEN"]
    return if bot_token.to_s.empty?

    owner = wishlist.user
    return if owner.nil? || owner.telegram_id.nil?

    send_message(bot_token, owner.telegram_id, text)
  end

  def self.wishlist_link(wishlist)
    "https://t.me/#{BOT_USERNAME}?startapp=wishlist_#{wishlist.public_id}"
  end

  def self.send_message(bot_token, chat_id, text)
    uri = URI.parse("https://api.telegram.org/bot#{bot_token}/sendMessage")
    Net::HTTP.post_form(uri, "chat_id" => chat_id, "text" => text)
  rescue => e
    warn "Failed to notify chat_id=#{chat_id}: #{e.class} - #{e.message}"
  end
end