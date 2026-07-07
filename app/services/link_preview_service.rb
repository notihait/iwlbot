require "net/http"
require "nokogiri"
require "resolv"
require "ipaddr"

class LinkPreviewService
  PRIVATE_RANGES = [
    IPAddr.new("10.0.0.0/8"),
    IPAddr.new("172.16.0.0/12"),
    IPAddr.new("192.168.0.0/16"),
    IPAddr.new("127.0.0.0/8"),
    IPAddr.new("169.254.0.0/16"), # включая AWS/GCP metadata endpoint
    IPAddr.new("::1/128"),
    IPAddr.new("fc00::/7")
  ].freeze

  def self.fetch_image(url)
    return nil if url.to_s.strip.empty?

    uri = URI.parse(url)
    return nil unless %w[http https].include?(uri.scheme.to_s.downcase)
    return nil if blocked_host?(uri.host)

    response = Net::HTTP.get_response(uri)
    return nil unless response.is_a?(Net::HTTPSuccess)

    doc = Nokogiri::HTML(response.body)
    doc.at('meta[property="og:image"]')&.[]("content") ||
      doc.at('meta[name="twitter:image"]')&.[]("content")
  rescue
    nil
  end

  def self.blocked_host?(host)
    return true if host.to_s.strip.empty?
    return true if host.downcase == "localhost"

    ip = Resolv.getaddress(host)
    PRIVATE_RANGES.any? { |range| range.include?(IPAddr.new(ip)) }
  rescue Resolv::ResolvError, IPAddr::Error
    true # если не смогли резолвнуть или распарсить — на всякий случай блокируем
  end
end