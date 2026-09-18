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

The script downloads the pinned upstream fonts, Korean corpus, and `kor.traineddata` into the ignored `.work/` directory. Every cached or newly downloaded file is checked against its recorded SHA-256 before use. It generates deterministic 2–12-character nickname lines at 13–16 px, applies thresholding and nearest-neighbor enlargement matching the browser preprocessing, then writes:

```text
public/tessdata/lostark_kor.traineddata.gz
```

## Pinned toolchain and inputs

- Ubuntu 20.04 amd64 image: `sha256:c664f8f86ed5a386b0a340d981b8f81714e21a8b9c73f658c4bea56aa179d54a`
- Pillow: `9.5.0` (the Dockerfile pins and hash-checks the CPython 3.8 manylinux wheel)
- tesstrain commit: `405346a3a67d8e4e049341d1da6a4b752e0b8351`
- Pretendard: npm package `pretendard@1.3.9`
- Spoqa Han Sans: commit `6473330babd9f8e486114f1d9a7e7166e2028c51`
- tessdata_best: commit `e12c65a915945e4c28e237a9b52bc4a8f39a0cec`
- langdata_lstm: commit `07930fd9f246622c26eb5de794d9212ceac432d3`

The exact input SHA-256 values are kept beside their URLs in `train.sh`. To reproduce from an empty cache, remove `tools/ocr-training/.work`, run the command above, and compare the generated model explicitly; Tesseract training itself may still vary across host CPU/Docker implementations.

The checked-in model was trained with 4,000 lines and 3,000 maximum iterations. Its best synthetic evaluation checkpoint had approximately 3.1% character error rate. This metric measures the synthetic holdout only and must not be presented as real-game accuracy.

Tesseract.js 7.0.0 must load this model with its SIMD LSTM core. The relaxed-SIMD core does not support the dot-product operator serialized by the Tesseract 4.1 training tools.

## Licenses

See `public/tessdata/LICENSES.md`. The downloaded font binaries and generated line images are training inputs only and are not committed.
