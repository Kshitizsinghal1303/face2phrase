"""
Acoustic analysis module for Face2Phrase
Extracts acoustic features from audio files for visualization
"""

import librosa
import numpy as np
import json
from pathlib import Path
from typing import Dict, List, Any, Tuple
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import io
import base64

def extract_acoustic_features(audio_path: str) -> Dict[str, Any]:
    """
    Extract comprehensive acoustic features from audio file
    Returns features suitable for visualization
    """
    try:
        # Load audio file
        y, sr = librosa.load(audio_path, sr=None)
        
        # Time axis
        duration = len(y) / sr
        time_frames = np.linspace(0, duration, len(y))
        
        # 1. Fundamental Frequency (Pitch)
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr, threshold=0.1)
        pitch_values = []
        for t in range(pitches.shape[1]):
            index = magnitudes[:, t].argmax()
            pitch = pitches[index, t]
            pitch_values.append(pitch if pitch > 0 else 0)
        
        # 2. Energy/RMS
        rms = librosa.feature.rms(y=y)[0]
        
        # 3. Zero Crossing Rate
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        
        # 4. Spectral Centroid
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        
        # 5. Spectral Rolloff
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        
        # 6. MFCC (first 13 coefficients)
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        
        # 7. Chroma features
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        
        # 8. Spectral Contrast
        spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        
        # Create time axis for frame-based features
        hop_length = 512
        frame_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
        
        # Prepare data for visualization
        features = {
            "duration": float(duration),
            "sample_rate": int(sr),
            "time_series": {
                "time": time_frames[::100].tolist(),  # Downsample for visualization
                "amplitude": y[::100].tolist()
            },
            "pitch": {
                "time": frame_times[:len(pitch_values)].tolist(),
                "values": pitch_values,
                "mean": float(np.mean([p for p in pitch_values if p > 0])) if any(p > 0 for p in pitch_values) else 0,
                "std": float(np.std([p for p in pitch_values if p > 0])) if any(p > 0 for p in pitch_values) else 0
            },
            "energy": {
                "time": frame_times.tolist(),
                "rms": rms.tolist(),
                "mean": float(np.mean(rms)),
                "std": float(np.std(rms))
            },
            "spectral": {
                "time": frame_times.tolist(),
                "centroid": spectral_centroid.tolist(),
                "rolloff": spectral_rolloff.tolist(),
                "zcr": zcr.tolist()
            },
            "mfcc": {
                "time": frame_times.tolist(),
                "coefficients": mfccs.tolist(),
                "mean": np.mean(mfccs, axis=1).tolist(),
                "std": np.std(mfccs, axis=1).tolist()
            },
            "chroma": {
                "time": frame_times.tolist(),
                "features": chroma.tolist(),
                "mean": np.mean(chroma, axis=1).tolist()
            },
            "spectral_contrast": {
                "time": frame_times.tolist(),
                "features": spectral_contrast.tolist(),
                "mean": np.mean(spectral_contrast, axis=1).tolist()
            }
        }
        
        return features
        
    except Exception as e:
        print(f"Error extracting acoustic features: {str(e)}")
        return {
            "error": str(e),
            "duration": 0,
            "sample_rate": 0
        }

