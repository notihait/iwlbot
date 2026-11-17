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

# db/connection.rb подключается к базе вручную, без database.yml, поэтому rake
# не видел ни одной базы и молча ничего не делал. Передаём ему то же подключение,
# которым пользуется приложение (параметры берутся из .env через db/connection.rb).
db_config = ActiveRecord::Base.connection_db_config.configuration_hash
ActiveRecord::Base.configurations = { ENV["RACK_ENV"] => db_config }

ActiveRecord::Tasks::DatabaseTasks.env = ENV["RACK_ENV"]
ActiveRecord::Tasks::DatabaseTasks.db_dir = File.expand_path("db", __dir__)
ActiveRecord::Tasks::DatabaseTasks.migrations_paths = [File.expand_path("db/migrate", __dir__)]

task :environment do
  require "./app"
end