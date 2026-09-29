FROM ubuntu:20.04@sha256:c664f8f86ed5a386b0a340d981b8f81714e21a8b9c73f658c4bea56aa179d54a

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git make python3 python3-pip tesseract-ocr wget \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt /tmp/requirements.txt
RUN pip3 install --no-cache-dir --require-hashes --requirement /tmp/requirements.txt
ARG TESTRAIN_COMMIT=405346a3a67d8e4e049341d1da6a4b752e0b8351
RUN git init /opt/tesstrain \
    && git -C /opt/tesstrain remote add origin https://github.com/tesseract-ocr/tesstrain.git \
    && git -C /opt/tesstrain fetch --depth 1 origin "$TESTRAIN_COMMIT" \
    && git -C /opt/tesstrain checkout --detach FETCH_HEAD \
    && test "$(git -C /opt/tesstrain rev-parse HEAD)" = "$TESTRAIN_COMMIT"
WORKDIR /workspace
