# Lost Ark nickname OCR training

This directory reproducibly fine-tunes Tesseract's Korean LSTM model using synthetic nickname lines rendered with OFL-licensed Korean UI fonts.

## Requirements

- Docker Desktop using Linux containers
- Git Bash
- `curl`

## Train

```bash
tools/ocr-training/train.sh
```

Optional controls:

```bash
TRAINING_LINES=4000 MAX_ITERATIONS=3000 tools/ocr-training/train.sh
```

The script downloads the upstream fonts, Korean corpus, and `kor.traineddata` into the ignored `.work/` directory. It generates deterministic 2–12-character nickname lines at 13–16 px, applies thresholding and nearest-neighbor enlargement matching the browser preprocessing, then writes:

```text
public/tessdata/lostark_kor.traineddata.gz
```

The checked-in model was trained with 4,000 lines and 3,000 maximum iterations. Its best synthetic evaluation checkpoint had approximately 3.1% character error rate. This metric measures the synthetic holdout only and must not be presented as real-game accuracy.

Tesseract.js must load this model with its SIMD LSTM core. The relaxed-SIMD core does not support the dot-product operator serialized by the Tesseract 4.1 training tools.

## Licenses

See `public/tessdata/LICENSES.md`. The downloaded font binaries and generated line images are training inputs only and are not committed.
