# OCR language model licenses

`eng.traineddata.gz` and `kor.traineddata.gz` come from `@tesseract.js-data/eng@1.0.0` and `@tesseract.js-data/kor@1.0.0` (`4.0.0_best_int`) and are distributed under Apache License 2.0.

`lostark_kor.traineddata.gz` is fine-tuned from Tesseract's Korean model and is distributed under Apache License 2.0.

Synthetic training images were rendered from these SIL Open Font License 1.1 fonts. Font binaries and generated training images are not included in the application bundle.

- Pretendard 1.3.9: https://github.com/orioncactus/pretendard (SIL OFL 1.1)
- Spoqa Han Sans Neo: https://github.com/spoqa/spoqa-han-sans (SIL OFL 1.1)
- Tesseract Korean model: https://github.com/tesseract-ocr/tessdata_best (Apache License 2.0)

Training tooling is documented in `tools/ocr-training/README.md`.
