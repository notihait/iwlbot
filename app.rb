require "sinatra"

set :bind, "0.0.0.0"
set :port, 4567
set :public_folder, File.join(__dir__, "public")

before do
  content_type :html
end
