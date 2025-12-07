"""
Advanced Speech Analysis Module
Extracts acoustic features and generates interactive visualizations
"""

import librosa
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import soundfile as sf
from scipy import signal
from scipy.stats import zscore
import parselmouth
from parselmouth.praat import call
import json
import base64
from io import BytesIO
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')


class SpeechAnalyzer:
    """Advanced speech analysis with acoustic feature extraction and visualization"""
    
    def __init__(self, sample_rate: int = 22050):
        self.sample_rate = sample_rate
        self.features = {}
        
    def load_audio(self, audio_path: str) -> Tuple[np.ndarray, int]:
        """Load audio file and return audio data and sample rate"""
        try:
            audio, sr = librosa.load(audio_path, sr=self.sample_rate)
            return audio, sr
        except Exception as e:
            raise Exception(f"Error loading audio: {str(e)}")
    
    def extract_pitch_features(self, audio: np.ndarray, sr: int) -> Dict:
        """Extract pitch-related features using Parselmouth (Praat)"""
        try:
            # Convert to Parselmouth Sound object
            sound = parselmouth.Sound(audio, sampling_frequency=sr)
            
            # Extract pitch
            pitch = call(sound, "To Pitch", 0.0, 75, 600)  # f0 range: 75-600 Hz
            pitch_values = call(pitch, "List values", "Hertz")
            pitch_values = [p for p in pitch_values if p != 0]  # Remove unvoiced frames
            
            if not pitch_values:
                return {
                    'mean_pitch': 0,
                    'std_pitch': 0,
                    'min_pitch': 0,
                    'max_pitch': 0,
                    'pitch_range': 0,
                    'pitch_values': [],
                    'time_stamps': []
                }
            
            # Time stamps for pitch values
            pitch_times = np.linspace(0, len(audio)/sr, len(pitch_values))
            
            return {
                'mean_pitch': np.mean(pitch_values),
                'std_pitch': np.std(pitch_values),
                'min_pitch': np.min(pitch_values),
                'max_pitch': np.max(pitch_values),
                'pitch_range': np.max(pitch_values) - np.min(pitch_values),
                'pitch_values': pitch_values,
                'time_stamps': pitch_times.tolist()
            }
        except Exception as e:
            print(f"Error extracting pitch: {str(e)}")
            return {
                'mean_pitch': 0,
                'std_pitch': 0,
                'min_pitch': 0,
                'max_pitch': 0,
                'pitch_range': 0,
                'pitch_values': [],
                'time_stamps': []
            }
    
    def extract_spectral_features(self, audio: np.ndarray, sr: int) -> Dict:
        """Extract frequency spectrum and spectral features"""
        try:
            # Compute STFT
            stft = librosa.stft(audio, hop_length=512, n_fft=2048)
            magnitude = np.abs(stft)
            
            # Frequency bins
            freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
            times = librosa.frames_to_time(np.arange(magnitude.shape[1]), sr=sr, hop_length=512)
            
            # Spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=audio, sr=sr)[0]
            spectral_rolloff = librosa.feature.spectral_rolloff(y=audio, sr=sr)[0]
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=audio, sr=sr)[0]
            zero_crossing_rate = librosa.feature.zero_crossing_rate(audio)[0]
            
            # MFCCs
            mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
            
            return {
                'spectral_centroid': {
                    'values': spectral_centroids.tolist(),
                    'mean': np.mean(spectral_centroids),
                    'std': np.std(spectral_centroids)
                },
                'spectral_rolloff': {
                    'values': spectral_rolloff.tolist(),
                    'mean': np.mean(spectral_rolloff),
                    'std': np.std(spectral_rolloff)
                },
                'spectral_bandwidth': {
                    'values': spectral_bandwidth.tolist(),
                    'mean': np.mean(spectral_bandwidth),
                    'std': np.std(spectral_bandwidth)
                },
                'zero_crossing_rate': {
                    'values': zero_crossing_rate.tolist(),
                    'mean': np.mean(zero_crossing_rate),
                    'std': np.std(zero_crossing_rate)
                },
                'mfccs': mfccs.tolist(),
                'spectrogram': {
                    'magnitude': magnitude.tolist(),
                    'frequencies': freqs.tolist(),
                    'times': times.tolist()
                }
            }
        except Exception as e:
            print(f"Error extracting spectral features: {str(e)}")
            return {}
    
    def extract_energy_features(self, audio: np.ndarray, sr: int) -> Dict:
        """Extract energy and intensity features"""
        try:
            # RMS Energy
            rms_energy = librosa.feature.rms(y=audio, frame_length=2048, hop_length=512)[0]
            
            # Short-time energy
            frame_length = int(0.025 * sr)  # 25ms frames
            hop_length = int(0.010 * sr)    # 10ms hop
            
            frames = librosa.util.frame(audio, frame_length=frame_length, hop_length=hop_length)
            energy = np.sum(frames ** 2, axis=0)
            
            # Intensity (dB)
            intensity_db = 20 * np.log10(rms_energy + 1e-8)
            
            # Time stamps
            time_frames = librosa.frames_to_time(np.arange(len(rms_energy)), sr=sr, hop_length=512)
            
            return {
                'rms_energy': {
                    'values': rms_energy.tolist(),
                    'mean': np.mean(rms_energy),
                    'std': np.std(rms_energy),
                    'max': np.max(rms_energy),
                    'min': np.min(rms_energy)
                },
                'short_time_energy': {
                    'values': energy.tolist(),
                    'mean': np.mean(energy),
                    'std': np.std(energy)
                },
                'intensity_db': {
                    'values': intensity_db.tolist(),
                    'mean': np.mean(intensity_db),
                    'std': np.std(intensity_db)
                },
                'time_frames': time_frames.tolist()
            }
        except Exception as e:
            print(f"Error extracting energy features: {str(e)}")
            return {}
    
    def extract_speech_rate(self, audio: np.ndarray, sr: int) -> Dict:
        """Extract speech rate and rhythm features"""
        try:
            # Voice Activity Detection using energy threshold
            frame_length = int(0.025 * sr)
            hop_length = int(0.010 * sr)
            
            frames = librosa.util.frame(audio, frame_length=frame_length, hop_length=hop_length)
            energy = np.sum(frames ** 2, axis=0)
            
            # Threshold for voice activity (adaptive)
            threshold = np.mean(energy) * 0.1
            voice_activity = energy > threshold
            
            # Calculate speech segments
            voice_segments = []
            in_speech = False
            start_frame = 0
            
            for i, is_voice in enumerate(voice_activity):
                if is_voice and not in_speech:
                    start_frame = i
                    in_speech = True
                elif not is_voice and in_speech:
                    voice_segments.append((start_frame, i))
                    in_speech = False
            
            if in_speech:
                voice_segments.append((start_frame, len(voice_activity)))
            
            # Calculate speech rate
            total_speech_time = sum((end - start) * hop_length / sr for start, end in voice_segments)
            total_duration = len(audio) / sr
            speech_rate = total_speech_time / total_duration if total_duration > 0 else 0
            
            # Syllable estimation (rough approximation using peaks in energy)
            if len(voice_segments) > 0:
                speech_energy = energy[voice_activity]
                if len(speech_energy) > 0:
                    peaks, _ = signal.find_peaks(speech_energy, height=np.mean(speech_energy))
                    syllable_rate = len(peaks) / total_speech_time if total_speech_time > 0 else 0
                else:
                    syllable_rate = 0
            else:
                syllable_rate = 0
            
            return {
                'speech_rate': speech_rate,
                'syllable_rate': syllable_rate,
                'total_speech_time': total_speech_time,
                'total_duration': total_duration,
                'voice_activity': voice_activity.tolist(),
                'voice_segments': voice_segments,
                'speaking_time_ratio': speech_rate
            }
        except Exception as e:
            print(f"Error extracting speech rate: {str(e)}")
            return {}
    
    def analyze_audio(self, audio_path: str) -> Dict:
        """Complete audio analysis pipeline"""
        try:
            # Load audio
            audio, sr = self.load_audio(audio_path)
            
            # Extract all features
            pitch_features = self.extract_pitch_features(audio, sr)
            spectral_features = self.extract_spectral_features(audio, sr)
            energy_features = self.extract_energy_features(audio, sr)
            speech_rate_features = self.extract_speech_rate(audio, sr)
            
            # Combine all features
            analysis_results = {
                'audio_info': {
                    'duration': len(audio) / sr,
                    'sample_rate': sr,
                    'total_samples': len(audio)
                },
                'pitch': pitch_features,
                'spectral': spectral_features,
                'energy': energy_features,
                'speech_rate': speech_rate_features,
                'analysis_timestamp': pd.Timestamp.now().isoformat()
            }
            
            return analysis_results
            
        except Exception as e:
            raise Exception(f"Error in audio analysis: {str(e)}")
    
    def create_interactive_visualization(self, analysis_results: Dict) -> str:
        """Create interactive Plotly visualization of speech features"""
        try:
            # Create subplots
            fig = make_subplots(
                rows=4, cols=2,
                subplot_titles=[
                    'Pitch Contour', 'Energy (RMS)',
                    'Spectral Centroid', 'Spectral Rolloff',
                    'Intensity (dB)', 'Voice Activity',
                    'Spectrogram', 'Feature Summary'
                ],
                specs=[
                    [{"secondary_y": False}, {"secondary_y": False}],
                    [{"secondary_y": False}, {"secondary_y": False}],
                    [{"secondary_y": False}, {"secondary_y": False}],
                    [{"type": "heatmap"}, {"type": "bar"}]
                ],
                vertical_spacing=0.08,
                horizontal_spacing=0.1
            )
            
            # Pitch contour
            if analysis_results['pitch']['pitch_values']:
                fig.add_trace(
                    go.Scatter(
                        x=analysis_results['pitch']['time_stamps'],
                        y=analysis_results['pitch']['pitch_values'],
                        mode='lines',
                        name='Pitch (Hz)',
                        line=dict(color='blue', width=2)
                    ),
                    row=1, col=1
                )
            
            # Energy (RMS)
            if analysis_results['energy']['time_frames']:
                fig.add_trace(
                    go.Scatter(
                        x=analysis_results['energy']['time_frames'],
                        y=analysis_results['energy']['rms_energy']['values'],
                        mode='lines',
                        name='RMS Energy',
                        line=dict(color='red', width=2)
                    ),
                    row=1, col=2
                )
            
            # Spectral Centroid
            if 'spectral_centroid' in analysis_results['spectral']:
                time_spectral = np.linspace(0, analysis_results['audio_info']['duration'], 
                                          len(analysis_results['spectral']['spectral_centroid']['values']))
                fig.add_trace(
                    go.Scatter(
                        x=time_spectral,
                        y=analysis_results['spectral']['spectral_centroid']['values'],
                        mode='lines',
                        name='Spectral Centroid',
                        line=dict(color='green', width=2)
                    ),
                    row=2, col=1
                )
            
            # Spectral Rolloff
            if 'spectral_rolloff' in analysis_results['spectral']:
                fig.add_trace(
                    go.Scatter(
                        x=time_spectral,
                        y=analysis_results['spectral']['spectral_rolloff']['values'],
                        mode='lines',
                        name='Spectral Rolloff',
                        line=dict(color='orange', width=2)
                    ),
                    row=2, col=2
                )
            
            # Intensity
            if analysis_results['energy']['time_frames']:
                fig.add_trace(
                    go.Scatter(
                        x=analysis_results['energy']['time_frames'],
                        y=analysis_results['energy']['intensity_db']['values'],
                        mode='lines',
                        name='Intensity (dB)',
                        line=dict(color='purple', width=2)
                    ),
                    row=3, col=1
                )
            
            # Voice Activity
            if 'voice_activity' in analysis_results['speech_rate']:
                voice_time = np.linspace(0, analysis_results['audio_info']['duration'], 
                                       len(analysis_results['speech_rate']['voice_activity']))
                fig.add_trace(
                    go.Scatter(
                        x=voice_time,
                        y=analysis_results['speech_rate']['voice_activity'],
                        mode='lines',
                        name='Voice Activity',
                        line=dict(color='brown', width=2),
                        fill='tonexty'
                    ),
                    row=3, col=2
                )
            
            # Spectrogram (simplified)
            if 'spectrogram' in analysis_results['spectral']:
                spec_data = np.array(analysis_results['spectral']['spectrogram']['magnitude'])
                if spec_data.size > 0:
                    # Downsample for visualization
                    spec_data_small = spec_data[::10, ::10]  # Take every 10th point
                    fig.add_trace(
                        go.Heatmap(
                            z=20 * np.log10(spec_data_small + 1e-8),
                            colorscale='Viridis',
                            name='Spectrogram'
                        ),
                        row=4, col=1
                    )
            
            # Feature Summary
            feature_names = ['Mean Pitch', 'Pitch Range', 'Mean Energy', 'Speech Rate', 'Spectral Centroid']
            feature_values = [
                analysis_results['pitch']['mean_pitch'],
                analysis_results['pitch']['pitch_range'],
                analysis_results['energy']['rms_energy']['mean'],
                analysis_results['speech_rate']['speech_rate'],
                analysis_results['spectral']['spectral_centroid']['mean'] if 'spectral_centroid' in analysis_results['spectral'] else 0
            ]
            
            fig.add_trace(
                go.Bar(
                    x=feature_names,
                    y=feature_values,
                    name='Feature Summary',
                    marker_color=['blue', 'lightblue', 'red', 'green', 'orange']
                ),
                row=4, col=2
            )
            
            # Update layout
            fig.update_layout(
                height=1200,
                title_text="Advanced Speech Analysis Dashboard",
                title_x=0.5,
                showlegend=False,
                font=dict(size=10)
            )
            
            # Update axes labels
            fig.update_xaxes(title_text="Time (s)", row=1, col=1)
            fig.update_yaxes(title_text="Frequency (Hz)", row=1, col=1)
            fig.update_xaxes(title_text="Time (s)", row=1, col=2)
            fig.update_yaxes(title_text="Energy", row=1, col=2)
            
            # Convert to JSON for frontend
            return fig.to_json()
            
        except Exception as e:
            print(f"Error creating visualization: {str(e)}")
            return "{}"
    
    def generate_speech_report(self, analysis_results: Dict) -> Dict:
        """Generate a comprehensive speech analysis report"""
        try:
            report = {
                'summary': {
                    'duration': analysis_results['audio_info']['duration'],
                    'overall_quality': 'Good',  # This could be calculated based on features
                },
                'pitch_analysis': {
                    'mean_pitch': round(analysis_results['pitch']['mean_pitch'], 2),
                    'pitch_range': round(analysis_results['pitch']['pitch_range'], 2),
                    'pitch_stability': 'Stable' if analysis_results['pitch']['std_pitch'] < 50 else 'Variable'
                },
                'energy_analysis': {
                    'mean_energy': round(analysis_results['energy']['rms_energy']['mean'], 4),
                    'energy_variation': round(analysis_results['energy']['rms_energy']['std'], 4),
                    'volume_consistency': 'Consistent' if analysis_results['energy']['rms_energy']['std'] < 0.1 else 'Variable'
                },
                'speech_timing': {
                    'speech_rate': round(analysis_results['speech_rate']['speech_rate'], 2),
                    'speaking_time_ratio': round(analysis_results['speech_rate']['speaking_time_ratio'], 2),
                    'pace_assessment': 'Normal' if 0.6 <= analysis_results['speech_rate']['speech_rate'] <= 0.8 else 'Fast' if analysis_results['speech_rate']['speech_rate'] > 0.8 else 'Slow'
                },
                'spectral_analysis': {
                    'voice_clarity': 'Clear' if 'spectral_centroid' in analysis_results['spectral'] and analysis_results['spectral']['spectral_centroid']['mean'] > 1000 else 'Muffled',
                    'frequency_range': 'Good' if 'spectral_rolloff' in analysis_results['spectral'] else 'Limited'
                },
                'recommendations': []
            }
            
            # Generate recommendations based on analysis
            if analysis_results['pitch']['std_pitch'] > 100:
                report['recommendations'].append("Consider working on pitch stability for more consistent delivery")
            
            if analysis_results['speech_rate']['speech_rate'] < 0.5:
                report['recommendations'].append("Try to increase speaking pace for better engagement")
            elif analysis_results['speech_rate']['speech_rate'] > 0.9:
                report['recommendations'].append("Consider slowing down speech for better clarity")
            
            if analysis_results['energy']['rms_energy']['std'] > 0.15:
                report['recommendations'].append("Work on maintaining consistent volume levels")
            
            if not report['recommendations']:
                report['recommendations'].append("Great speech delivery! Keep up the good work.")
            
            return report
            
        except Exception as e:
            print(f"Error generating speech report: {str(e)}")
            return {}