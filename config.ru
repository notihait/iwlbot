require_relative "./app"
require "rack/protection"

use Rack::Protection, false

run App