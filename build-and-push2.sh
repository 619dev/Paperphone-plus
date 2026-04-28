#!/usr/bin/env bash
# build-and-push.sh — Build multi-arch Docker images using Depot.dev
set -euo pipefail

REPO="${REPO:-facilisvelox}"
TAG="${TAG:-latest}"
PUSH="${PUSH:-1}"

SERVER_IMAGE="${REPO}/paperphone-plus-server"
CLIENT_IMAGE="${REPO}/paperphone-plus-client"

# 如果本地没有 depot 命令，则提示使用 CI
if ! command -v depot &> /dev/null; then
  echo "❌ 'depot' command not found."
  echo "   Please run this in GitHub Actions with depot/setup-action, or install Depot CLI locally."
  exit 1
fi

ALSO_LATEST="no"
[[ "$TAG" != "latest" ]] && ALSO_LATEST="yes"

build_and_push() {
  local name="$1"
  local context="$2"
  local tag="$3"
  local also_latest="$4"

  local tags=("-t" "${name}:${tag}")
  [[ "$also_latest" == "yes" && "$tag" != "latest" ]] && tags+=("-t" "${name}:latest")

  if [[ "$PUSH" == "1" ]]; then
    echo "🔨 Building ${name}:${tag} (multi-arch: linux/amd64 + linux/arm64) with Depot..."

    depot build \
      --project "${DEPOT_PROJECT_ID}" \
      --platform linux/amd64,linux/arm64 \
      "${tags[@]}" \
      --push \
      "$context"

    echo "✅ ${name}:${tag} pushed (multi-arch)"
  else
    echo "🔨 Building ${name}:${tag} locally (single-arch)..."
    depot build \
      --project "${DEPOT_PROJECT_ID}" \
      "${tags[@]}" \
      "$context"
  fi
}

build_and_push "$SERVER_IMAGE" "./server" "$TAG" "$ALSO_LATEST"
build_and_push "$CLIENT_IMAGE" "./client" "$TAG" "$ALSO_LATEST"

echo ""
echo "✅ Done!"
echo "Server : ${SERVER_IMAGE}:${TAG}"
echo "Client : ${CLIENT_IMAGE}:${TAG}"
[[ "$ALSO_LATEST" == "yes" ]] && echo "       (also tagged as :latest)"