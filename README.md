# GNSS SHIELD v3.0 — Spoofing & Jamming Detection

Full-stack deep learning dashboard with **real trained models**, **5 satellite canvas animations**, and **secure login authentication**.

## Project Structure
```
gnss-shield-v3/
├── backend/
│   ├── app.py               ← Flask API + custom Keras layers + auth
│   ├── requirements.txt
│   ├── models/              ← Your 5 trained .keras models (included)
│   │   ├── cnn_baseline.keras
│   │   ├── cnn_lstm_hybrid.keras
│   │   ├── autoencoder_model.keras
│   │   ├── Attention_CNN_CBAM.keras
│   │   └── senet_cnn.keras
│   └── uploads/
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── components/
    │   │   ├── LoginPage.js          ← Animated orbital login
    │   │   └── GNSSSpoofingDetector.js ← Full dashboard
    └── package.json
```

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
# Runs at http://localhost:5000
# Loads all 5 models automatically
```

### Frontend
```bash
cd frontend
npm install
npm start
# Runs at http://localhost:3000
```

## Login Credentials

| Role    | Username | Password     |
|---------|----------|--------------|
| Admin   | `admin`  | `gnss2024`   |
| Analyst | `analyst`| `analyst123` |

To change: edit `USERS` dict in `backend/app.py`, update hash with:
```python
import hashlib
print(hashlib.sha256("new_password".encode()).hexdigest())
```

## Models (all .keras files included)

| Model              | File                       | Accuracy |
|--------------------|----------------------------|----------|
| CNN Baseline       | cnn_baseline.keras         | 98.73%   |
| CNN-LSTM Hybrid    | cnn_lstm_hybrid.keras      | 97.24%   |
| Autoencoder        | autoencoder_model.keras    | 85.50%   |
| **CBAM (Best)**    | Attention_CNN_CBAM.keras   | **99.42%** |
| SE-Net CNN         | senet_cnn.keras            | 99.15%   |

> The CBAM and SE-Net models use custom Keras layers (ChannelAttention, SpatialAttention, SEBlock) defined directly in `app.py` — no additional files needed.

## API (all protected with Bearer token)

```
POST /api/login         — Get auth token
POST /api/logout        — Invalidate token
GET  /api/health        — Backend status + loaded models
GET  /api/models        — List all models
POST /api/predict       — Analyze .json or .csv file
GET  /api/predict/demo  — Demo prediction
```

## Input Format
Upload `.json` GNSS observation files with keys: `cn0_G1`, `doMes_G1`, `prMes_G1`, etc.
Or upload `.csv` with tabular features.

---

