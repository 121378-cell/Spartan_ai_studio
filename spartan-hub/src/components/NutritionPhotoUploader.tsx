/**
 * NutritionPhotoUploader Component
 * 
 * Camera-enabled food photo upload with real-time analysis
 * and nutrition insights.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, Loader2, Sparkles } from 'lucide-react';
import './NutritionPhotoUploader.css';

interface NutritionData {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  servingSize: string;
  confidence: number;
}

interface PhotoAnalysisResult {
  detectedFoods: NutritionData[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  suggestions: string[];
}

interface NutritionPhotoUploaderProps {
  userId: string;
  onAnalysisComplete?: (result: PhotoAnalysisResult) => void;
  onError?: (error: string) => void;
}

export const NutritionPhotoUploader: React.FC<NutritionPhotoUploaderProps> = ({
  userId,
  onAnalysisComplete,
  onError
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
    } catch (err) {
      onError?.('Could not access camera. Please check permissions.');
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const analyzePhoto = useCallback(async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/nutrition/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId,
          image: capturedImage
        })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setAnalysisResult(result.data);
      onAnalysisComplete?.(result.data);
    } catch (err) {
      onError?.('Failed to analyze photo. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [capturedImage, userId, onAnalysisComplete, onError]);

  const reset = useCallback(() => {
    setCapturedImage(null);
    setAnalysisResult(null);
    stopCamera();
  }, [stopCamera]);

  const saveToLog = useCallback(async () => {
    if (!analysisResult) return;

    try {
      const response = await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId,
          foods: analysisResult.detectedFoods,
          totalNutrition: analysisResult.totalNutrition,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      reset();
    } catch (err) {
      onError?.('Failed to save to log.');
    }
  }, [analysisResult, userId, reset, onError]);

  return (
    <div className="nutrition-photo-uploader">
      <div className="uploader-header">
        <h3>📸 Nutrition Scanner</h3>
        <p>Take a photo of your meal to analyze nutrition</p>
      </div>

      {!capturedImage && !isCapturing && (
        <div className="upload-options">
          <button onClick={startCamera} className="upload-btn camera-btn">
            <Camera size={32} />
            <span>Take Photo</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="upload-btn file-btn"
          >
            <Upload size={32} />
            <span>Upload Image</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden-input"
          />
        </div>
      )}

      {isCapturing && (
        <div className="camera-view">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="camera-video"
          />
          <div className="camera-controls">
            <button onClick={stopCamera} className="camera-btn cancel">
              <X size={24} />
            </button>
            <button onClick={capturePhoto} className="camera-btn capture">
              <div className="shutter-button"></div>
            </button>
          </div>
        </div>
      )}

      {capturedImage && !analysisResult && (
        <div className="preview-view">
          <img src={capturedImage} alt="Captured meal" className="preview-image" />
          <div className="preview-controls">
            <button onClick={reset} className="btn btn-secondary">
              <X size={18} /> Retake
            </button>
            <button
              onClick={analyzePhoto}
              disabled={isAnalyzing}
              className="btn btn-primary"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={18} className="spin" /> Analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Analyze
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {analysisResult && (
        <div className="analysis-results">
          <div className="results-header">
            <h4>🍽️ Analysis Results</h4>
            <button onClick={reset} className="close-btn">
              <X size={20} />
            </button>
          </div>

          <div className="detected-foods">
            {analysisResult.detectedFoods.map((food, index) => (
              <div key={index} className="food-item">
                <div className="food-header">
                  <span className="food-name">{food.foodName}</span>
                  <span className="confidence">{food.confidence}% match</span>
                </div>
                <div className="food-details">
                  <span className="serving">{food.servingSize}</span>
                  <div className="macros">
                    <span className="macro calories">{food.calories} cal</span>
                    <span className="macro protein">{food.protein}g protein</span>
                    <span className="macro carbs">{food.carbs}g carbs</span>
                    <span className="macro fat">{food.fat}g fat</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="total-nutrition">
            <h5>Total Nutrition</h5>
            <div className="total-macros">
              <div className="macro-total">
                <span className="value">{analysisResult.totalNutrition.calories}</span>
                <span className="label">calories</span>
              </div>
              <div className="macro-total">
                <span className="value">{analysisResult.totalNutrition.protein}g</span>
                <span className="label">protein</span>
              </div>
              <div className="macro-total">
                <span className="value">{analysisResult.totalNutrition.carbs}g</span>
                <span className="label">carbs</span>
              </div>
              <div className="macro-total">
                <span className="value">{analysisResult.totalNutrition.fat}g</span>
                <span className="label">fat</span>
              </div>
            </div>
          </div>

          {analysisResult.suggestions.length > 0 && (
            <div className="suggestions">
              <h5>💡 Suggestions</h5>
              <ul>
                {analysisResult.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={saveToLog} className="btn btn-primary save-btn">
            <Check size={18} /> Save to Log
          </button>
        </div>
      )}
    </div>
  );
};

export default NutritionPhotoUploader;
