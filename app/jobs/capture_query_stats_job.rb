class CaptureQueryStatsJob < ApplicationJob
  queue_as :default

  def perform
    PgHero.capture_query_stats
  end
end
