#!/usr/bin/env python3
"""
Test script to verify CRISPR-BERT model integration
Tests model loading and prediction capabilities
"""

import os
import sys
import json

print("=" * 70)
print("CRISPR-BERT Model Integration Test")
print("=" * 70)
print()

# Test 1: Check file existence
print("[1/5] Checking model files...")
model_path = 'final1/weight/final_model.keras'
threshold_path = 'final1/weight/threshold_schedule.json'

if os.path.exists(model_path):
    size_mb = os.path.getsize(model_path) / (1024 * 1024)
    print(f"  [OK] Model file found: {model_path} ({size_mb:.1f} MB)")
else:
    print(f"  [ERROR] Model file NOT found: {model_path}")
    sys.exit(1)

if os.path.exists(threshold_path):
    print(f"  [OK] Threshold file found: {threshold_path}")
    with open(threshold_path, 'r') as f:
        threshold_data = json.load(f)
        print(f"    Adaptive threshold: {threshold_data.get('final_threshold', 0.5)}")
else:
    print(f"  [OK] Threshold file not found (will use default 0.5)")
print()

# Test 2: Check dependencies
print("[2/5] Checking Python dependencies...")
try:
    import numpy as np
    print(f"  [OK] numpy: {np.__version__}")
except ImportError:
    print("  [ERROR] numpy not installed")
    sys.exit(1)

try:
    import tensorflow as tf
    print(f"  [OK] tensorflow: {tf.__version__}")
except ImportError:
    print("  [ERROR] tensorflow not installed")
    sys.exit(1)

try:
    from flask import Flask
    print(f"  [OK] flask: installed")
except ImportError:
    print("  [ERROR] flask not installed")
    sys.exit(1)

try:
    from sequence_encoder import encode_for_cnn, encode_for_bert
    print(f"  [OK] sequence_encoder: imported")
except ImportError:
    print("  [ERROR] sequence_encoder not found")
    sys.exit(1)

print()

# Test 3: Test encoding
print("[3/5] Testing sequence encoding...")
try:
    sgrna = "GGTGAGTGAGTGTGTGCGTGTGG"
    dna = "TGTGAGTGTGTGTGTGTGTGTGT"
    
    cnn_input = encode_for_cnn(sgrna, dna)
    bert_input = encode_for_bert(sgrna, dna)
    
    print(f"  [OK] CNN encoding: {cnn_input.shape} (expected: (26, 7))")
    print(f"  [OK] BERT encoding: {bert_input.shape} (expected: (26,))")
    
    if cnn_input.shape != (26, 7):
        print(f"  [ERROR] CNN shape mismatch!")
        sys.exit(1)
    if bert_input.shape != (26,):
        print(f"  [ERROR] BERT shape mismatch!")
        sys.exit(1)
        
except Exception as e:
    print(f"  [ERROR] Encoding failed: {e}")
    sys.exit(1)
print()

# Test 4: Load model
print("[4/5] Loading CRISPR-BERT model...")
try:
    from tensorflow import keras
    
    # Suppress warnings
    import warnings
    warnings.filterwarnings('ignore')
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    
    print(f"  Loading from: {model_path}")
    model = keras.models.load_model(model_path, safe_mode=False)
    print(f"  [OK] Model loaded successfully")
    print(f"    Model inputs: {len(model.inputs)}")
    for i, inp in enumerate(model.inputs):
        print(f"      Input {i}: {inp.name} - shape {inp.shape}")
    print(f"    Model outputs: {len(model.outputs)}")
    for i, out in enumerate(model.outputs):
        print(f"      Output {i}: {out.name} - shape {out.shape}")
        
except Exception as e:
    print(f"  [ERROR] Model loading failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
print()

# Test 5: Make prediction
print("[5/5] Testing prediction...")
try:
    # Prepare inputs
    segment_ids = np.zeros(26, dtype=np.int32)
    position_ids = np.arange(26, dtype=np.int32)
    
    inputs = {
        'cnn_input': cnn_input[np.newaxis, ...],
        'token_ids': bert_input[np.newaxis, ...],
        'segment_ids': segment_ids[np.newaxis, ...],
        'position_ids': position_ids[np.newaxis, ...]
    }
    
    print(f"  Input shapes:")
    for key, val in inputs.items():
        print(f"    {key}: {val.shape}")
    
    # Make prediction
    probabilities = model.predict(inputs, verbose=0)
    
    print(f"  [OK] Prediction successful")
    print(f"    Output shape: {probabilities.shape}")
    print(f"    Probabilities: Class 0 = {probabilities[0, 0]:.4f}, Class 1 = {probabilities[0, 1]:.4f}")
    
    # Apply threshold
    if os.path.exists(threshold_path):
        with open(threshold_path, 'r') as f:
            threshold = json.load(f).get('final_threshold', 0.5)
    else:
        threshold = 0.5
    
    predicted_class = int(probabilities[0, 1] >= threshold)
    confidence = float(probabilities[0, predicted_class])
    
    print(f"    Threshold: {threshold:.3f}")
    print(f"    Predicted class: {predicted_class}")
    print(f"    Confidence: {confidence:.4f}")
    
except Exception as e:
    print(f"  [ERROR] Prediction failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print()
print("=" * 70)
print("[SUCCESS] ALL TESTS PASSED!")
print("=" * 70)
print()
print("The model is ready to use. You can now:")
print("  1. Start Flask API:     python model_api.py")
print("  2. Start Node.js API:   node server.js")
print("  3. Start React UI:      cd client && npm start")
print()
print("Or use the convenience script:")
print("  start_services.bat")
print()

