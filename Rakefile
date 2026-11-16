ENV["RACK_ENV"] ||= "production"

require "sinatra/activerecord/rake"
require "dotenv/load"
require_relative "./app"

unless defined?(Rails)
  module Rails
    def self.env
      ActiveSupport::StringInquirer.new(ENV["RACK_ENV"] || "production")
    end
  end
end

task :environment do
  require "./app"
end