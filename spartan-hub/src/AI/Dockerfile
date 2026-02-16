# Use a lightweight Python base image
FROM python:3.10-slim-bullseye AS builder

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies including curl for health checks
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy all Python scripts
COPY *.py ./

# Generate ONNX model and scaler during build
RUN python generate_model.py

# Remove training scripts to keep only necessary files for inference
RUN rm generate_model.py train_risk_model.py

# Start final stage with minimal image
FROM python:3.10-slim-bullseye

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/main.py /app/
COPY --from=builder /app/benchmark_alert.py /app/
COPY --from=builder /app/chatMaestro.js /app/
COPY --from=builder /usr/local/lib/python3.10/site-packages/ /usr/local/lib/python3.10/site-packages/

# Create non-root user
RUN addgroup --system --gid 1001 python && \
    adduser --system --uid 1001 pythonuser && \
    chown -R pythonuser:python /app

USER pythonuser

# Expose the API port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]