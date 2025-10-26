# CRISPR-BERT Off-Target Prediction System

A full-stack application for predicting CRISPR Cas9 off-target effects using a hybrid CNN-BERT deep learning model with scientifically-accurate explanations based on research findings.

## 🔬 Research-Based Analysis

This system provides detailed scientific explanations based on the CRISPR-BERT research paper, identifying:

### Position-Specific Anomalies

- **Positions 1-3** (PAM-distal): Unexpectedly sensitive despite being in traditionally "tolerant" region
- **Position 8**: Shows strong positive contribution outside the seed region
- **Position 14**: MOST CRITICAL - shows fewest mismatches across all datasets
- **Position 21**: First base of PAM (N in NGG) - very informative for prediction

### Mismatch-Type Anomalies

- **G-A mismatches**: MOST SIGNIFICANT effect on off-target activity (especially at positions 1, 2, 16)
- **G-C mismatches**: Sensitive at position 1 despite being PAM-distal
- **G-T mismatches**: Sensitive at position 1
- **T-C mismatches**: Sensitive at position 8

### Indel Anomalies

- **Positions 1-4**: Indels are INTOLERANT (PAM-distal exception)
- **Positions 17-20**: Indels are INTOLERANT (PAM-proximal seed)
- **Position 11 (A\_)**: DNA bulge has GREAT IMPACT on activity
- **Positions 5-16**: Middle positions more tolerant to indels

## 🏗️ Tech Stack

### Backend

- **Node.js** + Express.js (Port 5000) - MERN API server
- **Flask** + Python (Port 5001) - ML model API
- **MongoDB** - Database for predictions and user data
- **Supabase** - Authentication

### Model

- **CRISPR-BERT** - Hybrid CNN-BERT architecture
- **TensorFlow/Keras** - Deep learning framework
- **20M parameters** - Trained model (final_model.keras)
- **Adaptive thresholding** - Research-optimized threshold

### Frontend

- **React** - UI framework
- **Tailwind CSS** - Styling
- **Axios** - API communication

## 📁 Project Structure

```
Crispr/
├── final1/                          # Complete model directory
│   ├── weight/
│   │   ├── final_model.keras        # Trained model (20MB)
│   │   ├── threshold_schedule.json  # Adaptive threshold
│   │   └── bert_weight/             # Pre-trained BERT
│   ├── crispr_bert.py              # Model architecture
│   ├── train_model.py              # Training script
│   └── run_model.py                # Inference script
│
├── model_api.py                     # Flask API (Port 5001)
├── server.js                        # Node.js API (Port 5000)
│
├── routes/
│   ├── predictions.js              # Prediction endpoints with scientific analysis
│   ├── auth.js                     # Authentication
│   └── analytics.js                # Statistics
│
├── utils/
│   ├── crisprAnalyzer.js           # Scientific analysis module
│   ├── supabaseServer.js           # Supabase integration
│   └── totpService.js              # TOTP authentication
│
├── models/
│   ├── Prediction.js               # MongoDB prediction schema
│   └── User.js                     # User schema
│
├── client/                          # React frontend
│   └── src/
│       ├── pages/
│       │   ├── Predict.js          # Prediction interface
│       │   └── Results.js          # Results display
│       └── utils/
│           └── api.js              # API client
│
├── test_model_integration.py       # Integration test
└── start_services.bat              # Windows startup script
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 14+
- MongoDB running
- Git

### 1. Install Dependencies

```bash
# Python dependencies
pip install -r requirements.txt

# Node.js backend dependencies
npm install

# React frontend dependencies
cd client
npm install
cd ..
```

### 2. Environment Setup

Create `.env` file in root:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/crispr_prediction

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Supabase (for authentication)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Optional
PORT=5000
NODE_ENV=development
```

### 3. Start Services

#### Option A: Windows Batch Script (Recommended)

```bash
start_services.bat
```

#### Option B: Manual Start

```bash
# Terminal 1: Flask Model API (Port 5001)
python model_api.py

# Terminal 2: Node.js Backend (Port 5000)
node server.js

# Terminal 3: React Frontend (Port 3000)
cd client
npm start
```

### 4. Verify Integration

```bash
# Run integration test
python test_model_integration.py
```

Expected output:

```
======================================================================
[SUCCESS] ALL TESTS PASSED!
======================================================================
```

## 📊 API Endpoints

### Flask Model API (Port 5001)

#### Health Check

```http
GET http://localhost:5001/health
```

#### Single Prediction

```http
POST http://localhost:5001/predict
Content-Type: application/json

{
  "sgRNA": "GGTGAGTGAGTGTGTGCGTGTGG",
  "DNA": "TGTGAGTGTGTGTGTGTGTGTGT"
}
```

Response:

```json
{
  "prediction": 0,
  "confidence": 0.9919,
  "probabilities": {
    "class_0": 0.9919,
    "class_1": 0.0081
  },
  "threshold_used": 0.65,
  "timestamp": "2025-10-24T14:30:00"
}
```

### Node.js API (Port 5000)

#### Text Prediction with Scientific Analysis

```http
POST http://localhost:5000/api/predictions/text
Authorization: Bearer <token>
Content-Type: application/json

{
  "sgRNA": "GGTGAGTGAGTGTGTGCGTGTGG",
  "DNA": "TGTGAGTGTGTGTGTGTGTGTGT",
  "actualLabel": 1
}
```

Response includes:

