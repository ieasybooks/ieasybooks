class CleanSpaceStatsJob < ApplicationJob
  queue_as :default

  def perform
    PgHero.clean_space_stats
  end
end
