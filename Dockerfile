# 1. Base image
FROM python:3.10-slim

# 2. Python environment controls
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Force Poetry to install packages globally inside the container
ENV POETRY_VIRTUALENVS_CREATE=false 

# 3. Work directory
WORKDIR /app

# 4. System dependencies for compiling database drivers (psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 5. Install Poetry inside the container
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# 6. Copy ONLY the configuration files first to optimize Docker caching
COPY pyproject.toml poetry.lock* ./

# 7. Install production dependencies (skips dev tools like pytest to keep it light)
RUN poetry install --no-interaction --no-ansi --no-root --only main

# 8. Copy the rest of your app code
COPY . .

# 9. Expose Cloud Run port
EXPOSE 8080

# 10. Start the server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]