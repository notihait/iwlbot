require_relative "./app"
require "rack/protection"

use Rack::Protection::HostAuthorization, permitted_hosts: ["iwishlist.ru", "www.iwishlist.ru", "127.0.0.1", "localhost"]

run App