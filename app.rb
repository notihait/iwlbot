require "sinatra"
require "json"

set :bind, "0.0.0.0"
set :port, 4567

post "/debug" do
  data = JSON.parse(request.body.read)

  puts "GOT DATA:"
  p data

  content_type :json
  {
    received: data,
    user_id: data.dig("user", "id")
  }.to_json
end