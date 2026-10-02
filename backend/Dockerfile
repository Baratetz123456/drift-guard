FROM python:3.12-slim

WORKDIR /app

# Prevent Python from buffering stdout/stderr
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements/ /app/requirements/
RUN pip install --no-cache-dir -r /app/requirements/collector.txt

# Copy application source code
COPY . /app/

# Environment defaults for local DynamoDB
ENV DYNAMODB_ENDPOINT_URL=http://dynamodb-local:8000
ENV TABLE_NAME=DeltaNet-local
ENV KMS_KEY_ID=local
ENV ENVIRONMENT=local
ENV AWS_DEFAULT_REGION=us-east-1
ENV AWS_ACCESS_KEY_ID=mock
ENV AWS_SECRET_ACCESS_KEY=mock

EXPOSE 3000

CMD ["uvicorn", "local_collector:app", "--host", "0.0.0.0", "--port", "3000", "--reload"]
