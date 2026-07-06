ENV["RACK_ENV"] ||= "production"

require "dotenv/load"
require "net/http"
require "json"
require_relative "../db/connection"
require_relative "../app/models/user"
require_relative "../app/models/wishlist"
require_relative "../app/models/gift"

BOT_TOKEN = ENV.fetch("BOT_TOKEN")
TELEGRAM_API = "https://api.telegram.org/bot#{BOT_TOKEN}/sendMessage"

def send_telegram_message(chat_id, text)
  uri = URI.parse(TELEGRAM_API)
  res = Net::HTTP.post_form(uri, "chat_id" => chat_id, "text" => text)
  body = JSON.parse(res.body) rescue {}

  unless body["ok"]
    puts "  WARN: не удалось отправить сообщение chat_id=#{chat_id}: #{body["description"]}"
    return false
  end

  true
rescue => e
  puts "  ERROR: исключение при отправке chat_id=#{chat_id}: #{e.class} - #{e.message}"
  false
end

def reminder_text(gift, wishlist, days_left)
  date_str = wishlist.event_date.strftime("%d.%m.%Y")

  <<~TEXT
    🔔 Напоминание о подарке!

    Через #{days_left} #{days_left == 3 ? "дня" : "дней"} (#{date_str}) — «#{wishlist.title}».

    Вы забронировали: 🎁 #{gift.name}

    Не забудьте подготовить подарок вовремя!
  TEXT
end

today = Date.today
sent_7d = 0
sent_3d = 0
skipped_no_telegram = 0

candidates = Gift.active
                  .where.not(reserved_by_id: nil)
                  .joins(:wishlist)
                  .where(wishlists: { deleted_at: nil })
                  .where.not(wishlists: { event_date: nil })

candidates.each do |gift|
  wishlist = gift.wishlist
  days_left = (wishlist.event_date - today).to_i

  next unless [7, 3].include?(days_left)

  reminder_field = days_left == 7 ? :reminder_7d_sent_at : :reminder_3d_sent_at
  next if gift.send(reminder_field).present?

  user = User.find_by(id: gift.reserved_by_id)
  if user.nil? || user.telegram_id.nil?
    skipped_no_telegram += 1
    next
  end

  text = reminder_text(gift, wishlist, days_left)

  if send_telegram_message(user.telegram_id, text)
    gift.update_column(reminder_field, Time.now)
    days_left == 7 ? sent_7d += 1 : sent_3d += 1
  end
end

puts "Напоминания за 7 дней отправлено: #{sent_7d}"
puts "Напоминания за 3 дня отправлено: #{sent_3d}"
puts "Пропущено (нет telegram_id): #{skipped_no_telegram}"