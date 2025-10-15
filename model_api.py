#!/usr/bin/env python3
"""
CRISPR-BERT Prediction API
Flask API serving CRISPR off-target predictions using hybrid CNN-BERT architecture
"""

import os
import warnings

# Suppress warnings
warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import numpy as np
import tensorflow as tf
from tensorflow import keras
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
from datetime import datetime

# CRISPR-BERT imports
from sequence_encoder import encode_for_cnn, encode_for_bert
from data_loader import load_dataset

# Suppress TensorFlow warnings
tf.get_logger().setLevel('ERROR')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Global model and configuration
model = None
threshold = 0.5
model_loaded = False

# Configuration
MODEL_PATH = 'final/weight/final_model.keras'
THRESHOLD_PATH = 'final/weight/threshold_schedule.json'


def load_trained_model():
    """Load the trained CRISPR-BERT model"""
    global model, threshold, model_loaded
    
    try:
        # Check if model exists
        if not os.path.exists(MODEL_PATH):
            logger.error(f"Model not found at {MODEL_PATH}")
            logger.info("Please train the model first using train_model.py from the final/ directory")
            return False
        
        logger.info(f"Loading CRISPR-BERT model from {MODEL_PATH}...")
        # Load with safe_mode=False to allow Lambda layers (trusted model)
        model = keras.models.load_model(MODEL_PATH, safe_mode=False)
        logger.info("✓ Model loaded successfully")
        
        # Load adaptive threshold
        if os.path.exists(THRESHOLD_PATH):
            with open(THRESHOLD_PATH, 'r') as f:
                data = json.load(f)
                threshold = data.get('final_threshold', 0.5)
                logger.info(f"✓ Using adaptive threshold: {threshold:.3f}")
        else:
            logger.info("Using default threshold: 0.5")
        
        model_loaded = True
        return True
        
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        return False


