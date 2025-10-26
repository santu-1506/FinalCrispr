# CRISPR Gene Editing Prediction Tool

A comprehensive web application for predicting CRISPR-Cas9 gene editing success using advanced AI models.

## 🧬 Features

- **AI-Powered Predictions**: Uses CRISPR-BERT hybrid CNN-BERT architecture for accurate off-target prediction
- **Indel Support**: Handles insertions/deletions in sequence inputs using `-` notation
- **Visual Animation**: Interactive Cas9 cutting animations
- **Scientific Analysis**: Detailed molecular explanations of predictions
- **User Authentication**: Secure login system with prediction history
- **Real-time Results**: Fast predictions with confidence scoring

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Crispr
```

2. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

3. **Install Node.js dependencies**
```bash
npm install
cd client && npm install
```

4. **Start the services**
```bash
# Start both Python API and Node.js server
start_services.bat
```

## 🔧 Usage

1. **Access the application**: http://localhost:3000
2. **Enter sequences**: Input 23-nucleotide sgRNA and DNA sequences
3. **Support indels**: Use `-` for insertions/deletions
4. **Get predictions**: View results with confidence scores and molecular analysis

### Example Sequences

**Perfect Match:**
```
sgRNA: ATCGATCGATCGATCGATCAGGG
DNA:   ATCGATCGATCGATCGATCAGGG
```

**With Indel:**
```
sgRNA: GAGTCCGAGCAGAAGAAGAAAGG  
DNA:   GAGTCCGAGCA-AAGAAGAAAGG
```

## 🧠 Model Architecture

- **CRISPR-BERT**: Hybrid CNN (20%) + BERT Transformer (80%)
- **Training Data**: 850K+ experimental guide-target pairs
- **Accuracy**: 89.4% validation accuracy
- **Input**: 23-nucleotide paired sequences with indel support

## 📊 API Endpoints

- `POST /api/predictions/text` - Single sequence prediction
- `POST /api/predictions/batch` - Batch predictions
- `GET /api/predictions/my-predictions` - User prediction history
- `GET /health` - Model health check

## 🏗️ Project Structure

```
Crispr/
├── client/                 # React frontend
│   ├── src/components/    # UI components
│   └── src/pages/         # Application pages
├── final1/                # CRISPR-BERT model files
│   ├── weight/           # Trained model weights
│   └── datasets/         # Training datasets
├── routes/               # Express.js API routes
├── models/               # MongoDB schemas
├── utils/                # Utility functions
├── model_api.py         # Python prediction API
└── server.js            # Node.js server
```

## 🔬 Scientific Background

This tool implements the CRISPR-BERT architecture for predicting off-target effects in CRISPR-Cas9 gene editing. The model considers:

- Position-specific nucleotide sensitivity
- PAM sequence compatibility  
- Seed region complementarity (positions 13-20)
- Mismatch tolerance patterns
- Indel impact on binding affinity

## 📝 License

MIT License - see LICENSE file for details

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📧 Support

For issues or questions, please create a GitHub issue or contact the development team.

---

**Built with ❤️ for the CRISPR research community**