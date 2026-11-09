# Feral keeper + local Qwen2.5 1.5B for Hugging Face Docker Spaces (free CPU).
# Build context is this folder after assemble.sh copies the keeper in.
FROM python:3.11-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/app/.cache/huggingface \
    TRANSFORMERS_CACHE=/app/.cache/huggingface/transformers \
    HOST=0.0.0.0 \
    PORT=7860 \
    FERAL_LOCAL_MODEL=1 \
    FERAL_MODEL_URL=http://127.0.0.1:11436 \
    FERAL_ALLOW_ORIGIN=https://davisbrains.github.io \
    FERAL_TRUST_PROXY=1 \
    FERAL_TRANSLATION_DEMAND=1 \
    FERAL_DATA=/tmp/feral-data \
    FERAL_STATIC=/app/static \
    FERAL_MODEL_LOCAL_ONLY=1 \
    FERAL_THREADS=4

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Bake the pinned Qwen weights into the image so cold starts skip the download.
COPY model-lock.json /app/model-lock.json
RUN python -c "import json; from transformers import AutoTokenizer, AutoModelForCausalLM; meta=json.load(open('/app/model-lock.json')); m,rev=meta['model'],meta['revision']; print('downloading',m,rev); AutoTokenizer.from_pretrained(m, revision=rev, trust_remote_code=False); AutoModelForCausalLM.from_pretrained(m, revision=rev, trust_remote_code=False, use_safetensors=True); print('model cached')"

COPY arena_model.py /app/arena_model.py
COPY start.sh /app/start.sh
COPY keeper/ /app/keeper/
RUN mkdir -p /app/static /tmp/feral-data \
 && cd /app/keeper && npm ci --omit=dev \
 && chmod +x /app/start.sh \
 && useradd -m -u 1000 feral \
 && chown -R feral:feral /app /tmp/feral-data

USER feral
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=5 \
  CMD curl -sf http://127.0.0.1:7860/healthz || exit 1
CMD ["/app/start.sh"]
