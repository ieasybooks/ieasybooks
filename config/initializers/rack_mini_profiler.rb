Rack::MiniProfiler.config.enable_advanced_debugging_tools = true
Rack::MiniProfiler.config.storage_options = { url: ENV.fetch('REDIS_URL', 'redis://redis:6379') }
Rack::MiniProfiler.config.storage = Rack::MiniProfiler::RedisStore
Rack::MiniProfiler.config.enable_hotwire_turbo_drive_support = true
Rack::MiniProfiler.config.position = 'top-left'