```json
{
  "success": true,
  "data": {
    "prediction": { ... },
    "scientific_analysis": {
      "primary_reason": {
        "type": "NON_CANONICAL_PAM",
        "confidence": "HIGH",
        "reason": "Non-canonical PAM sequence prevents efficient Cas9 binding",
        "scientificBasis": "Research-based explanation..."
      },
      "pam_analysis": { ... },
      "mismatches": [
        {
          "position": 14,
          "mismatchType": "G-A",
          "sensitivity": "CRITICAL",
          "explanation": "Position 14 is MOST SENSITIVE..."
        }
      ],
      "critical_anomalies": [ ... ],
      "explanations": [ ... ],
      "risk_factors": [ ... ]
    }
  }
}
```

## 🔬 Scientific Analysis Features

### 1. Position-Specific Sensitivity

The system identifies critical positions based on research:

- **Position 14**: Exceptionally sensitive (fewest mismatches)
- **Positions 1-3**: Unexpectedly important (PAM-distal anomaly)
- **Position 8**: Strong contribution outside seed region
- **Position 21**: PAM 'N' position - very informative

### 2. Mismatch Type Analysis

Identifies critical mismatch combinations:

- **G-A**: Most significant effect
- **G-C, G-T at position 1**: Sensitive despite PAM-distal location
- **T-C at position 8**: Unexpected sensitivity

### 3. Indel Detection

Analyzes insertion/deletion patterns:

- Positions 1-4: Intolerant (PAM-distal exception)
- Positions 17-20: Intolerant (seed region)
- Position 11 (A\_): Critical DNA bulge
- Positions 5-16: More tolerant

### 4. PAM Analysis

Detailed PAM sequence evaluation:

- Canonical vs non-canonical PAM
- Position 21 (N) sensitivity
- Impact on Cas9 binding

## 🎯 Usage Example

### Web Interface

1. Navigate to `http://localhost:3000`
2. Login with Supabase credentials
3. Go to "Predict" page
4. Enter sequences:
   - sgRNA: 23 nucleotides (A, T, C, G)
   - DNA: 23 nucleotides (A, T, C, G)
5. View detailed scientific analysis

### API Example

```javascript
const response = await fetch("http://localhost:5000/api/predictions/text", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    sgRNA: "GGTGAGTGAGTGTGTGCGTGTGG",
    DNA: "TGTGAGTGTGTGTGTGTGTGTGT",
    actualLabel: 1,
  }),
});

const data = await response.json();
console.log(data.scientific_analysis.primary_reason);
```

## 🧪 Testing

### Integration Test

```bash
python test_model_integration.py
```

Tests:

1. ✓ Model file existence
2. ✓ Python dependencies
3. ✓ Sequence encoding
4. ✓ Model loading
5. ✓ Prediction inference

### Manual Testing

```bash
# Test Flask API
curl http://localhost:5001/health

# Test prediction
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{"sgRNA":"GGTGAGTGAGTGTGTGCGTGTGG","DNA":"TGTGAGTGTGTGTGTGTGTGTGT"}'
```

## 📚 Model Architecture

```
Input: sgRNA (23nt) + DNA (23nt)
         ↓
    Encoding (26 tokens with [CLS] and [SEP])
         ↓
    ┌────┴─────┐
    ↓          ↓
CNN Branch   BERT Branch
(26×7)       (26 tokens)
    ↓          ↓
Inception    Transformer
   CNN         Layers
(26×80)      (26×80)
    ↓          ↓
  BiGRU      BiGRU
 (20+20)    (20+20)
    ↓          ↓
    └────┬─────┘
         ↓
  Weighted Fusion
  (20% CNN + 80% BERT)
         ↓
  Dense Layers
  (80→128→64→2)
         ↓
    Softmax
    (Class 0/1)
```

## 📖 Key Features

✅ **Scientific Accuracy**: Analysis based on peer-reviewed research  
✅ **Position-Specific**: Identifies critical positions (1-3, 8, 14, 21)  
✅ **Mismatch Analysis**: Detects G-A, G-C, G-T, T-C anomalies  
✅ **Indel Detection**: Analyzes insertion/deletion patterns  
✅ **PAM Validation**: Canonical vs non-canonical PAM analysis  
✅ **Adaptive Threshold**: Research-optimized confidence threshold  
✅ **User Authentication**: Supabase integration  
✅ **MongoDB Storage**: Persistent prediction history  
✅ **Real-time Analysis**: Fast inference (~100ms)

## 🔒 Security

- JWT-based authentication
- Supabase integration
- Rate limiting (100 req/15min)
- Input validation
- CORS protection
- Helmet.js security headers

## 📊 Performance

- **Model Size**: 20MB (final_model.keras)
- **Inference Time**: ~100ms per prediction
- **Accuracy**: Based on CRISPR-BERT research
- **Threshold**: 0.650 (adaptive, research-optimized)

## 🐛 Troubleshooting

### Model Not Loading

```
ERROR: Model not found
```

**Solution**: Ensure `final1/weight/final_model.keras` exists (20MB file)

### Flask API Not Responding

```
ECONNREFUSED 127.0.0.1:5001
```

**Solution**: Start Flask API with `python model_api.py`

### MongoDB Connection Error

```
MongoServerError: connect ECONNREFUSED
```

**Solution**: Start MongoDB service

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- CRISPR-BERT research paper authors
- TensorFlow/Keras team
- React and Node.js communities

## 📞 Support

For issues or questions:

1. Check the troubleshooting section
2. Review the integration test output
3. Check server logs for detailed error messages

## 🔄 Updates

- **v1.0.0** (2025-10-24)
  - Initial release
  - Scientific analyzer module
  - Complete MERN integration
  - Research-based explanations
