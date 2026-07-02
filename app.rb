require "sinatra"
require "sinatra/base"
require "dotenv/load"
require "active_record"

require_relative "./db/connection"
require_relative "./app/controllers/api/auth_controller"
require_relative "./app/controllers/wishlists_controller"
require_relative "./app/controllers/gifts_controller"

set :host_authorization, {}

use AuthController
use WishlistsController
use GiftsController

set :bind, "0.0.0.0"
set :port, 4567
set :public_folder, File.join(__dir__, "public")