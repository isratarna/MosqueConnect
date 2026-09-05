FROM php:8.4-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        libicu-dev \
        libonig-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        mbstring \
        pcntl \
        pdo_mysql \
        zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# OPcache/realpath tuning for the CLI SAPI that `artisan serve` runs under.
COPY docker/api/php.ini /usr/local/etc/php/conf.d/zz-mosqueconnect.ini

WORKDIR /var/www/html

COPY apps/api/composer.json apps/api/composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-scripts

COPY apps/api ./
COPY docker/api/entrypoint.sh /usr/local/bin/mosqueconnect-entrypoint

RUN composer install --no-interaction --prefer-dist

EXPOSE 8000

ENTRYPOINT ["sh", "/usr/local/bin/mosqueconnect-entrypoint"]
# --no-reload is required for PHP_CLI_SERVER_WORKERS to take effect, so the
# server handles requests concurrently instead of one at a time. It only gives
# up `artisan serve`'s automatic restart on .env changes; restart the
# container by hand after editing .env.
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000", "--no-reload"]
