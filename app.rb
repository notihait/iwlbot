require "sinatra"
require "sinatra/base"
set :host_authorization, false

require_relative "./app/controllers/api/auth_controller"
require_relative "./app/controllers/wishlists_controller"

use AuthController
use WishlistsController

set :bind, "0.0.0.0"
set :port, 4567
set :public_folder, File.join(__dir__, "public")

set :protection, except: :host_authorization