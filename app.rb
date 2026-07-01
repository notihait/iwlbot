require "sinatra"

set :bind, "0.0.0.0"
set :port, 4567

before do
  content_type :text
end

get "/" do
  "IWLBOT OK"
end