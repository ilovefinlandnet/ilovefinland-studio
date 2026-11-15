FROM python:3.11-slim

# Install system dependencies (ffmpeg for video and audio processing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definition and install
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY . /app/

# Set production environment defaults
ENV PORT=8787
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

EXPOSE 8787

CMD ["python3", "app.py"]
