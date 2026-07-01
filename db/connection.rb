require "pg"

class DB
  def self.conn
    @conn ||= PG.connect(
      dbname: ENV["PG_DB"],
      user: ENV["PG_USER"],
      password: ENV["PG_PASSWORD"],
      host: ENV["PG_HOST"] || "localhost"
    )
  end
end