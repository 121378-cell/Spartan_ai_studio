"""
Benchmark script to test the latency of the alert prediction endpoint.
"""

import numpy as np
import onnxruntime as ort
import joblib
import time

def benchmark_alert_prediction():
    """Benchmark the alert prediction function for latency."""
    try:
        # Load the ONNX model and scaler
        sess = ort.InferenceSession("risk_classifier.onnx")
        scaler = joblib.load("scaler.pkl")
        print("Model and scaler loaded successfully")
        
        # Create test input data
        test_input = np.array([[50.0, 3.0, 5.0, 3.0, 4.0]])  # [recovery, habit, stress, sleep, workout]
        
        # Scale the input data
        input_scaled = scaler.transform(test_input)
        
        # Warm up the model
        input_name = sess.get_inputs()[0].name
        for _ in range(10):
            sess.run(None, {input_name: input_scaled.astype(np.float32)})
        
        # Benchmark the prediction
        times = []
        for _ in range(1000):
            start_time = time.perf_counter()
            
            # Run inference
            raw_prediction = sess.run(None, {input_name: input_scaled.astype(np.float32)})[0]
            
            end_time = time.perf_counter()
            times.append((end_time - start_time) * 1000)  # Convert to milliseconds
        
        # Calculate statistics
        avg_time = np.mean(times)
        min_time = np.min(times)
        max_time = np.max(times)
        p95_time = np.percentile(times, 95)
        
        print(f"Average processing time: {avg_time:.2f}ms")
        print(f"Minimum processing time: {min_time:.2f}ms")
        print(f"Maximum processing time: {max_time:.2f}ms")
        print(f"95th percentile time: {p95_time:.2f}ms")
        
        # Check if it meets the <50ms requirement
        if avg_time < 50:
            print("✅ Meets latency requirement (<50ms)")
        else:
            print("❌ Does not meet latency requirement (<50ms)")
        
        return True
    except Exception as e:
        print(f"Error benchmarking model: {e}")
        return False

if __name__ == "__main__":
    success = benchmark_alert_prediction()
    if success:
        print("Benchmark completed successfully!")
    else:
        print("Benchmark failed!")