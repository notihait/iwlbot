require "net/http"
require "uri"
require "json"

class NotifyFollowersService
  BOT_USERNAME = ENV["BOT_USERNAME"] || "IWIshList_bot"

  def self.call(wishlist, text, exclude_user_id: nil)
    bot_token = ENV["BOT_TOKEN"]
    return if bot_token.to_s.empty?

    keyboard = open_app_keyboard(wishlist)

    wishlist.followers.each do |follower|
      next if follower.telegram_id.nil?
      next if exclude_user_id && follower.id.to_s == exclude_user_id.to_s

      send_message(bot_token, follower.telegram_id, text, keyboard)
    end
  end

  def self.notify_owner(wishlist, text)
    bot_token = ENV["BOT_TOKEN"]
    return if bot_token.to_s.empty?

    owner = wishlist.user
    return if owner.nil? || owner.telegram_id.nil?

    keyboard = open_app_keyboard(wishlist)
    send_message(bot_token, owner.telegram_id, text, keyboard)
  end

  def self.wishlist_link_html(wishlist)
    url = wishlist_deep_link(wishlist)
    title = escape_html(wishlist.title)
    "<a href=\"#{url}\">#{title}</a>"
  end

  def self.wishlist_deep_link(wishlist)
    "https://t.me/#{BOT_USERNAME}?startapp=wishlist_#{wishlist.public_id}"
  end

  def self.open_app_keyboard(wishlist)
    {
      inline_keyboard: [
        [{ text: "🎁 Открыть в приложении", url: wishlist_deep_link(wishlist) }]
      ]
    }
  end

  def self.escape_html(str)
    str.to_s.gsub("&", "&amp;").gsub("<", "&lt;").gsub(">", "&gt;")
  end

  def self.send_message(bot_token, chat_id, text, keyboard = nil)
    uri = URI.parse("https://api.telegram.org/bot#{bot_token}/sendMessage")

    params = {
      "chat_id" => chat_id,
      "text" => text,
      "parse_mode" => "HTML"
    }
    params["reply_markup"] = keyboard.to_json if keyboard

    Net::HTTP.post_form(uri, params)
  rescue => e
    warn "Failed to notify chat_id=#{chat_id}: #{e.class} - #{e.message}"
  end
end