ENV["RACK_ENV"] ||= "production"

require "sinatra/base"

ENV["SINATRA_ACTIVESUPPORT"] = "false"

require "sinatra"
require "dotenv/load"
require "active_record"

require_relative "./db/connection"

Dir["./app/models/*.rb"].each { |file| require file }

require_relative "./app/controllers/api/auth_controller"
require_relative "./app/controllers/wishlists_controller"
require_relative "./app/controllers/gifts_controller"

class App < Sinatra::Base

    disable :protection
    set :host_authorization, {
  permitted_hosts: []
}

  set :bind, "0.0.0.0"
  set :port, 4567
  set :public_folder, File.join(__dir__, "public")

  use AuthController
  use WishlistsController
  use GiftsController

  get "/" do
    cache_control :no_cache, :no_store, :must_revalidate
    headers["Pragma"] = "no-cache"
    headers["Expires"] = "0"
    send_file File.join(settings.public_folder, "index.html")
  end
  
  get "/wishlist/:id" do
    cache_control :no_cache, :no_store, :must_revalidate
    headers["Pragma"] = "no-cache"
    headers["Expires"] = "0"
    send_file File.join(settings.public_folder, "index.html")
  end

end