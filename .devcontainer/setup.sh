mkdir -p .ruby-lsp
cp .ruby-version .ruby-lsp/.ruby-version

test -f .env || cp .env.example .env

gem update --system
bundle
yarn

sudo sed -i 's/rake routes/rails routes/g' /usr/local/rvm/gems/ruby-3.2.2/gems/annotate-3.2.0/lib/annotate/annotate_routes/header_generator.rb

rails db:create db:migrate db:seed
