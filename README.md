# CRISPR-BERT: Off-Target Prediction Platform

A comprehensive full-stack application for predicting CRISPR-Cas9 off-target effects using a state-of-the-art hybrid CNN-BERT deep learning architecture.

## 🧬 Overview

This platform combines cutting-edge AI technology with biological expertise to provide accurate CRISPR off-target predictions. It features a modern web interface, hybrid CNN-BERT model architecture, real-time analytics, and comprehensive prediction management.

**Model Architecture**: CRISPR-BERT combines Inception-based CNN (20%) and BERT transformer (80%) architectures with BiGRU layers for superior sequence analysis and off-target prediction.

## ✨ Features

### 🔬 Core Functionality

- **Hybrid CNN-BERT Model**: State-of-the-art deep learning architecture
- **Multi-scale Feature Extraction**: Inception CNN for local patterns
- **Transformer Attention**: BERT-based sequence understanding
- **Bidirectional Processing**: BiGRU layers for context modeling
- **Real-time Predictions**: Fast inference with <200ms latency
- **Adaptive Thresholding**: Dynamic threshold optimization for accuracy

### 📊 Model Architecture

```
┌─────────────────────────────────────────┐
│  CNN Branch (20%)    BERT Branch (80%)  │
│                                          │
│  Inception CNN       Transformer        │
│  (26×7) → (26×80)    Token + Segment +  │
│                      Position Embeddings│
│                      → (26×80)          │
│                                          │
│  BiGRU (20+20)       BiGRU (20+20)      │
│  → (26×40)           → (26×40)          │
│                                          │
│  Take last           Take last          │
│  timestep            timestep           │
│  → (40)              → (40)             │
│                                          │
│  × 0.2               × 0.8              │
└─────────────────────────────────────────┘
                  ↓
         Concatenate → (80)
                  ↓
    Dense Layers (128→64→2)
                  ↓
        Binary Classification
```

### 🎨 User Experience

- **Modern UI**: Clean, professional interface with Tailwind CSS
- **Responsive Design**: Works seamlessly across all devices
- **Authentication**: Secure TOTP-based authentication with Supabase
- **Analytics Dashboard**: Comprehensive prediction metrics and visualizations
- **Real-time Feedback**: Live validation and error handling

## 🛠️ Technology Stack

### Frontend

- **React 18** - Modern UI framework
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Recharts** - Data visualization
- **React Router** - Client-side routing
- **Supabase** - Authentication and database

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Database and auth
- **TOTP** - Two-factor authentication

### AI/ML Stack

- **TensorFlow 2.15+** - Deep learning framework
- **Python Flask** - Model serving API
- **CRISPR-BERT** - Hybrid CNN-BERT architecture
- **NumPy & Pandas** - Data processing
- **scikit-learn** - Metrics and evaluation

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **Git**
- **Supabase Account** (for authentication)

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd Crispr
```

#### 2. Install Backend Dependencies

```bash
npm install
```

#### 3. Install Frontend Dependencies

```bash
cd client
npm install
cd ..
```

#### 4. Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### 5. Set Up Environment Variables

Create `.env` file in root directory:

```bash
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Model API
MODEL_API_URL=http://localhost:5001
```

Create `.env` file in `client/` directory:

```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

#### 6. Train the CRISPR-BERT Model (First Time)

```bash
cd final
python train_model.py
cd ..
```

This will:

- Load datasets from `final/datasets/`
- Train the hybrid CNN-BERT model
- Save the model to `final/weight/final_model.keras`
- Generate adaptive threshold schedule

#### 7. Start the Services

**Terminal 1 - Python Model API**:

```bash
python model_api.py
```

**Terminal 2 - Backend Server**:

```bash
npm run dev
```

**Terminal 3 - Frontend**:

```bash
cd client
npm start
```

### 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Model API**: http://localhost:5001
- **Health Check**: http://localhost:5001/health

## 📝 Usage

### Making Predictions

