# Multi-stage build для минимального размера
FROM python:3.11-slim as base

# Установка зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    cmake \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория
WORKDIR /app

# Копирование зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода
COPY src/ ./src/
COPY config/ ./config/

# Создание директорий
RUN mkdir -p /app/data /app/logs

# Экспорт порта
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/v1/swarm/status || exit 1

# Запуск
CMD ["python", "src/task_queue.py"]

# Development stage
FROM base as dev
RUN pip install flask[async] pytest pytest-cov
CMD ["python", "src/task_queue.py", "--debug"]