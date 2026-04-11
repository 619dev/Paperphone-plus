# ── Stage 1: Build ─────────────────────────────────────────────
# Always run builder on the BUILD host (x86-64).
# For ARM64 targets, use Rust cross-compilation instead of QEMU.
FROM --platform=$BUILDPLATFORM rust:slim-bookworm AS builder

ARG TARGETARCH

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
      && cp target/aarch64-unknown-linux-gnu/release/paperphone-server target/output/; \
    else \
      cargo build --release \
      && mkdir -p target/output \
      && cp target/release/paperphone-server target/output/; \
    fi

# ── Stage 2: Runtime ───────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/output/paperphone-server .

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=15s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["./paperphone-server"]
