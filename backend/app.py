# =============================================================================
# GNSS SHIELD — Flask Backend API v3.0
# Custom layers (ChannelAttention, SpatialAttention, SEBlock) defined here
# so CBAM and SE-Net models load correctly from .keras files.
# =============================================================================

import os, json, hashlib, secrets, warnings, logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS

import tensorflow as tf
import keras
import keras.saving

warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
tf.get_logger().setLevel('ERROR')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = secrets.token_hex(32)

# =============================================================================
# CUSTOM KERAS LAYERS — required for CBAM and SE-Net models
# =============================================================================

@keras.saving.register_keras_serializable()
class ChannelAttention(keras.layers.Layer):
    def __init__(self, ratio=8, **kwargs):
        super().__init__(**kwargs)
        self.ratio = ratio

    def build(self, input_shape):
        channels = input_shape[-1]
        self.shared_dense1 = keras.layers.Dense(channels // self.ratio, activation='relu',
                                                 use_bias=True, name='shared_dense1')
        self.shared_dense2 = keras.layers.Dense(channels, use_bias=True, name='shared_dense2')
        super().build(input_shape)

    def call(self, x):
        avg_pool = tf.reduce_mean(x, axis=1, keepdims=True)
        max_pool = tf.reduce_max(x, axis=1, keepdims=True)
        avg_out = self.shared_dense2(self.shared_dense1(avg_pool))
        max_out = self.shared_dense2(self.shared_dense1(max_pool))
        scale = tf.sigmoid(avg_out + max_out)
        return x * scale

    def get_config(self):
        cfg = super().get_config()
        cfg.update({'ratio': self.ratio})
        return cfg


@keras.saving.register_keras_serializable()
class SpatialAttention(keras.layers.Layer):
    def __init__(self, kernel_size=7, **kwargs):
        super().__init__(**kwargs)
        self.kernel_size = kernel_size

    def build(self, input_shape):
        self.conv = keras.layers.Conv1D(1, self.kernel_size, padding='same',
                                        activation='sigmoid', use_bias=True, name='conv')
        super().build(input_shape)

    def call(self, x):
        avg_pool = tf.reduce_mean(x, axis=-1, keepdims=True)
        max_pool = tf.reduce_max(x, axis=-1, keepdims=True)
        concat = tf.concat([avg_pool, max_pool], axis=-1)
        scale = self.conv(concat)
        return x * scale

    def get_config(self):
        cfg = super().get_config()
        cfg.update({'kernel_size': self.kernel_size})
        return cfg


