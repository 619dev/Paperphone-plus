#!/usr/bin/env bash
# build-and-push.sh — Build multi-arch Docker images and push to Docker Hub
#
# Optimized for low-memory VPS (4GB):
#   - Builds each platform SEQUENTIALLY (not in parallel) to halve peak RAM
#   - Dockerfile uses CARGO_BUILD_JOBS=2 to limit rustc parallelism
#   - Optionally creates swap before building (SWAP=4G)
#
# Usage:
#   bash build-and-push.sh                        # push as 'latest'
#   TAG=v1.2.0 bash build-and-push.sh             # push as specific tag + also retag 'latest'
#   PUSH=0 bash build-and-push.sh                 # build only, no push (single-arch)
#   SWAP=4G bash build-and-push.sh                # create 4G swap before building
#
# Prerequisites:
#   docker login
#   docker buildx create --use --name multiarch-builder  # only needed once

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────
REPO="${REPO:-facilisvelox}"
TAG="${TAG:-latest}"
PUSH="${PUSH:-1}"
SWAP="${SWAP:-}"                       # e.g. SWAP=4G to create swap before build

SERVER_IMAGE="${REPO}/paperphone-plus-server"
CLIENT_IMAGE="${REPO}/paperphone-plus-client"

# ── Swap setup (optional, for low-memory VPS) ─────────────────────────────
if [[ -n "$SWAP" && ! -f /swapfile ]]; then
  echo "💾  Creating ${SWAP} swap file…"
  fallocate -l "$SWAP" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "   Swap enabled: $(swapon --show)"
fi

# ── Pre-flight checks ────────────────────────────────────────────────────
if [[ ! -f "./server/.env" && ! -f "./server/.env.example" ]]; then
  echo "⚠️  No server/.env or server/.env.example found."
  echo "   Create one before deploying: cp server/.env.example server/.env"
fi

# ── Ensure buildx builder exists ──────────────────────────────────────────
if [[ "$PUSH" == "1" ]]; then
  if ! docker buildx inspect multiarch-builder &>/dev/null; then
    echo "🔧  Creating buildx builder 'multiarch-builder'…"
    docker buildx create --name multiarch-builder --use
    docker buildx inspect --bootstrap
  else
    docker buildx use multiarch-builder
  fi
fi

# ── Helper: build one image for all platforms SEQUENTIALLY ────────────────
build_and_push() {
  local name="$1" context="$2" tag="$3" also_latest="$4"

  local tags=(-t "${name}:${tag}")
  [[ "$also_latest" == "yes" && "$tag" != "latest" ]] && tags+=(-t "${name}:latest")

  if [[ "$PUSH" == "1" ]]; then
    echo ""
    echo "🔨  Building ${name}:${tag} — amd64 first, then arm64 (sequential)"

    # Build each platform one at a time to avoid OOM
    # Step 1: amd64
    echo "   ▶ linux/amd64"
    docker buildx build \
      --platform linux/amd64 \
      -t "${name}:${tag}-amd64" \
      --push \
      "$context"

    # Step 2: arm64
    echo "   ▶ linux/arm64"
    docker buildx build \
      --platform linux/arm64 \
      -t "${name}:${tag}-arm64" \
      --push \
      "$context"

    # Step 3: Create multi-arch manifest
    echo "   ▶ Creating multi-arch manifest"
    docker buildx imagetools create \
      -t "${name}:${tag}" \
      "${name}:${tag}-amd64" \
      "${name}:${tag}-arm64"

    if [[ "$also_latest" == "yes" ]]; then
      docker buildx imagetools create \
        -t "${name}:latest" \
        "${name}:${tag}-amd64" \
        "${name}:${tag}-arm64"
    fi
  else
    # Local single-arch build (no push)
    echo ""
    echo "🔨  Building ${name}:${tag}  [local]"
    docker build \
      "${tags[@]}" \
      "$context"
  fi
}

# Retag latest only when TAG is not already 'latest'
ALSO_LATEST="no"
[[ "$TAG" != "latest" ]] && ALSO_LATEST="yes"

build_and_push "$SERVER_IMAGE" "./server" "$TAG" "$ALSO_LATEST"
build_and_push "$CLIENT_IMAGE" "./client" "$TAG" "$ALSO_LATEST"

echo ""
echo "✅  Done!"
echo ""
echo "   Server : ${SERVER_IMAGE}:${TAG}"
echo "   Client : ${CLIENT_IMAGE}:${TAG}"
[[ "$ALSO_LATEST" == "yes" ]] && echo "   (both also tagged as :latest)"
echo ""
echo "Deploy with:"
echo "   cp server/.env.example server/.env  # fill in secrets"
echo "   TAG=${TAG} docker compose pull && docker compose up -d"
