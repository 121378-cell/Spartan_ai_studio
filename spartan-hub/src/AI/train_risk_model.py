"""
Train and export a risk classification model to ONNX format.
This model predicts burnout risk based on user data.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, accuracy_score
import joblib
import onnx
import torch
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

def generate_sample_data():
    """Generate sample data for training the risk classification model."""
    np.random.seed(42)
    n_samples = 1000
    
    # Generate synthetic features based on the burnout prediction logic
    # recovery_score: 0-100 scale (lower means worse recovery)
    recovery_score = np.random.normal(50, 20, n_samples)
    recovery_score = np.clip(recovery_score, 0, 100)
    
    # habit_adherence: 1-5 scale (lower means worse adherence)
    habit_adherence = np.random.normal(3, 1, n_samples)
    habit_adherence = np.clip(habit_adherence, 1, 5)
    
    # stress_level: 1-10 scale (higher means more stress)
    stress_level = np.random.normal(5, 2, n_samples)
    stress_level = np.clip(stress_level, 1, 10)
    
    # sleep_quality: 1-5 scale (lower means worse sleep)
    sleep_quality = np.random.normal(3, 1, n_samples)
    sleep_quality = np.clip(sleep_quality, 1, 5)
    
    # workout_frequency: 0-7 times per week
    workout_frequency = np.random.poisson(4, n_samples)
    workout_frequency = np.clip(workout_frequency, 0, 7)
    
    # Create risk labels based on a combination of these factors
    # Higher risk when recovery is low, habit adherence is poor, stress is high, sleep is poor
    risk_score = (
        (100 - recovery_score) * 0.3 +
        (5 - habit_adherence) * 10 * 0.2 +
        stress_level * 10 * 0.3 +
        (5 - sleep_quality) * 10 * 0.2
    )
    
    # Convert to binary classification (high risk vs not high risk)
    # Threshold at 60 for high risk
    risk_label = (risk_score > 60).astype(int)
    
    # Create DataFrame
    data = pd.DataFrame({
        'recovery_score': recovery_score,
        'habit_adherence': habit_adherence,
        'stress_level': stress_level,
        'sleep_quality': sleep_quality,
        'workout_frequency': workout_frequency,
        'risk_label': risk_label
    })
    
    return data

def train_model(data):
    """Train a risk classification model."""
    # Separate features and target
    X = data.drop('risk_label', axis=1)
    y = data['risk_label']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Model Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    return model, scaler, X_test_scaled, y_test

def export_to_onnx(model, scaler, sample_input):
    """Export the trained model to ONNX format."""
    # Define input type for ONNX
    initial_type = [('float_input', FloatTensorType([None, sample_input.shape[1]]))]
    
    # Convert to ONNX
    onnx_model = convert_sklearn(model, initial_types=initial_type)
    
    # Save ONNX model
    with open("risk_classifier.onnx", "wb") as f:
        f.write(onnx_model.SerializeToString())
    
    print("Model exported to risk_classifier.onnx")
    
    # Save scaler
    joblib.dump(scaler, "scaler.pkl")
    print("Scaler saved to scaler.pkl")
    
    return onnx_model

def validate_onnx_model(onnx_model, sample_input, expected_output):
    """Validate the ONNX model by running inference."""
    import onnxruntime as ort
    
    # Create ONNX Runtime session
    sess = ort.InferenceSession(onnx_model.SerializeToString())
    
    # Run inference
    input_name = sess.get_inputs()[0].name
    onnx_output = sess.run(None, {input_name: sample_input.astype(np.float32)})[0]
    
    # Compare with expected output (first 5 predictions)
    print("\nValidation - Comparing first 5 predictions:")
    print("Expected:", expected_output[:5])
    print("ONNX:", onnx_output[:5])
    print("Match:", np.array_equal(expected_output[:5], onnx_output[:5]))

def main():
    """Main function to train and export the model."""
    print("Generating sample data...")
    data = generate_sample_data()
    print(f"Generated {len(data)} samples")
    print(data.head())
    
    print("\nTraining model...")
    model, scaler, X_test_scaled, y_test = train_model(data)
    
    # Get predictions from sklearn model for validation
    sklearn_pred = model.predict(X_test_scaled)
    
    print("\nExporting to ONNX...")
    sample_input = X_test_scaled[:5]  # Sample input for initial type definition
    onnx_model = export_to_onnx(model, scaler, sample_input)
    
    print("\nValidating ONNX model...")
    validate_onnx_model(onnx_model, X_test_scaled, sklearn_pred)
    
    print("\nModel training and export completed successfully!")

if __name__ == "__main__":
    main()