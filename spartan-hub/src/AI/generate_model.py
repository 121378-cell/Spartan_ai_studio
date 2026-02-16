"""
Simple script to generate the ONNX model and scaler files.
This is a placeholder to create the required files for the Docker image.
"""

import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

def create_dummy_model():
    """Create a dummy model and export it to ONNX format."""
    # Create dummy training data
    X_train = np.random.rand(100, 5)
    y_train = np.random.randint(0, 2, 100)
    
    # Create and train a dummy model
    model = RandomForestClassifier(n_estimators=10, random_state=42)
    model.fit(X_train, y_train)
    
    # Create and fit a dummy scaler
    scaler = StandardScaler()
    scaler.fit(X_train)
    
    # Export to ONNX
    initial_type = [('float_input', FloatTensorType([None, X_train.shape[1]]))]
    onnx_model = convert_sklearn(model, initial_types=initial_type)
    
    # Save ONNX model
    with open("risk_classifier.onnx", "wb") as f:
        f.write(onnx_model.SerializeToString())
    
    # Save scaler
    joblib.dump(scaler, "scaler.pkl")
    
    print("Dummy model and scaler created successfully!")
    print("Files generated:")
    print("  - risk_classifier.onnx")
    print("  - scaler.pkl")

if __name__ == "__main__":
    create_dummy_model()