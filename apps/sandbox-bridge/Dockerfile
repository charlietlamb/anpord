FROM docker.io/cloudflare/sandbox:0.12.7

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    procps \
    ripgrep \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /workspace \
    && useradd -m -s /bin/bash -d /home/sandbox sandbox \
    && chown sandbox:sandbox /workspace \
    && chmod 700 /root

USER sandbox
WORKDIR /workspace
