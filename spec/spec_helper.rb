ENV["RACK_ENV"] = "test"

require_relative "../app"
require "rack/test"
require "rspec"
require "database_cleaner/active_record"

DatabaseCleaner.strategy = :transaction

RSpec.configure do |config|
  config.include Rack::Test::Methods

  config.before(:suite) do
    DatabaseCleaner.clean_with(:truncation)
  end

  config.before(:each) do
    DatabaseCleaner.start
  end

  config.after(:each) do
    DatabaseCleaner.clean
  end
end

def app
  App
end

def json_headers
  { "CONTENT_TYPE" => "application/json" }
end

def json_body
  JSON.parse(last_response.body)
end