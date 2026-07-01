require "sinatra"
require "sinatra/base"

require_relative "./app/controllers/api/auth_controller"
require_relative "./app/controllers/wishlists_controller"

use AuthController
use WishlistsController

set :bind, "0.0.0.0"
set :port, 4567
set :public_folder, File.join(__dir__, "public")

# 🔥 просто отключаем host protection правильно
set :host_authorization, permitted_hosts: ["iwishlist.ru", "www.iwishlist.ru"]