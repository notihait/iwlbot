require "net/http"
require "nokogiri"

class LinkPreviewService
  def self.fetch_image(url)
    return nil if url.to_s.strip.empty?

    uri = URI.parse(url)
    response = Net::HTTP.get_response(uri)
    return nil unless response.is_a?(Net::HTTPSuccess)

    doc = Nokogiri::HTML(response.body)
    doc.at('meta[property="og:image"]')&.[]("content") ||
      doc.at('meta[name="twitter:image"]')&.[]("content")
  rescue
    nil
  end
end