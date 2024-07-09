mkdir -p .ruby-lsp
cp .ruby-version .ruby-lsp/.ruby-version

test -f .env || cp .env.example .env

gem update --system
bundle
yarn

gem install kamal -v 1.7.3

rails db:create db:migrate db:seed
