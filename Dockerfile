ARG PYTHON_IMAGE=python:3.12-alpine
FROM ${PYTHON_IMAGE}
# Cài đặt hệ thống tối thiểu (nếu bạn cần build wheel có C-ext sau này)
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     build-essential gcc libpq-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements trước
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy phần còn lại
COPY . .

EXPOSE 5000

# Production server cho Flask
# Cú pháp "app:app" = file app.py, biến app = Flask(...)
CMD ["python", "app.py"]