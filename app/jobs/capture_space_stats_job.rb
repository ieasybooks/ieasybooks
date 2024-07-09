class CaptureSpaceStatsJob < ApplicationJob
  queue_as :default

  def perform
    PgHero.capture_space_stats
  end
end
