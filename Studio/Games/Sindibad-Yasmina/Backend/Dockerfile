# syntax=docker/dockerfile:1
FROM rust:1.99.1-slim-trixie AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
COPY migrations migrations
COPY src src
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release --locked && cp target/release/sindibad-backend /usr/local/bin/

FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 app
COPY --from=build /usr/local/bin/sindibad-backend /usr/local/bin/
USER app
ENV BIND=0.0.0.0:8080
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --retries=3 CMD ["sindibad-backend", "health"]
ENTRYPOINT ["sindibad-backend"]
