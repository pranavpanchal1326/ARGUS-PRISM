FROM python:3.11-slim
WORKDIR /workspace
RUN apt-get update && apt-get install -y curl gcc && rm -rf /var/lib/apt/lists/*
COPY services/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/ ./services/
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY data/ ./data/
ENV PYTHONPATH=/workspace
EXPOSE 8080
CMD ["uvicorn", "services.api.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
