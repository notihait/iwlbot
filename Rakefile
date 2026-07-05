ENV["RACK_ENV"] ||= "production"

require "sinatra/activerecord/rake"
require "dotenv/load"
require_relative "./app"

task :environment do
  require "./app"
end