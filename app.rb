require "sinatra"
require "dotenv/load"
require "active_record"

require_relative "./db/connection"

# модели (1 раз)
Dir["./app/models/*.rb"].each { |file| require file }

# контроллеры
require_relative "./app/controllers/api/auth_controller"
require_relative "./app/controllers/wishlists_controller"
require_relative "./app/controllers/gifts_controller"

class App < Sinatra::Base
    disable :protection

  set :bind, "0.0.0.0"
  set :port, 4567
  set :public_folder, File.join(__dir__, "public")

  use AuthController
  use WishlistsController
  use GiftsController

  get "/" do
    send_file File.join(settings.public_folder, "index.html")
  end
end