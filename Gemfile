source 'https://rubygems.org'

ruby '3.2.2'

# Manually added dependencies:

group :production do
  # This gem configures Rails for CloudFlare so that request.ip and request.remote_ip work correctly.
  gem 'cloudflare-rails', '~> 5.0', '>= 5.0.1'
end

# Rails template dependencies:

# Bundle edge Rails instead: gem "rails", github: "rails/rails", branch: "main"
gem 'rails', '~> 7.1.2'

# The modern asset pipeline for Rails [https://github.com/rails/propshaft]
gem 'propshaft'

# Use postgresql as the database for Active Record
gem 'pg', '~> 1.1'

# Use the Puma web server [https://github.com/puma/puma]
gem 'puma', '>= 5.0'

# Bundle and transpile JavaScript [https://github.com/rails/jsbundling-rails]
gem 'jsbundling-rails'

# Hotwire's SPA-like page accelerator [https://turbo.hotwired.dev]
gem 'turbo-rails'

# Hotwire's modest JavaScript framework [https://stimulus.hotwired.dev]
gem 'stimulus-rails'

# Bundle and process CSS [https://github.com/rails/cssbundling-rails]
gem 'cssbundling-rails'

# Build JSON APIs with ease [https://github.com/rails/jbuilder]
gem 'jbuilder'

# Use Redis adapter to run Action Cable in production
gem 'redis', '>= 4.0.1'

# Use Kredis to get higher-level data types in Redis [https://github.com/rails/kredis]
# gem "kredis"

# Use Active Model has_secure_password [https://guides.rubyonrails.org/active_model_basics.html#securepassword]
# gem "bcrypt", "~> 3.1.7"

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem 'tzinfo-data', platforms: %i[windows jruby]

# Reduces boot times through caching; required in config/boot.rb
gem 'bootsnap', require: false

# Use Active Storage variants [https://guides.rubyonrails.org/active_storage_overview.html#transforming-images]
# gem "image_processing", "~> 1.2"

group :development, :test do
  # Manually added dependencies:

  # Autoload dotenv in Rails.
  gem 'dotenv-rails', '~> 2.8', '>= 2.8.1'

  # Rails template dependencies:

  # See https://guides.rubyonrails.org/debugging_rails_applications.html#debugging-with-the-debug-gem
  gem 'debug', platforms: %i[mri windows]
end

group :development do
  # Manually added dependencies:

  # Annotates Rails/ActiveRecord Models, routes, fixtures, and others based on the database schema.
  gem 'annotate', '~> 3.2'

  # Provides a better error page for Rails and other Rack apps.
  # Includes source code inspection, a live REPL and local/instance variable inspection for all stack frames.
  gem 'better_errors', '~> 2.10', '>= 2.10.1'

  # Provides the Binding#of_caller method.
  # Using binding_of_caller we can grab bindings from higher up the call stack and evaluate code in that context.
  # Allows access to bindings arbitrarily far up the call stack, not limited to just the immediate caller.
  # Recommended for use only in debugging situations.
  # Do not use this in production apps.
  gem 'binding_of_caller', '~> 1.0'

  # Brakeman detects security vulnerabilities in Ruby on Rails applications via static analysis.
  gem 'brakeman', '~> 6.1.1'

  # Help to kill N+1 queries and unused eager loading.
  gem 'bullet', '~> 7.1', '>= 7.1.4'

  # bundler-audit provides patch-level verification for Bundled apps.
  gem 'bundler-audit', '~> 0.9.1'

  # Format ERB files with speed and precision.
  gem 'erb-formatter', '~> 0.6.0'

  # i18n-tasks helps you find and manage missing and unused translations.
  # It analyses code statically for key usages, such as `I18n.t('some.key')`,
  # in order to report keys that are missing or unused, pre-fill missing keys
  # (optionally from Google Translate), and remove unused keys.
  gem 'i18n-tasks', '~> 1.0', '>= 1.0.13'

  # Deploy web apps in containers to servers running Docker with zero downtime.
  gem 'kamal', '~> 1.3'

  # RuboCop is a Ruby code style checking and code formatting tool.
  # It aims to enforce the community-driven Ruby Style Guide.
  gem 'rubocop', '~> 1.59'

  # A collection of RuboCop cops to check for performance optimizations in Ruby code.
  gem 'rubocop-performance', '~> 1.20.1'

  # Automatic Rails code style checking tool.
  # A RuboCop extension focused on enforcing Rails best practices and coding conventions.
  gem 'rubocop-rails', '~> 2.23.1'

  # A RuboCop plugin for Rake.
  gem 'rubocop-rake', '~> 0.6.0'

  # Code style checking for RSpec files. A plugin for the RuboCop code style enforcing & linting tool.
  gem 'rubocop-rspec', '~> 2.27'

  # RubyAudit checks your current version of Ruby and RubyGems against known security vulnerabilities (CVEs),
  # alerting you if you are using an insecure version.
  # It complements bundler-audit, providing complete coverage for your Ruby stack.
  gem 'ruby_audit', '~> 2.2'

  # Rails template dependencies:

  # Use console on exceptions pages [https://github.com/rails/web-console]
  gem 'web-console'

  # Add speed badges [https://github.com/MiniProfiler/rack-mini-profiler]
  # gem "rack-mini-profiler"

  # Speed up commands on slow machines / big apps [https://github.com/rails/spring]
  # gem "spring"
end

group :test do
  # Use system testing [https://guides.rubyonrails.org/testing.html#system-testing]
  gem 'capybara'
  gem 'selenium-webdriver'
end
