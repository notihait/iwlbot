require "active_record"

ActiveRecord::Base.establish_connection(
  adapter: "postgresql",
  database: ENV["PG_DB"],
  username: ENV["PG_USER"],
  password: ENV["PG_PASSWORD"],
  host: ENV["PG_HOST"] || "localhost"
)