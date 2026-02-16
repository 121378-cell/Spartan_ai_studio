# ML Configuration
ML_ENABLED=true
ML_INJURY_MODEL=models/injury_prediction.onnx
ML_RECOMMENDER_MODEL=models/training_recommender.onnx
ML_FORECAST_MODEL=models/performance_forecast.onnx
ML_ANOMALY_MODEL=models/anomaly_detection.onnx

# ML Inference Settings
ML_CONFIDENCE_THRESHOLD=0.5
ML_CACHE_RESULTS=true
ML_CACHE_TTL=3600

# Fallback to Phase 3
ML_FALLBACK_ENABLED=true

# Model Evaluation Targets
ML_PRECISION_TARGET=0.80
ML_RECALL_TARGET=0.75
ML_F1_TARGET=0.77
ML_ROC_AUC_TARGET=0.85
