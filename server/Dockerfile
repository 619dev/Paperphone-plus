# ── Stage 1: Build ─────────────────────────────────────────────
# Always run builder on the BUILD host (x86-64).
# For ARM64 targets, use Rust cross-compilation instead of QEMU.
FROM --platform=$BUILDPLATFORM rust:slim-bookworm AS builder

ARG TARGETARCH

# Limit parallel jobs to avoid OOM during LTO linking
ENV CARGO_BUILD_JOBS=1

# Install native build deps + cross-compile toolchain for arm64
RUN apt-get update \
    && apt-get install -y pkg-config libssl-dev \
    && if [ "$TARGETARCH" = "arm64" ]; then \
         dpkg --add-architecture arm64 \
         && apt-get update \
         && apt-get install -y \
              gcc-aarch64-linux-gnu \
              libc6-dev-arm64-cross \
              libssl-dev:arm64 \
         && rustup target add aarch64-unknown-linux-gnu; \
       fi \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src

# Cross-compile for arm64, native build for amd64
RUN if [ "$TARGETARCH" = "arm64" ]; then \
      export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc \
      && export OPENSSL_INCLUDE_DIR=/usr/include/aarch64-linux-gnu \
      && export OPENSSL_LIB_DIR=/usr/lib/aarch64-linux-gnu \
      && cargo build --release --target aarch64-unknown-linux-gnu \
      && mkdir -p target/output \
      && cp target/aarch64-unknown-linux-gnu/release/paperphone-plus-server target/output/; \
    else \
      cargo build --release \
      && mkdir -p target/output \
      && cp target/release/paperphone-plus-server target/output/; \
    fi

# ── Stage 2: Runtime ───────────────────────────────────────────
# debian:bookworm-slim with only essential runtime libs.
# Binary is already stripped + LTO'd via [profile.release].
FROM debian:bookworm-slim AS runtime

# Install ONLY the minimal runtime libraries needed:
#   - ca-certificates : TLS root certs
#   - libssl3         : OpenSSL shared library
#   - libcurl4        : HTTP client library
#   - curl            : CLI for healthcheck (libcurl4 already present, adds ~200KB)
#   - gosu            : drop root after repairing persistent-volume ownership
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
         ca-certificates \
         libssl3 \
         libcurl4 \
         curl \
         gosu \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

WORKDIR /app
COPY --from=builder /app/target/output/paperphone-plus-server .
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/paperphone-entrypoint

# Docker initializes a new named volume from the ownership of its mount point.
# Run the service without root privileges while keeping the upload volume writable.
RUN mkdir -p /app/uploads \
    && chown -R 10001:10001 /app

ENV PORT=3000
ENV UPLOAD_DIR=./uploads
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=15s \
  CMD curl -sf http://localhost:3000/health || exit 1

ENTRYPOINT ["paperphone-entrypoint"]
CMD ["./paperphone-plus-server"]
