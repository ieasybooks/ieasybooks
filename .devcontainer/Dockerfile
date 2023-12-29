FROM mcr.microsoft.com/vscode/devcontainers/base:ubuntu-22.04

# Default value to allow debug server to serve content over GitHub Codespace's port forwarding service.
# The value is a comma-separated list of allowed domains.
ENV RAILS_DEVELOPMENT_HOSTS=".githubpreview.dev,.preview.app.github.dev,.app.github.dev,.ngrok-free.app"

# Memcached servers list.
ENV MEMCACHE_SERVERS=memcached:11211

RUN apt-get update \
    # Install additional OS packages and PostgreSQL client.
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends postgresql-client software-properties-common git-lfs \
    && git lfs install \
    # Setup Firefox for system testing.
    && add-apt-repository -y ppa:mozillateam/ppa \
    && echo 'Package: *\nPin: release o=LP-PPA-mozillateam\nPin-Priority: 1001\n' | sudo tee /etc/apt/preferences.d/mozilla-firefox \
    && apt-get update \
    && apt-get -y install firefox \
    # Clean up.
    && apt-get clean && rm -rf /var/lib/apt/lists/*
