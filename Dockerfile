FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV POETRY_VIRTUALENVS_CREATE=false 

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# 🎯 FIX: Tell Docker to grab the files from inside the backend directory
COPY backend/pyproject.toml backend/poetry.lock* ./

RUN poetry install --no-interaction --no-ansi --no-root --only main

# 🎯 FIX: Copy the contents of the backend folder directly into the container's /app root
COPY backend/ .

EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]