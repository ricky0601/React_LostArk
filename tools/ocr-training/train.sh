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
  local url=$1 destination=$2
  if [[ ! -f "$destination" ]]; then
    curl --fail --location --silent --show-error "$url" --output "$destination"
  fi
}

fetch "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/alternative/Pretendard-Regular.ttf" \
  "$WORK_DIR/fonts/Pretendard-Regular.ttf"
fetch "https://raw.githubusercontent.com/spoqa/spoqa-han-sans/master/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Regular.ttf" \
  "$WORK_DIR/fonts/SpoqaHanSansNeo-Regular.ttf"
fetch "https://github.com/tesseract-ocr/tessdata_best/raw/main/kor.traineddata" \
  "$WORK_DIR/tessdata_best/kor.traineddata"
fetch "https://raw.githubusercontent.com/tesseract-ocr/langdata_lstm/main/kor/kor.training_text" \
  "$WORK_DIR/kor.training_text"

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
