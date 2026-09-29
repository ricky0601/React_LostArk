# Vendored Tesseract.js runtime assets

These files keep browser OCR on the application's origin instead of the Tesseract.js CDN defaults.

| Asset | Source/version | SHA-256 |
| --- | --- | --- |
| `worker.min.js` | `tesseract.js` npm package `7.0.0` (`dist/worker.min.js`) | `576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d` |
| `../tesseract-core/tesseract-core-simd-lstm.wasm.js` | `tesseract.js-core` npm package `7.0.0` | `c58b46a4c796c0b8afccf77591d5b875b6896b45d402bbce8caa6f5362447b38` |
| `../tesseract-core/tesseract-core-simd-lstm.wasm` | `tesseract.js-core` npm package `7.0.0` | `34e8d50cac216427d86bf397d610fdd9f49492539bbcdfbfccc4eda20c810bea` |
| `../tessdata/eng.traineddata.gz` | `@tesseract.js-data/eng` `1.0.0`, `4.0.0_best_int` | `45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91` |
| `../tessdata/kor.traineddata.gz` | `@tesseract.js-data/kor` `1.0.0`, `4.0.0_best_int` | `78c21276ab14c9bb734d83be1055d9fe5469a4e7e977c51ad385be5737e61126` |

The custom `lostark_kor` model is documented in `../tessdata/LICENSES.md` and `tools/ocr-training/README.md`.