1. **Create Account / Login**:

   - Sign up with email
   - Set up TOTP authentication
   - Verify email if required

2. **Single Prediction**:

   - Navigate to Predict page
   - Enter 23-nucleotide sgRNA sequence (A, T, C, G only)
   - Enter 23-nucleotide target DNA sequence
   - Click "Predict"
   - View prediction class, confidence, and probabilities

3. **Batch Prediction**:
   - Use the API endpoint `/batch_predict`
   - Send array of sequence pairs
   - Receive predictions for all pairs

### Viewing Analytics

1. Navigate to Analytics page
2. View:
   - Overall prediction statistics
   - Model performance metrics
   - Confidence distributions
   - Prediction trends over time

### Managing Results

1. Navigate to Results page
2. View all your predictions
3. Filter and search results
4. Export data as needed

## 🔬 Model Information

### CRISPR-BERT Architecture

#### Input Encoding

1. **CNN Encoding**: Sequence pairs encoded as (26, 7) matrix

   - 26 positions (24 bp + [CLS] + [SEP] tokens)
   - 7 features per position (nucleotide matching patterns)

2. **BERT Encoding**: Token-based representation
   - 28-token vocabulary (paired nucleotides + special tokens)
   - Token IDs with position and segment embeddings
   - Transformer layers with multi-head attention

#### Model Components

- **Inception CNN Branch**:

  - Multi-scale convolutions (1×1, 2×2, 3×3, 5×5)
  - Total: 80 channels (5 + 15 + 25 + 35)
  - Captures local sequence patterns

- **BERT Branch**:

  - 256-dimensional embeddings
  - 4 attention heads
  - 2 transformer layers
  - 1024-dimensional feed-forward networks
  - Projects to 80 dimensions

- **BiGRU Layers**:

  - Separate BiGRU for each branch
  - 20 forward + 20 backward units = 40 dimensions
  - Bidirectional sequence context

- **Fusion & Classification**:
  - Weighted combination (CNN: 20%, BERT: 80%)
  - Dense layers (80 → 128 → 64 → 2)
  - Dropout (0.35) for regularization
  - Binary classification output

### Training Configuration

| Parameter       | Value                           | Description                      |
| --------------- | ------------------------------- | -------------------------------- |
| Learning Rate   | 1e-4                            | Adam optimizer                   |
| Batch Size      | 256                             | Large batch for stable gradients |
| Epochs          | 30                              | With early stopping (patience=5) |
| Loss Function   | Sparse Categorical Crossentropy | Binary classification            |
| Class Weighting | Auto                            | Handles imbalanced datasets      |
| Dropout Rate    | 0.35                            | Regularization                   |

### Performance Metrics

The model reports:

- **AUROC** - Overall discrimination ability
- **PRAUC** - Precision-Recall AUC (handles class imbalance)
- **F1 Score** - Harmonic mean of precision and recall
- **MCC** - Matthews Correlation Coefficient
- **Accuracy** - Overall correctness

## 📊 API Reference

### Model API Endpoints

#### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "healthy",
  "model_loaded": true,
  "timestamp": "2025-10-15T...",
  "threshold": 0.55
}
```

#### Single Prediction

```http
POST /predict
Content-Type: application/json

{
  "sgRNA": "GGTGAGTGAGTGTGTGCGTGTGG",
  "DNA": "TGTGAGTGTGTGTGTGTGTGTGT"
}
```

Response:

```json
{
  "prediction": 1,
  "confidence": 0.876,
  "probabilities": {
    "class_0": 0.124,
    "class_1": 0.876
  },
  "threshold_used": 0.55,
  "sgRNA": "GGTGAGTGAGTGTGTGCGTGTGG",
  "DNA": "TGTGAGTGTGTGTGTGTGTGTGT",
  "timestamp": "2025-10-15T..."
}
```

#### Batch Prediction

```http
POST /batch_predict
Content-Type: application/json

