FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git make python3 python3-pip tesseract-ocr wget \
    && rm -rf /var/lib/apt/lists/*
RUN pip3 install --no-cache-dir pillow
RUN git clone --depth 1 https://github.com/tesseract-ocr/tesstrain.git /opt/tesstrain
WORKDIR /workspace
