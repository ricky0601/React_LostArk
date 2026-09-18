#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
TOOL_DIR="$ROOT/tools/ocr-training"
WORK_DIR="$TOOL_DIR/.work"
OUTPUT="$ROOT/public/tessdata"
IMAGE=lostark-ocr-trainer
CONTAINER="lostark-ocr-training-$$"

mkdir -p "$WORK_DIR/fonts" "$WORK_DIR/tessdata_best" "$OUTPUT"

fetch() {
  local url=$1 destination=$2 expected_sha256=$3
  local temporary="${destination}.tmp"
  if [[ -f "$destination" ]] && printf '%s  %s\n' "$expected_sha256" "$destination" | sha256sum --check --status; then
    return
  fi
  rm -f "$destination" "$temporary"
  curl --fail --location --silent --show-error "$url" --output "$temporary"
  printf '%s  %s\n' "$expected_sha256" "$temporary" | sha256sum --check --status
  mv "$temporary" "$destination"
}

fetch "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/alternative/Pretendard-Regular.ttf" \
  "$WORK_DIR/fonts/Pretendard-Regular.ttf" \
  "6d0af5258997aec7354a6e340fc2325ba321c410ca48b3af858c8c3d6e92a324"
fetch "https://raw.githubusercontent.com/spoqa/spoqa-han-sans/6473330babd9f8e486114f1d9a7e7166e2028c51/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Regular.ttf" \
  "$WORK_DIR/fonts/SpoqaHanSansNeo-Regular.ttf" \
  "f319143b52af38d9793de783875140f4c23f7cecb2bb1121f5319bb742028af9"
fetch "https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/e12c65a915945e4c28e237a9b52bc4a8f39a0cec/kor.traineddata" \
  "$WORK_DIR/tessdata_best/kor.traineddata" \
  "f888d4038348a0c3d25151e7f452bda0d74ca275b18cab146798bcbb94084fff"
fetch "https://raw.githubusercontent.com/tesseract-ocr/langdata_lstm/07930fd9f246622c26eb5de794d9212ceac432d3/kor/kor.training_text" \
  "$WORK_DIR/kor.training_text" \
  "71cdd26363ced56cb98c24c1a8fbd0bf730d12d91927329ad1e347f194dd8719"

docker build --quiet --tag "$IMAGE" "$TOOL_DIR" >/dev/null
docker create --name "$CONTAINER" "$IMAGE" sleep infinity >/dev/null
cleanup() { docker rm --force "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker cp "$TOOL_DIR/generate_ground_truth.py" "$CONTAINER:/workspace/generate_ground_truth.py"
docker cp "$WORK_DIR/fonts/." "$CONTAINER:/workspace/fonts"
docker cp "$WORK_DIR/tessdata_best/." "$CONTAINER:/workspace/tessdata_best"
docker cp "$WORK_DIR/kor.training_text" "$CONTAINER:/workspace/kor.training_text"
docker start "$CONTAINER" >/dev/null

docker exec "$CONTAINER" sh -c "
  python3 /workspace/generate_ground_truth.py \
    --output /workspace/lostark_kor-ground-truth \
    --characters /workspace/kor.training_text \
    --fonts /workspace/fonts/Pretendard-Regular.ttf /workspace/fonts/SpoqaHanSansNeo-Regular.ttf \
    --lines '${TRAINING_LINES:-4000}'
  cd /opt/tesstrain
  make training \
    MODEL_NAME=lostark_kor \
    START_MODEL=kor \
    TESSDATA=/workspace/tessdata_best \
    GROUND_TRUTH_DIR=/workspace/lostark_kor-ground-truth \
    DATA_DIR=/workspace/data \
    MAX_ITERATIONS='${MAX_ITERATIONS:-3000}' \
    TARGET_ERROR_RATE=0.5
  make traineddata \
    MODEL_NAME=lostark_kor \
    START_MODEL=kor \
    TESSDATA=/workspace/tessdata_best \
    GROUND_TRUTH_DIR=/workspace/lostark_kor-ground-truth \
    DATA_DIR=/workspace/data
  find /workspace/data/lostark_kor/tessdata_fast -name '*.traineddata' | sort -V | head -1 \
    > /workspace/best-model.txt
"

# Some Windows Docker configurations return from exec before detached backend work is visible.
while docker top "$CONTAINER" | grep -Eq 'generate_ground_truth|make (training|traineddata)|lstmtraining'; do sleep 5; done
docker cp "$CONTAINER:/workspace/best-model.txt" "$WORK_DIR/best-model.txt"
MODEL_PATH=$(tr -d '\r\n' < "$WORK_DIR/best-model.txt")
docker cp "$CONTAINER:$MODEL_PATH" "$OUTPUT/lostark_kor.traineddata"
gzip --force --keep "$OUTPUT/lostark_kor.traineddata"
rm "$OUTPUT/lostark_kor.traineddata"
printf 'Created %s\n' "$OUTPUT/lostark_kor.traineddata.gz"
