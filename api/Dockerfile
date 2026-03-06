# Dockerfile optimizado para Render
FROM python:3.10-slim

# Evita que apt pregunte cosas
ENV DEBIAN_FRONTEND=noninteractive
# No crear archivos .pyc
ENV PYTHONDONTWRITEBYTECODE 1
# No usar buffer para los logs de Python
ENV PYTHONUNBUFFERED 1

# Instalación de dependencias del sistema (Tesseract, Poppler para PDF y librerías gráficas)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-spa \
    poppler-utils \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Primero las dependencias (mejor para el cache de Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del código
COPY . .

# Comando para arrancar la app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
