class CleanQueryStatsJob < ApplicationJob
  queue_as :default

  def perform
    PgHero.clean_query_stats
  end
end