def predict_single(sgrna, dna):
    """
    Make prediction for a single sgRNA-DNA pair
    
    Args:
        sgrna: Guide RNA sequence
        dna: Target DNA sequence
    
    Returns:
        dict: Prediction results with probabilities
    """
    global model, threshold
    
    if model is None:
        raise RuntimeError("Model not loaded")
    
    # Encode sequences
    cnn_input = encode_for_cnn(sgrna, dna)  # (26, 7)
    token_ids = encode_for_bert(sgrna, dna)  # (26,)
    segment_ids = np.zeros(26, dtype=np.int32)
    position_ids = np.arange(26, dtype=np.int32)
    
    # Add batch dimension
    inputs = {
        'cnn_input': cnn_input[np.newaxis, ...],
        'token_ids': token_ids[np.newaxis, ...],
        'segment_ids': segment_ids[np.newaxis, ...],
        'position_ids': position_ids[np.newaxis, ...]
    }
    
    # Make prediction
    probabilities = model.predict(inputs, verbose=0)
    
    # Apply threshold
    predicted_class = int((probabilities[0, 1] >= threshold))
    confidence = float(probabilities[0, predicted_class])
    
    return {
        'prediction': predicted_class,
        'confidence': confidence,
        'probabilities': {
            'class_0': float(probabilities[0, 0]),
            'class_1': float(probabilities[0, 1])
        },
        'threshold_used': float(threshold)
    }


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model_loaded,
        'timestamp': datetime.now().isoformat(),
        'model_path': MODEL_PATH,
        'threshold': float(threshold) if model_loaded else None
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Main prediction endpoint
    
    Request body:
        {
            "sgRNA": "GGTGAGTGAGTGTGTGCGTGTGG",
            "DNA": "TGTGAGTGTGTGTGTGTGTGTGT"
        }
    
    Response:
        {
            "prediction": 0 or 1,
            "confidence": 0.0-1.0,
            "probabilities": {
                "class_0": 0.0-1.0,
                "class_1": 0.0-1.0
            },
            "sgRNA": "...",
            "DNA": "...",
            "timestamp": "..."
        }
    """
    if not model_loaded:
        return jsonify({
            'error': 'Model not loaded',
            'message': 'Please wait for model initialization or check server logs'
        }), 503
    
    try:
        # Parse request
        data = request.get_json()
        
        if not data or 'sgRNA' not in data or 'DNA' not in data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'Both sgRNA and DNA sequences are required'
            }), 400
        
        sgrna = data['sgRNA'].upper().strip()
        dna = data['DNA'].upper().strip()
        
        # Validate sequences
        if len(sgrna) != 23 or len(dna) != 23:
            return jsonify({
                'error': 'Invalid sequence length',
                'message': 'Both sequences must be exactly 23 nucleotides long',
                'received_lengths': {
                    'sgRNA': len(sgrna),
                    'DNA': len(dna)
                }
            }), 400
        
        valid_bases = set('ATCG')
        if not all(base in valid_bases for base in sgrna + dna):
            return jsonify({
                'error': 'Invalid nucleotides',
                'message': 'Sequences must contain only A, T, C, G nucleotides'
            }), 400
        
        # Make prediction
        result = predict_single(sgrna, dna)
        
        # Add request info to response
        result.update({
            'sgRNA': sgrna,
            'DNA': dna,
            'timestamp': datetime.now().isoformat()
        })
        
        # Log prediction
        logger.info(
            f"Prediction: {sgrna} vs {dna} → "
            f"Class {result['prediction']} "
            f"(confidence: {result['confidence']:.3f})"
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500


@app.route('/batch_predict', methods=['POST'])
def batch_predict():
    """
    Batch prediction endpoint
    
    Request body:
        {
            "sequences": [
                {"sgRNA": "...", "DNA": "..."},
                {"sgRNA": "...", "DNA": "..."}
            ]
        }
    
    Response:
        {
            "predictions": [
                {"prediction": 0, "confidence": 0.95, ...},
                ...
            ],
            "count": 2,
            "timestamp": "..."
        }
    """
    if not model_loaded:
        return jsonify({
            'error': 'Model not loaded',
            'message': 'Please wait for model initialization'
        }), 503
    
    try:
        data = request.get_json()
        
        if not data or 'sequences' not in data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'sequences array is required'
            }), 400
        
        sequences = data['sequences']
        
        if not isinstance(sequences, list) or len(sequences) == 0:
            return jsonify({
                'error': 'Invalid request',
                'message': 'sequences must be a non-empty array'
            }), 400
        
        # Process each sequence
        results = []
        for i, seq in enumerate(sequences):
            try:
                sgrna = seq['sgRNA'].upper().strip()
                dna = seq['DNA'].upper().strip()
                
                result = predict_single(sgrna, dna)
                result['sgRNA'] = sgrna
                result['DNA'] = dna
                result['index'] = i
                results.append(result)
                
            except Exception as e:
                results.append({
                    'index': i,
                    'error': str(e),
                    'sgRNA': seq.get('sgRNA', ''),
                    'DNA': seq.get('DNA', '')
                })
        
        return jsonify({
            'predictions': results,
            'count': len(results),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Batch prediction failed',
            'message': str(e)
        }), 500


@app.route('/model/info', methods=['GET'])
def model_info():
    """Get model information"""
    info = {
        'model_loaded': model_loaded,
        'model_type': 'CRISPR-BERT (Hybrid CNN-BERT)',
        'timestamp': datetime.now().isoformat()
    }
    
    if model_loaded:
        info.update({
            'model_path': MODEL_PATH,
            'threshold': float(threshold),
            'architecture': {
                'cnn_branch': 'Inception CNN (multi-scale convolutions)',
                'bert_branch': 'Transformer with multi-head attention',
                'bigru_layers': 'Bidirectional GRU (20+20 units)',
                'weights': 'CNN: 20%, BERT: 80%',
                'output': 'Binary classification (on-target vs off-target)'
            },
            'input_format': {
                'sgRNA_length': 23,
                'DNA_length': 23,
                'encoding': {
                    'cnn': '26x7 matrix (with [CLS] and [SEP] tokens)',
                    'bert': '26 token IDs'
                }
            }
        })
    
    return jsonify(info)


def initialize_app():
    """Initialize the application"""
    logger.info("=" * 60)
    logger.info("CRISPR-BERT Prediction API")
    logger.info("Hybrid CNN-BERT Architecture for Off-Target Prediction")
    logger.info("=" * 60)
    
    success = load_trained_model()
    
    if success:
        logger.info("✓ API ready to serve predictions")
    else:
        logger.warning("⚠ API started but model not loaded")
        logger.warning("Please train the model using: python final/train_model.py")
    
    return success


if __name__ == '__main__':
    initialize_app()
    
    # Run Flask app
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"\nStarting server on port {port}...")
    logger.info("=" * 60)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False
    )
