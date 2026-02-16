"""
Test script to verify the ONNX model loading and inference.
"""

import numpy as np
import onnxruntime as ort
import joblib
import time

def test_model():
    """Test the ONNX model loading and inference."""
    try:
        # Load the ONNX model and scaler
        sess = ort.InferenceSession("risk_classifier.onnx")
        scaler = joblib.load("scaler.pkl")
        print("Model and scaler loaded successfully")
        
        # Create test input data
        test_input = np.array([[50.0, 3.0, 5.0, 3.0, 4.0]])  # [recovery, habit, stress, sleep, workout]
        print(f"Test input: {test_input}")
        
        # Scale the input data
        input_scaled = scaler.transform(test_input)
        print(f"Scaled input: {input_scaled}")
        
        # Run inference
        start_time = time.time()
        input_name = sess.get_inputs()[0].name
        raw_prediction = sess.run(None, {input_name: input_scaled.astype(np.float32)})[0]
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        print(f"Raw prediction: {raw_prediction}")
        print(f"Processing time: {processing_time:.2f}ms")
        
        # Convert to alert decision
        alerta_roja = bool(raw_prediction[0] > 0.5)
        print(f"AlertaRoja: {alerta_roja}")
        
        return True
    except Exception as e:
        print(f"Error testing model: {e}")
        return False

if __name__ == "__main__":
    success = test_model()
    if success:
        print("Model test completed successfully!")
    else:
        print("Model test failed!")