{
  "sequences": [
    {"sgRNA": "...", "DNA": "..."},
    {"sgRNA": "...", "DNA": "..."}
  ]
}
```

#### Model Information

```http
GET /model/info
```

Response:

```json
{
  "model_loaded": true,
  "model_type": "CRISPR-BERT (Hybrid CNN-BERT)",
  "architecture": {
    "cnn_branch": "Inception CNN (multi-scale convolutions)",
    "bert_branch": "Transformer with multi-head attention",
    "bigru_layers": "Bidirectional GRU (20+20 units)",
    "weights": "CNN: 20%, BERT: 80%"
  },
  "input_format": {
    "sgRNA_length": 23,
    "DNA_length": 23
  }
}
```

### Backend API Endpoints

See `routes/` directory for full backend API:

- `/api/auth` - Authentication endpoints
- `/api/predictions` - Prediction management
- `/api/analytics` - Analytics and statistics

## 🔧 Project Structure

```
Crispr/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
│
├── final/                   # CRISPR-BERT model files
│   ├── datasets/            # Training datasets
│   ├── weight/              # Trained model weights
│   ├── bert_model.py        # BERT implementation
│   ├── cnn_model.py         # CNN implementation
│   ├── crispr_bert.py       # Combined model
│   ├── sequence_encoder.py  # Sequence encoding
│   ├── data_loader.py       # Dataset loading
│   ├── train_model.py       # Training script
│   └── run_model.py         # Inference script
│
├── routes/                  # Express routes
│   ├── auth.js              # Authentication
│   ├── predictions.js       # Predictions
│   └── analytics.js         # Analytics
│
├── utils/                   # Backend utilities
│   ├── supabaseServer.js    # Supabase server client
│   └── totpService.js       # TOTP authentication
│
├── middleware/              # Express middleware
│   └── auth.js              # Auth middleware
│
├── models/                  # Data models
│   ├── User.js
│   └── Prediction.js
│
├── model_api.py             # Flask API for predictions
├── server.js                # Express server
├── requirements.txt         # Python dependencies
└── package.json             # Node dependencies
```

## 🐳 Docker Deployment

### Using Docker Compose (Coming Soon)

```bash
docker-compose up -d
```

## 🧪 Testing

### Test Model Inference

```bash
cd final
python run_model.py
```

### Test API

```bash
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sgRNA": "GGTGAGTGAGTGTGTGCGTGTGG",
    "DNA": "TGTGAGTGTGTGTGTGTGTGTGT"
  }'
```

## 📚 Documentation

- **Model Documentation**: See `final/README.md`
- **TOTP Setup**: See `TOTP_SETUP_GUIDE.md`
- **Supabase Setup**: See `SUPABASE_SETUP.md`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🔬 Scientific Background

### CRISPR-Cas9 System

- **Guide RNA (sgRNA)**: 23-nucleotide sequence that guides Cas9 to target
- **Target DNA**: Genomic sequence to be edited
- **Off-Target Effects**: Unintended edits at similar sequences
- **Success Factors**: Sequence complementarity, mismatches, position effects

### CRISPR-BERT Approach

- **Hybrid Architecture**: Combines local (CNN) and global (BERT) features
- **Multi-scale Analysis**: Captures patterns at different sequence lengths
- **Attention Mechanism**: Learns which positions are most important
- **Adaptive Thresholding**: Optimizes decision boundary for each dataset

### Key Advantages

1. **Better than Single Models**: Outperforms CNN-only or BERT-only approaches
2. **Interpretable**: Attention weights show important sequence regions
3. **Transferable**: Can be fine-tuned on new datasets
4. **Efficient**: Fast inference suitable for production use

## 🙏 Acknowledgments

- CRISPR-BERT architecture inspired by state-of-the-art research
- Built on TensorFlow and Flask frameworks
- UI powered by React and Tailwind CSS

## 📞 Support

For questions or issues:

- Open an issue on GitHub
- Check the documentation
- Review the examples in `final/`

---

**Built with ❤️ for the scientific community**

_Advancing CRISPR technology through AI-powered predictions_
