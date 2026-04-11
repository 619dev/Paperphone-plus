#!/usr/bin/env bash
# build-and-push.sh — Build multi-arch Docker images and push to Docker Hub
#
# Usage:
#   bash build-and-push.sh                        # push as 'latest'
#   TAG=v1.2.0 bash build-and-push.sh             # push as specific tag + also retag 'latest'
#   PUSH=0 bash build-and-push.sh                 # build only, no push (single-arch)
#
# Prerequisites:
#   docker login
#   docker buildx create --use --name multiarch-builder  # only needed once
#
# Environment:
#   Copy server/.env.example → server/.env and fill in secrets before deploying.

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────
REPO="${REPO:-facilisvelox}"          # Docker Hub username/org
TAG="${TAG:-latest}"
PUSH="${PUSH:-1}"                      # set to 0 to skip push
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"

SERVER_IMAGE="${REPO}/paperphone-plus-server"
CLIENT_IMAGE="${REPO}/paperphone-plus-client"

# ── Pre-flight checks ────────────────────────────────────────────────────
if [[ ! -f "./server/.env" && ! -f "./server/.env.example" ]]; then
  echo "⚠️  No server/.env or server/.env.example found."
  echo "   Create one before deploying: cp server/.env.example server/.env"
fi

# ── Helper ────────────────────────────────────────────────────────────────
build_and_push() {
  local name="$1" context="$2" tag="$3" also_latest="$4"

  local tags=(-t "${name}:${tag}")
  [[ "$also_latest" == "yes" && "$tag" != "latest" ]] && tags+=(-t "${name}:latest")

  echo ""
  echo "🔨  Building ${name}:${tag}  [${PLATFORMS}]"

  if [[ "$PUSH" == "1" ]]; then
    docker buildx build \
      --platform "$PLATFORMS" \
      "${tags[@]}" \
      --push \
      "$context"
  else
    # Local single-arch build (no push)
    docker build \
      "${tags[@]}" \
      "$context"
  fi
}

# ── Ensure buildx builder exists (only needed once, idempotent) ───────────
if [[ "$PUSH" == "1" ]]; then
  if ! docker buildx inspect multiarch-builder &>/dev/null; then
    echo "🔧  Creating buildx builder 'multiarch-builder'…"
    docker buildx create --name multiarch-builder --use
    docker buildx inspect --bootstrap
  else
    docker buildx use multiarch-builder
  fi
fi

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