def generate_acoustic_visualization(features: Dict[str, Any]) -> str:
    """
    Generate a comprehensive acoustic visualization plot
    Returns base64 encoded PNG image
    """
    try:
        if "error" in features:
            return ""
        
        # Create figure with subplots
        fig, axes = plt.subplots(3, 2, figsize=(15, 12))
        fig.suptitle('Acoustic Analysis', fontsize=16, fontweight='bold')
        
        # 1. Waveform
        if "time_series" in features:
            axes[0, 0].plot(features["time_series"]["time"], features["time_series"]["amplitude"])
            axes[0, 0].set_title('Waveform')
            axes[0, 0].set_xlabel('Time (s)')
            axes[0, 0].set_ylabel('Amplitude')
            axes[0, 0].grid(True, alpha=0.3)
        
        # 2. Pitch
        if "pitch" in features and features["pitch"]["values"]:
            pitch_values = [p if p > 0 else np.nan for p in features["pitch"]["values"]]
            axes[0, 1].plot(features["pitch"]["time"], pitch_values, 'b-', linewidth=1)
            axes[0, 1].set_title(f'Pitch (Mean: {features["pitch"]["mean"]:.1f} Hz)')
            axes[0, 1].set_xlabel('Time (s)')
            axes[0, 1].set_ylabel('Frequency (Hz)')
            axes[0, 1].grid(True, alpha=0.3)
        
        # 3. Energy (RMS)
        if "energy" in features:
            axes[1, 0].plot(features["energy"]["time"], features["energy"]["rms"], 'r-', linewidth=1)
            axes[1, 0].set_title(f'Energy (RMS) - Mean: {features["energy"]["mean"]:.3f}')
            axes[1, 0].set_xlabel('Time (s)')
            axes[1, 0].set_ylabel('RMS Energy')
            axes[1, 0].grid(True, alpha=0.3)
        
        # 4. Spectral Centroid
        if "spectral" in features:
            axes[1, 1].plot(features["spectral"]["time"], features["spectral"]["centroid"], 'g-', linewidth=1)
            axes[1, 1].set_title('Spectral Centroid')
            axes[1, 1].set_xlabel('Time (s)')
            axes[1, 1].set_ylabel('Frequency (Hz)')
            axes[1, 1].grid(True, alpha=0.3)
        
        # 5. MFCC Heatmap
        if "mfcc" in features:
            mfcc_data = np.array(features["mfcc"]["coefficients"])
            im = axes[2, 0].imshow(mfcc_data, aspect='auto', origin='lower', cmap='viridis')
            axes[2, 0].set_title('MFCC Features')
            axes[2, 0].set_xlabel('Time Frames')
            axes[2, 0].set_ylabel('MFCC Coefficients')
            plt.colorbar(im, ax=axes[2, 0])
        
        # 6. Chroma Features
        if "chroma" in features:
            chroma_data = np.array(features["chroma"]["features"])
            im = axes[2, 1].imshow(chroma_data, aspect='auto', origin='lower', cmap='plasma')
            axes[2, 1].set_title('Chroma Features')
            axes[2, 1].set_xlabel('Time Frames')
            axes[2, 1].set_ylabel('Chroma')
            plt.colorbar(im, ax=axes[2, 1])
        
        plt.tight_layout()
        
        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return image_base64
        
    except Exception as e:
        print(f"Error generating visualization: {str(e)}")
        return ""

def save_acoustic_features(session_id: str, question_index: int, features: Dict[str, Any]) -> Path:
    """Save acoustic features to JSON file"""
    session_dir = Path("interview_data") / session_id
    features_dir = session_dir / "acoustic_features"
    features_dir.mkdir(exist_ok=True)
    
    features_file = features_dir / f"question_{question_index + 1}_features.json"
    
    with open(features_file, 'w') as f:
        json.dump(features, f, indent=2)
    
    return features_file

def load_acoustic_features(session_id: str, question_index: int) -> Dict[str, Any]:
    """Load acoustic features from JSON file"""
    session_dir = Path("interview_data") / session_id
    features_file = session_dir / "acoustic_features" / f"question_{question_index + 1}_features.json"
    
    if not features_file.exists():
        return {}
    
    try:
        with open(features_file, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {}

def get_acoustic_summary(features: Dict[str, Any]) -> Dict[str, Any]:
    """Generate summary statistics from acoustic features"""
    if "error" in features:
        return {"error": features["error"]}
    
    summary = {
        "duration": features.get("duration", 0),
        "pitch_stats": {
            "mean_pitch": features.get("pitch", {}).get("mean", 0),
            "pitch_variation": features.get("pitch", {}).get("std", 0)
        },
        "energy_stats": {
            "mean_energy": features.get("energy", {}).get("mean", 0),
            "energy_variation": features.get("energy", {}).get("std", 0)
        },
        "spectral_stats": {
            "mean_centroid": np.mean(features.get("spectral", {}).get("centroid", [0])),
            "mean_rolloff": np.mean(features.get("spectral", {}).get("rolloff", [0]))
        },
        "voice_quality": {
            "pitch_stability": "stable" if features.get("pitch", {}).get("std", 0) < 50 else "variable",
            "energy_consistency": "consistent" if features.get("energy", {}).get("std", 0) < 0.1 else "variable"
        }
    }
    
    return summary