@keras.saving.register_keras_serializable()
class SEBlock(keras.layers.Layer):
    def __init__(self, ratio=8, **kwargs):
        super().__init__(**kwargs)
        self.ratio = ratio

    def build(self, input_shape):
        channels = input_shape[-1]
        self.fc1 = keras.layers.Dense(max(1, channels // self.ratio), activation='relu',
                                      use_bias=True, name='fc1')
        self.fc2 = keras.layers.Dense(channels, activation='sigmoid', use_bias=True, name='fc2')
        super().build(input_shape)

    def call(self, x):
        squeezed = tf.reduce_mean(x, axis=1)
        excited = self.fc2(self.fc1(squeezed))
        scale = tf.expand_dims(excited, axis=1)
        return x * scale

    def get_config(self):
        cfg = super().get_config()
        cfg.update({'ratio': self.ratio})
        return cfg

# =============================================================================
# AUTHENTICATION
# =============================================================================

USERS = {
    'admin': {
        'password_hash': hashlib.sha256('gnss2024'.encode()).hexdigest(),
        'role': 'admin', 'name': 'Admin User'
    },
    'analyst': {
        'password_hash': hashlib.sha256('analyst123'.encode()).hexdigest(),
        'role': 'analyst', 'name': 'Signal Analyst'
    }
}
active_tokens = {}

def generate_token(username):
    token = secrets.token_urlsafe(32)
    active_tokens[token] = {'username': username, 'expires_at': datetime.now() + timedelta(hours=8)}
    return token

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Missing Authorization header'}), 401
        token = auth[7:]
        td = active_tokens.get(token)
        if not td:
            return jsonify({'error': 'Invalid token'}), 401
        if datetime.now() > td['expires_at']:
            del active_tokens[token]
            return jsonify({'error': 'Token expired'}), 401
        request.current_user = td['username']
        return f(*args, **kwargs)
    return decorated

# =============================================================================
# MODEL CONFIG — filenames match exactly what's in models/ folder
# =============================================================================

MODEL_DIR   = os.path.join(os.path.dirname(__file__), 'models')
UPLOAD_DIR  = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

MODEL_CONFIG = {
    'cnn': {
        'filename':   'cnn_baseline.keras',
        'name':       'CNN Baseline',
        'input_type': 'cnn',          # (N, 144, 1)
    },
    'cnn_lstm': {
        'filename':   'cnn_lstm_hybrid.keras',
        'name':       'CNN-LSTM Hybrid',
        'input_type': 'lstm',         # (N, 6, 24)
    },
    'autoencoder': {
        'filename':   'autoencoder_model.keras',
        'name':       'Autoencoder',
        'input_type': 'flat',         # (N, 144)
    },
    'cbam': {
        'filename':   'Attention_CNN_CBAM.keras',
        'name':       'Attention-CNN (CBAM)',
        'input_type': 'cnn',          # (N, 144, 1)
    },
    'senet': {
        'filename':   'senet_cnn.keras',
        'name':       'SE-Net CNN',
        'input_type': 'cnn',          # (N, 144, 1)
    },
}

loaded_models = {}

def load_model(model_key):
    if model_key in loaded_models:
        return loaded_models[model_key]
    cfg = MODEL_CONFIG.get(model_key)
    if not cfg:
        return None
    path = os.path.join(MODEL_DIR, cfg['filename'])
    if not os.path.exists(path):
        logger.warning(f"Model file not found: {path}")
        return None
    try:
        custom_objects = {
            'ChannelAttention': ChannelAttention,
            'SpatialAttention': SpatialAttention,
            'SEBlock':           SEBlock,
        }
        model = keras.models.load_model(path, custom_objects=custom_objects, compile=False)
        loaded_models[model_key] = model
        logger.info(f"Loaded model: {model_key}  input={model.input_shape}")
        return model
    except Exception as e:
        logger.error(f"Error loading {model_key}: {e}")
        return None

def load_all_models():
    for key in MODEL_CONFIG:
        m = load_model(key)
        status = "OK" if m else "FAILED"
        print(f"  [{status}] {MODEL_CONFIG[key]['filename']}")

# =============================================================================
# FEATURE EXTRACTION
# =============================================================================

from scipy.fft import fft
import pywt

def _safe_signal(signal):
    return np.nan_to_num(np.array(signal, dtype=float), nan=0.0, posinf=0.0, neginf=0.0)

def extract_fft_features(signal, n_features=5):
    signal = _safe_signal(signal)
    out = {}
    if len(signal) < 2 or np.all(signal == 0):
        for i in range(n_features):
            out[f'fft_mag_{i}'] = 0
        out.update({'fft_mean': 0, 'fft_std': 0, 'fft_max': 0, 'fft_energy': 0})
        return out
    try:
        mag = np.abs(fft(signal))[:len(signal)//2]
        mx = np.max(mag)
        if mx > 0: mag = mag / mx
        for i in range(n_features):
            out[f'fft_mag_{i}'] = float(mag[i]) if i < len(mag) else 0
        out.update({'fft_mean': float(np.mean(mag)), 'fft_std': float(np.std(mag)),
                    'fft_max': float(np.max(mag)), 'fft_energy': float(np.sum(mag**2))})
    except Exception:
        for i in range(n_features):
            out[f'fft_mag_{i}'] = 0
        out.update({'fft_mean': 0, 'fft_std': 0, 'fft_max': 0, 'fft_energy': 0})
    return out

def extract_wavelet_features(signal, wavelet='db4', level=2):
    signal = _safe_signal(signal)
    out = {}
    if len(signal) < 2**level or np.all(signal == 0):
        for i in range(level+1):
            out.update({f'wavelet_energy_{i}': 0, f'wavelet_mean_{i}': 0, f'wavelet_std_{i}': 0})
        out.update({'wavelet_total_energy': 0, 'wavelet_entropy': 0})
        return out
    try:
        coeffs = pywt.wavedec(signal, wavelet, level=level)
        for i, c in enumerate(coeffs):
            out.update({f'wavelet_energy_{i}': float(np.sum(c**2)),
                        f'wavelet_mean_{i}':   float(np.mean(np.abs(c))),
                        f'wavelet_std_{i}':    float(np.std(c))})
        all_c = np.concatenate(coeffs)
        out['wavelet_total_energy'] = float(np.sum(all_c**2))
        sq = all_c**2; sq = sq[sq > 0]
        out['wavelet_entropy'] = float(-np.sum(sq * np.log(sq + 1e-10))) if len(sq) else 0
    except Exception:
        for i in range(level+1):
            out.update({f'wavelet_energy_{i}': 0, f'wavelet_mean_{i}': 0, f'wavelet_std_{i}': 0})
        out.update({'wavelet_total_energy': 0, 'wavelet_entropy': 0})
    return out

def extract_features_from_json(data):
    key_list = [
        'cn0_G1','cn0_G2','cn0_E1','cn0_E2','cn0_B1','cn0_B2',
        'doMes_G1','doMes_G2','doMes_E1','doMes_E2','doMes_B1','doMes_B2',
        'prMes_G1','prMes_G2','prMes_E1','prMes_E2','prMes_B1','prMes_B2',
    ]
    n = len(data.get('recordTime', next((v for v in data.values() if isinstance(v, list)), [])))
    if not n:
        return None
    rows = []
    for i in range(n):
        row = {}
        for k in key_list:
            if k not in data:
                continue
            val = data[k][i] if i < len(data[k]) else 0
            if isinstance(val, list):
                valid = [v for v in val if v is not None and v != 0]
                row[f'{k}_mean'] = float(np.mean(valid)) if valid else 0
                row[f'{k}_std']  = float(np.std(valid))  if valid else 0
                row[f'{k}_min']  = float(np.min(valid))  if valid else 0
                row[f'{k}_max']  = float(np.max(valid))  if valid else 0
            else:
                row[f'{k}_mean'] = float(val) if val is not None else 0
        rows.append(row)
    return pd.DataFrame(rows)

def create_windowed_features(df, window_size=32, stride=16):
    sig_cols = [c for c in ['cn0_G1_mean','doMes_G1_mean','prMes_G1_mean',
                             'cn0_G2_mean','doMes_G2_mean','prMes_G2_mean'] if c in df.columns]
    if not sig_cols:
        sig_cols = [c for c in df.columns if '_mean' in c][:3]
    if not sig_cols or len(df) < 2:
        return df

    all_rows = []
    for col in sig_cols:
        sig = df[col].values
        sig = _safe_signal(sig)
        starts = range(0, max(1, len(sig) - window_size + 1), stride)
        for s in starts:
            win = sig[s:s+window_size]
            if len(win) < window_size:
                win = np.pad(win, (0, window_size - len(win)))
            row = {}
            row.update({f'{col}_w_{k}': v for k, v in extract_fft_features(win).items()})
            row.update({f'{col}_wv_{k}': v for k, v in extract_wavelet_features(win).items()})
            # Statistical features
            row.update({
                f'{col}_stat_mean': float(np.mean(win)),
                f'{col}_stat_std':  float(np.std(win)),
                f'{col}_stat_min':  float(np.min(win)),
                f'{col}_stat_max':  float(np.max(win)),
                f'{col}_stat_kurt': float(np.mean((win - np.mean(win))**4) / (np.std(win)**4 + 1e-10)),
            })
            all_rows.append(row)
    if not all_rows:
        return df
    return pd.DataFrame(all_rows)

def preprocess_for_model(df, model_key, expected_features=None):
    df = df.fillna(0).replace([np.inf, -np.inf], 0)
    X = df.values.astype(np.float32)

    if expected_features is not None and X.shape[1] != expected_features:
        if X.shape[1] > expected_features:
            X = X[:, :expected_features]
        else:
            X = np.pad(X, ((0,0),(0, expected_features - X.shape[1])))

    # Normalise per feature
    mean = X.mean(axis=0, keepdims=True)
    std  = X.std(axis=0, keepdims=True) + 1e-8
    X = (X - mean) / std

    n = X.shape[0]
    itype = MODEL_CONFIG[model_key]['input_type']

    if itype == 'cnn':       # (N, 144, 1)
        target = 144
        if X.shape[1] > target:
            X = X[:, :target]
        elif X.shape[1] < target:
            X = np.pad(X, ((0,0),(0, target - X.shape[1])))
        X = X.reshape(n, target, 1)

    elif itype == 'lstm':    # (N, 6, 24)
        target = 144
        if X.shape[1] > target:
            X = X[:, :target]
        elif X.shape[1] < target:
            X = np.pad(X, ((0,0),(0, target - X.shape[1])))
        X = X.reshape(n, 6, 24)

    elif itype == 'flat':    # (N, 144)
        target = 144
        if X.shape[1] > target:
            X = X[:, :target]
        elif X.shape[1] < target:
            X = np.pad(X, ((0,0),(0, target - X.shape[1])))

    return X

def predict_with_model(model, X, model_key):
    try:
        if model_key == 'autoencoder':
            recon = model.predict(X, verbose=0)
            mse = np.mean((X - recon)**2, axis=1)
            thresh = np.percentile(mse, 50)
            preds = (mse < thresh).astype(int)
            conf  = np.clip(1 - (mse / (np.max(mse) + 1e-10)), 0, 1)
        else:
            probs = model.predict(X, verbose=0).flatten()
            preds = (probs > 0.5).astype(int)
            conf  = np.where(preds == 0, 1 - probs, probs)
        return preds, conf
    except Exception as e:
        logger.error(f"Predict error: {e}")
        return None, None

# =============================================================================
# ROUTES
# =============================================================================

@app.route('/', methods=['GET'])
def home():
    return jsonify({'service': 'GNSS Shield API', 'version': '3.0'})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    uname = data.get('username','').strip().lower()
    pw    = data.get('password','')
    if not uname or not pw:
        return jsonify({'error': 'Username and password required'}), 400
    user = USERS.get(uname)
    if not user or hashlib.sha256(pw.encode()).hexdigest() != user['password_hash']:
        return jsonify({'error': 'Invalid credentials'}), 401
    token = generate_token(uname)
    logger.info(f"Login: {uname}")
    return jsonify({'token': token, 'user': {'username': uname, 'name': user['name'], 'role': user['role']}})

@app.route('/api/logout', methods=['POST'])
@require_auth
def logout():
    token = request.headers['Authorization'][7:]
    active_tokens.pop(token, None)
    return jsonify({'message': 'Logged out'})

@app.route('/api/health', methods=['GET'])
@require_auth
def health():
    return jsonify({
        'status': 'healthy',
        'models_loaded': len(loaded_models),
        'available_models': list(loaded_models.keys()),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/models', methods=['GET'])
@require_auth
def get_models():
    info = []
    for key, cfg in MODEL_CONFIG.items():
        path = os.path.join(MODEL_DIR, cfg['filename'])
        info.append({
            'id': key, 'name': cfg['name'],
            'filename': cfg['filename'],
            'loaded': key in loaded_models,
            'available': os.path.exists(path)
        })
    return jsonify({'models': info, 'total': len(info), 'loaded': len(loaded_models)})

@app.route('/api/predict', methods=['POST'])
@require_auth
def predict():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        file      = request.files['file']
        model_key = request.form.get('model', 'cbam')

        model = load_model(model_key)
        if model is None:
            return jsonify({'error': f'Model {model_key} not available'}), 400

        fname = file.filename.lower()
        if fname.endswith('.json'):
            raw = json.load(file)
            df  = extract_features_from_json(raw)
        elif fname.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            return jsonify({'error': 'Unsupported format — use .json or .csv'}), 400

        if df is None or len(df) == 0:
            return jsonify({'error': 'Could not extract features'}), 400

        windowed = create_windowed_features(df)
        itype    = MODEL_CONFIG[model_key]['input_type']
        exp_feat = 144

        X = preprocess_for_model(windowed, model_key, exp_feat)
        preds, conf = predict_with_model(model, X, model_key)
        if preds is None:
            return jsonify({'error': 'Prediction failed'}), 500

        n         = len(preds)
        n_attack  = int(np.sum(preds == 0))
        n_clean   = int(np.sum(preds == 1))
        ratio     = n_attack / n if n else 0
        spoofed   = ratio > 0.3
        avg_conf  = float(np.mean(conf)) * 100

        return jsonify({
            'status':    'SPOOFING DETECTED' if spoofed else 'SIGNAL CLEAN',
            'isSpoofed': spoofed,
            'confidence': round(avg_conf, 2),
            'model':     MODEL_CONFIG[model_key]['name'],
            'details': {
                'samplesAnalyzed': n,
                'attackSamples':   n_attack,
                'cleanSamples':    n_clean,
                'attackRatio':     round(ratio * 100, 2),
                'timestamp':       datetime.now().isoformat(),
                'filename':        file.filename,
            }
        })
    except Exception as e:
        logger.error(f"Predict error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict/demo', methods=['GET'])
@require_auth
def predict_demo():
    model_key = request.args.get('model', 'cbam')
    spoofed   = np.random.random() > 0.7
    conf      = round(np.random.uniform(85, 99), 2)
    return jsonify({
        'status':    'SPOOFING DETECTED' if spoofed else 'SIGNAL CLEAN',
        'isSpoofed': spoofed,
        'confidence': conf,
        'model':     MODEL_CONFIG.get(model_key, {}).get('name', 'Unknown'),
        'details': {
            'samplesAnalyzed': np.random.randint(1000, 5000),
            'attackSamples':   np.random.randint(10, 100) if spoofed else np.random.randint(0, 5),
            'cleanSamples':    np.random.randint(900, 4900),
            'attackRatio':     round(np.random.uniform(0,50) if spoofed else np.random.uniform(0,5), 2),
            'timestamp':       datetime.now().isoformat(),
            'filename':        'demo_data.json',
            'isDemo':          True
        }
    })

# =============================================================================
# STARTUP
# =============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("  GNSS SHIELD — Backend API v3.0")
    print("=" * 60)
    print(f"Model directory: {MODEL_DIR}\n")
    load_all_models()
    print("\nServer starting at http://localhost:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=False)
