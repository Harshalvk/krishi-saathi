# models/crop_rec/Dockerfile  (xgboost model)
FROM harshalvk/base-xgboost:v1

WORKDIR /app

COPY app.py .

COPY artifacts/ artifacts/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
  
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]