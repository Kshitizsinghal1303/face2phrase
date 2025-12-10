"""
Real Speech Analysis using LibROSA and advanced acoustic feature extraction
Provides actual pitch, frequency spectrum, energy levels, intensity, and speech rate analysis
"""

import librosa
import numpy as np
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import logging
import os
from typing import Dict, List, Tuple, Optional
import json
from pathlib import Path
import scipy.signal
from scipy.stats import skew, kurtosis

logger = logging.getLogger(__name__)

class RealSpeechAnalyzer:
    """Real speech analysis using LibROSA for acoustic feature extraction"""
    
    def __init__(self):
        """Initialize the speech analyzer"""
        self.sample_rate = 22050  # Standard sample rate for speech analysis
        self.hop_length = 512
        self.n_fft = 2048
        self.available = True
        logger.info("Real speech analyzer initialized with LibROSA")
    
    def load_audio(self, audio_path: str) -> Tuple[np.ndarray, int]:
        """Load audio file and return audio data and sample rate"""
        try:
            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
            # Load audio with LibROSA
            audio_data, sr = librosa.load(audio_path, sr=self.sample_rate)
            logger.info(f"Loaded audio: {audio_path} ({len(audio_data)} samples, {sr} Hz)")
            return audio_data, sr
            
        except Exception as e:
            logger.error(f"Error loading audio: {e}")
            raise
    
    def extract_pitch_features(self, audio_data: np.ndarray, sr: int) -> Dict:
        """Extract pitch-related features"""
        try:
            # Extract fundamental frequency (F0) using piptrack
            pitches, magnitudes = librosa.piptrack(y=audio_data, sr=sr, 
                                                 hop_length=self.hop_length,
                                                 fmin=50, fmax=400)
            
            # Get pitch values over time
            pitch_values = []
            times = librosa.frames_to_time(np.arange(pitches.shape[1]), 
                                         sr=sr, hop_length=self.hop_length)
            
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:  # Only include voiced segments
                    pitch_values.append(pitch)
            
            pitch_values = np.array(pitch_values)
            
            if len(pitch_values) > 0:
                pitch_stats = {
                    'mean_pitch': float(np.mean(pitch_values)),
                    'std_pitch': float(np.std(pitch_values)),
                    'min_pitch': float(np.min(pitch_values)),
                    'max_pitch': float(np.max(pitch_values)),
                    'pitch_range': float(np.max(pitch_values) - np.min(pitch_values)),
                    'pitch_median': float(np.median(pitch_values)),
                    'pitch_skewness': float(skew(pitch_values)),
                    'pitch_kurtosis': float(kurtosis(pitch_values)),
                    'voiced_frames': len(pitch_values),
                    'voicing_rate': len(pitch_values) / len(times)
                }
            else:
                pitch_stats = {
                    'mean_pitch': 0.0, 'std_pitch': 0.0, 'min_pitch': 0.0,
                    'max_pitch': 0.0, 'pitch_range': 0.0, 'pitch_median': 0.0,
                    'pitch_skewness': 0.0, 'pitch_kurtosis': 0.0,
                    'voiced_frames': 0, 'voicing_rate': 0.0
                }
            
            return {
                'pitch_contour': pitch_values.tolist(),
                'times': times.tolist(),
                'statistics': pitch_stats
            }
            
        except Exception as e:
            logger.error(f"Error extracting pitch features: {e}")
            return {'error': str(e)}
    
    def extract_spectral_features(self, audio_data: np.ndarray, sr: int) -> Dict:
        """Extract frequency spectrum and spectral features"""
        try:
            # Compute STFT
            stft = librosa.stft(audio_data, hop_length=self.hop_length, n_fft=self.n_fft)
            magnitude = np.abs(stft)
            
            # Spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=audio_data, sr=sr)[0]
            spectral_rolloff = librosa.feature.spectral_rolloff(y=audio_data, sr=sr)[0]
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=audio_data, sr=sr)[0]
            zero_crossing_rate = librosa.feature.zero_crossing_rate(audio_data)[0]
            
            # MFCCs (Mel-frequency cepstral coefficients)
            mfccs = librosa.feature.mfcc(y=audio_data, sr=sr, n_mfcc=13)
            
            # Chroma features
            chroma = librosa.feature.chroma_stft(S=magnitude, sr=sr)
            
            # Spectral contrast
            spectral_contrast = librosa.feature.spectral_contrast(S=magnitude, sr=sr)
            
            # Tonnetz (harmonic network)
            tonnetz = librosa.feature.tonnetz(y=librosa.effects.harmonic(audio_data), sr=sr)
            
            return {
                'spectral_centroids': spectral_centroids.tolist(),
                'spectral_rolloff': spectral_rolloff.tolist(),
                'spectral_bandwidth': spectral_bandwidth.tolist(),
                'zero_crossing_rate': zero_crossing_rate.tolist(),
                'mfccs': mfccs.tolist(),
                'chroma': chroma.tolist(),
                'spectral_contrast': spectral_contrast.tolist(),
                'tonnetz': tonnetz.tolist(),
                'statistics': {
                    'mean_spectral_centroid': float(np.mean(spectral_centroids)),
                    'std_spectral_centroid': float(np.std(spectral_centroids)),
                    'mean_spectral_rolloff': float(np.mean(spectral_rolloff)),
                    'mean_spectral_bandwidth': float(np.mean(spectral_bandwidth)),
                    'mean_zero_crossing_rate': float(np.mean(zero_crossing_rate)),
                    'spectral_flatness': float(np.mean(librosa.feature.spectral_flatness(y=audio_data)[0]))
                }
            }
            
        except Exception as e:
            logger.error(f"Error extracting spectral features: {e}")
            return {'error': str(e)}
    
    def extract_energy_features(self, audio_data: np.ndarray, sr: int) -> Dict:
        """Extract energy and intensity features"""
        try:
            # RMS energy
            rms_energy = librosa.feature.rms(y=audio_data, hop_length=self.hop_length)[0]
            
            # Short-time energy
            frame_length = 2048
            hop_length = 512
            frames = librosa.util.frame(audio_data, frame_length=frame_length, 
                                      hop_length=hop_length, axis=0)
            energy = np.sum(frames**2, axis=0)
            
            # Intensity (dB)
            intensity_db = librosa.amplitude_to_db(rms_energy, ref=np.max)
            
            # Dynamic range
            dynamic_range = np.max(intensity_db) - np.min(intensity_db)
            
            # Energy statistics
            energy_stats = {
                'mean_rms_energy': float(np.mean(rms_energy)),
                'std_rms_energy': float(np.std(rms_energy)),
                'max_rms_energy': float(np.max(rms_energy)),
                'min_rms_energy': float(np.min(rms_energy)),
                'mean_intensity_db': float(np.mean(intensity_db)),
                'std_intensity_db': float(np.std(intensity_db)),
                'dynamic_range_db': float(dynamic_range),
                'energy_entropy': float(-np.sum(rms_energy * np.log2(rms_energy + 1e-10)))
            }
            
            return {
                'rms_energy': rms_energy.tolist(),
                'intensity_db': intensity_db.tolist(),
                'short_time_energy': energy.tolist(),
                'statistics': energy_stats
            }
            
        except Exception as e:
            logger.error(f"Error extracting energy features: {e}")
            return {'error': str(e)}
    
    def extract_rhythm_features(self, audio_data: np.ndarray, sr: int) -> Dict:
        """Extract rhythm and speech rate features"""
        try:
            # Tempo and beat tracking
            tempo, beats = librosa.beat.beat_track(y=audio_data, sr=sr)
            
            # Onset detection
            onset_frames = librosa.onset.onset_detect(y=audio_data, sr=sr)
            onset_times = librosa.frames_to_time(onset_frames, sr=sr)
            
            # Speech rate estimation (syllables per second)
            # Approximate using onset detection
            duration = len(audio_data) / sr
            speech_rate = len(onset_times) / duration if duration > 0 else 0
            
            # Rhythm patterns
            onset_strength = librosa.onset.onset_strength(y=audio_data, sr=sr)
            
            # Pause detection (silence segments)
            rms = librosa.feature.rms(y=audio_data)[0]
            silence_threshold = np.percentile(rms, 20)  # Bottom 20% as silence
            silence_frames = rms < silence_threshold
            
            # Calculate pause statistics
            pause_segments = []
            in_pause = False
            pause_start = 0
            
            for i, is_silent in enumerate(silence_frames):
                if is_silent and not in_pause:
                    in_pause = True
                    pause_start = i
                elif not is_silent and in_pause:
                    in_pause = False
                    pause_duration = (i - pause_start) * self.hop_length / sr
                    if pause_duration > 0.1:  # Only count pauses > 100ms
                        pause_segments.append(pause_duration)
            
            pause_stats = {
                'total_pauses': len(pause_segments),
                'total_pause_time': sum(pause_segments),
                'mean_pause_duration': np.mean(pause_segments) if pause_segments else 0,
                'pause_rate': len(pause_segments) / duration if duration > 0 else 0
            }
            
            return {
                'tempo': float(tempo),
                'beats': beats.tolist(),
                'onset_times': onset_times.tolist(),
                'speech_rate': float(speech_rate),
                'onset_strength': onset_strength.tolist(),
                'pause_statistics': pause_stats,
                'rhythm_statistics': {
                    'estimated_syllables_per_second': float(speech_rate),
                    'speaking_time_ratio': 1 - (pause_stats['total_pause_time'] / duration) if duration > 0 else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error extracting rhythm features: {e}")
            return {'error': str(e)}
    
    def analyze_speech_quality(self, audio_data: np.ndarray, sr: int) -> Dict:
        """Analyze speech quality metrics"""
        try:
            # Signal-to-noise ratio estimation
            # Use spectral subtraction method
            stft = librosa.stft(audio_data)
            magnitude = np.abs(stft)
            
            # Estimate noise from first and last 10% of signal
            noise_frames = int(0.1 * magnitude.shape[1])
            noise_spectrum = np.mean(np.concatenate([
                magnitude[:, :noise_frames],
                magnitude[:, -noise_frames:]
            ], axis=1), axis=1, keepdims=True)
            
            # Signal power vs noise power
            signal_power = np.mean(magnitude**2)
            noise_power = np.mean(noise_spectrum**2)
            snr_db = 10 * np.log10(signal_power / (noise_power + 1e-10))
            
            # Harmonic-to-noise ratio
            harmonic = librosa.effects.harmonic(audio_data)
            percussive = librosa.effects.percussive(audio_data)
            
            harmonic_power = np.mean(harmonic**2)
            percussive_power = np.mean(percussive**2)
            hnr_db = 10 * np.log10(harmonic_power / (percussive_power + 1e-10))
            
            # Jitter and shimmer (voice quality measures)
            # Simplified estimation using pitch variations
            pitches, _ = librosa.piptrack(y=audio_data, sr=sr)
            pitch_values = []
            for t in range(pitches.shape[1]):
                pitch = pitches[:, t].max()
                if pitch > 0:
                    pitch_values.append(pitch)
            
            if len(pitch_values) > 1:
                pitch_values = np.array(pitch_values)
                jitter = np.std(np.diff(pitch_values)) / np.mean(pitch_values) if np.mean(pitch_values) > 0 else 0
            else:
                jitter = 0
            
            # Spectral tilt (measure of voice breathiness)
            freqs = librosa.fft_frequencies(sr=sr, n_fft=self.n_fft)
            spectrum = np.mean(np.abs(librosa.stft(audio_data, n_fft=self.n_fft)), axis=1)
            
            # Linear regression of log spectrum vs log frequency
            log_freqs = np.log(freqs[1:])  # Skip DC component
            log_spectrum = np.log(spectrum[1:] + 1e-10)
            spectral_tilt = np.polyfit(log_freqs, log_spectrum, 1)[0]
            
            return {
                'snr_db': float(snr_db),
                'hnr_db': float(hnr_db),
                'jitter': float(jitter),
                'spectral_tilt': float(spectral_tilt),
                'voice_quality': {
                    'clarity': min(100, max(0, (snr_db + 20) * 2.5)),  # Scale to 0-100
                    'stability': min(100, max(0, 100 - jitter * 1000)),  # Lower jitter = higher stability
                    'richness': min(100, max(0, (hnr_db + 10) * 5))  # Scale HNR to 0-100
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing speech quality: {e}")
            return {'error': str(e)}
    
    def analyze_audio(self, audio_path: str) -> Dict:
        """Comprehensive audio analysis"""
        try:
            logger.info(f"Starting comprehensive analysis of: {audio_path}")
            
            # Load audio
            audio_data, sr = self.load_audio(audio_path)
            duration = len(audio_data) / sr
            
            # Extract all features
            pitch_features = self.extract_pitch_features(audio_data, sr)
            spectral_features = self.extract_spectral_features(audio_data, sr)
            energy_features = self.extract_energy_features(audio_data, sr)
            rhythm_features = self.extract_rhythm_features(audio_data, sr)
            quality_features = self.analyze_speech_quality(audio_data, sr)
            
            # Overall analysis summary
            summary = {
                'file_info': {
                    'path': audio_path,
                    'duration': duration,
                    'sample_rate': sr,
                    'samples': len(audio_data)
                },
                'pitch_analysis': pitch_features,
                'spectral_analysis': spectral_features,
                'energy_analysis': energy_features,
                'rhythm_analysis': rhythm_features,
                'quality_analysis': quality_features,
                'overall_metrics': {
                    'speaking_confidence': self._calculate_confidence_score(
                        pitch_features, energy_features, quality_features
                    ),
                    'speech_clarity': quality_features.get('voice_quality', {}).get('clarity', 0),
                    'vocal_stability': quality_features.get('voice_quality', {}).get('stability', 0),
                    'engagement_level': self._calculate_engagement_score(
                        energy_features, rhythm_features
                    )
                }
            }
            
            logger.info(f"Analysis completed successfully for: {audio_path}")
            return summary
            
        except Exception as e:
            logger.error(f"Error in comprehensive audio analysis: {e}")
            return {'error': str(e), 'file_path': audio_path}
    
    def _calculate_confidence_score(self, pitch_features: Dict, energy_features: Dict, quality_features: Dict) -> float:
        """Calculate overall speaking confidence score"""
        try:
            score = 50.0  # Base score
            
            # Pitch stability contributes to confidence
            pitch_stats = pitch_features.get('statistics', {})
            if pitch_stats.get('voicing_rate', 0) > 0.5:
                score += 15
            if pitch_stats.get('std_pitch', 0) < 50:  # Stable pitch
                score += 10
            
            # Energy consistency
            energy_stats = energy_features.get('statistics', {})
            if energy_stats.get('std_rms_energy', 0) < 0.1:  # Consistent energy
                score += 10
            
            # Voice quality
            voice_quality = quality_features.get('voice_quality', {})
            score += voice_quality.get('clarity', 0) * 0.15
            score += voice_quality.get('stability', 0) * 0.1
            
            return min(100.0, max(0.0, score))
            
        except Exception as e:
            logger.error(f"Error calculating confidence score: {e}")
            return 50.0
    
    def _calculate_engagement_score(self, energy_features: Dict, rhythm_features: Dict) -> float:
        """Calculate engagement level score"""
        try:
            score = 50.0  # Base score
            
            # Energy variation indicates engagement
            energy_stats = energy_features.get('statistics', {})
            dynamic_range = energy_stats.get('dynamic_range_db', 0)
            if dynamic_range > 20:  # Good dynamic range
                score += 20
            elif dynamic_range > 10:
                score += 10
            
            # Speech rate
            rhythm_stats = rhythm_features.get('rhythm_statistics', {})
            speech_rate = rhythm_stats.get('estimated_syllables_per_second', 0)
            if 2 <= speech_rate <= 6:  # Optimal speech rate
                score += 15
            
            # Speaking time ratio
            speaking_ratio = rhythm_stats.get('speaking_time_ratio', 0)
            if speaking_ratio > 0.7:  # Good speaking time
                score += 15
            
            return min(100.0, max(0.0, score))
            
        except Exception as e:
            logger.error(f"Error calculating engagement score: {e}")
            return 50.0
    
    def create_interactive_visualization(self, analysis_data: Dict, output_path: str = None) -> str:
        """Create interactive visualization of speech analysis"""
        try:
            if 'error' in analysis_data:
                return f"<div class='error'>Analysis failed: {analysis_data['error']}</div>"
            
            # Create subplots
            fig = make_subplots(
                rows=4, cols=2,
                subplot_titles=(
                    'Pitch Contour', 'Energy Over Time',
                    'Spectral Centroid', 'Speech Rate & Pauses',
                    'Voice Quality Metrics', 'Overall Assessment',
                    'Frequency Spectrum', 'MFCC Features'
                ),
                specs=[[{"secondary_y": False}, {"secondary_y": False}],
                       [{"secondary_y": False}, {"secondary_y": False}],
                       [{"secondary_y": False}, {"secondary_y": False}],
                       [{"secondary_y": False}, {"secondary_y": False}]],
                vertical_spacing=0.08
            )
            
            # Extract data
            pitch_data = analysis_data.get('pitch_analysis', {})
            energy_data = analysis_data.get('energy_analysis', {})
            spectral_data = analysis_data.get('spectral_analysis', {})
            rhythm_data = analysis_data.get('rhythm_analysis', {})
            quality_data = analysis_data.get('quality_analysis', {})
            overall_data = analysis_data.get('overall_metrics', {})
            
            # Plot 1: Pitch contour
            if 'pitch_contour' in pitch_data and 'times' in pitch_data:
                times = pitch_data['times'][:len(pitch_data['pitch_contour'])]
                fig.add_trace(
                    go.Scatter(
                        x=times,
                        y=pitch_data['pitch_contour'],
                        mode='lines',
                        name='Pitch (Hz)',
                        line=dict(color='blue', width=2)
                    ),
                    row=1, col=1
                )
            
            # Plot 2: Energy over time
            if 'rms_energy' in energy_data:
                energy_times = np.linspace(0, analysis_data['file_info']['duration'], 
                                         len(energy_data['rms_energy']))
                fig.add_trace(
                    go.Scatter(
                        x=energy_times,
                        y=energy_data['rms_energy'],
                        mode='lines',
                        name='RMS Energy',
                        line=dict(color='red', width=2)
                    ),
                    row=1, col=2
                )
            
            # Plot 3: Spectral centroid
            if 'spectral_centroids' in spectral_data:
                spectral_times = np.linspace(0, analysis_data['file_info']['duration'],
                                           len(spectral_data['spectral_centroids']))
                fig.add_trace(
                    go.Scatter(
                        x=spectral_times,
                        y=spectral_data['spectral_centroids'],
                        mode='lines',
                        name='Spectral Centroid',
                        line=dict(color='green', width=2)
                    ),
                    row=2, col=1
                )
            
            # Plot 4: Speech rate visualization
            if 'onset_times' in rhythm_data:
                fig.add_trace(
                    go.Scatter(
                        x=rhythm_data['onset_times'],
                        y=[1] * len(rhythm_data['onset_times']),
                        mode='markers',
                        name='Speech Onsets',
                        marker=dict(color='orange', size=8)
                    ),
                    row=2, col=2
                )
            
            # Plot 5: Voice quality metrics
            quality_metrics = quality_data.get('voice_quality', {})
            if quality_metrics:
                fig.add_trace(
                    go.Bar(
                        x=['Clarity', 'Stability', 'Richness'],
                        y=[quality_metrics.get('clarity', 0),
                           quality_metrics.get('stability', 0),
                           quality_metrics.get('richness', 0)],
                        name='Voice Quality',
                        marker_color=['lightblue', 'lightgreen', 'lightcoral']
                    ),
                    row=3, col=1
                )
            
            # Plot 6: Overall assessment
            if overall_data:
                fig.add_trace(
                    go.Bar(
                        x=['Confidence', 'Clarity', 'Stability', 'Engagement'],
                        y=[overall_data.get('speaking_confidence', 0),
                           overall_data.get('speech_clarity', 0),
                           overall_data.get('vocal_stability', 0),
                           overall_data.get('engagement_level', 0)],
                        name='Overall Metrics',
                        marker_color=['gold', 'lightblue', 'lightgreen', 'lightpink']
                    ),
                    row=3, col=2
                )
            
            # Plot 7: Frequency spectrum (average)
            if 'mfccs' in spectral_data:
                mfccs = np.array(spectral_data['mfccs'])
                avg_mfcc = np.mean(mfccs, axis=1)
                fig.add_trace(
                    go.Bar(
                        x=[f'MFCC {i+1}' for i in range(len(avg_mfcc))],
                        y=avg_mfcc,
                        name='MFCC Coefficients',
                        marker_color='purple'
                    ),
                    row=4, col=1
                )
            
            # Plot 8: Additional features
            if 'statistics' in spectral_data:
                stats = spectral_data['statistics']
                fig.add_trace(
                    go.Scatter(
                        x=['Spectral Centroid', 'Spectral Rolloff', 'Spectral Bandwidth', 'ZCR'],
                        y=[stats.get('mean_spectral_centroid', 0),
                           stats.get('mean_spectral_rolloff', 0),
                           stats.get('mean_spectral_bandwidth', 0),
                           stats.get('mean_zero_crossing_rate', 0) * 1000],  # Scale ZCR
                        mode='markers+lines',
                        name='Spectral Features',
                        marker=dict(size=10, color='darkblue')
                    ),
                    row=4, col=2
                )
            
            # Update layout
            fig.update_layout(
                height=1200,
                title_text="Comprehensive Speech Analysis Dashboard",
                showlegend=True,
                template="plotly_white"
            )
            
            # Update axes labels
            fig.update_xaxes(title_text="Time (s)", row=1, col=1)
            fig.update_yaxes(title_text="Frequency (Hz)", row=1, col=1)
            fig.update_xaxes(title_text="Time (s)", row=1, col=2)
            fig.update_yaxes(title_text="Energy", row=1, col=2)
            
            # Generate HTML
            html_content = fig.to_html(include_plotlyjs='cdn')
            
            # Add detailed summary
            file_info = analysis_data.get('file_info', {})
            pitch_stats = pitch_data.get('statistics', {})
            energy_stats = energy_data.get('statistics', {})
            rhythm_stats = rhythm_data.get('rhythm_statistics', {})
            
            summary_html = f"""
            <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3>🎤 Speech Analysis Summary</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    <div><strong>Duration:</strong> {file_info.get('duration', 0):.2f} seconds</div>
                    <div><strong>Average Pitch:</strong> {pitch_stats.get('mean_pitch', 0):.1f} Hz</div>
                    <div><strong>Speech Rate:</strong> {rhythm_stats.get('estimated_syllables_per_second', 0):.1f} syl/sec</div>
                    <div><strong>Speaking Confidence:</strong> {overall_data.get('speaking_confidence', 0):.1f}%</div>
                    <div><strong>Voice Clarity:</strong> {overall_data.get('speech_clarity', 0):.1f}%</div>
                    <div><strong>Vocal Stability:</strong> {overall_data.get('vocal_stability', 0):.1f}%</div>
                    <div><strong>Engagement Level:</strong> {overall_data.get('engagement_level', 0):.1f}%</div>
                    <div><strong>Dynamic Range:</strong> {energy_stats.get('dynamic_range_db', 0):.1f} dB</div>
                </div>
                
                <h4 style="margin-top: 20px;">📊 Key Insights:</h4>
                <ul>
                    <li><strong>Pitch Analysis:</strong> Range of {pitch_stats.get('pitch_range', 0):.1f} Hz, {pitch_stats.get('voicing_rate', 0)*100:.1f}% voiced</li>
                    <li><strong>Energy Profile:</strong> Mean intensity {energy_stats.get('mean_intensity_db', 0):.1f} dB</li>
                    <li><strong>Speech Rhythm:</strong> {rhythm_data.get('pause_statistics', {}).get('total_pauses', 0)} pauses detected</li>
                    <li><strong>Voice Quality:</strong> SNR {quality_data.get('snr_db', 0):.1f} dB, HNR {quality_data.get('hnr_db', 0):.1f} dB</li>
                </ul>
            </div>
            """
            
            # Combine HTML
            full_html = summary_html + html_content
            
            # Save if output path provided
            if output_path:
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(full_html)
                logger.info(f"Speech analysis visualization saved to: {output_path}")
            
            return full_html
            
        except Exception as e:
            logger.error(f"Error creating speech visualization: {e}")
            return f"<div class='error'>Error creating visualization: {str(e)}</div>"

# Create global instance
try:
    real_speech_analyzer = RealSpeechAnalyzer()
    logger.info("✅ Real speech analyzer initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize real speech analyzer: {e}")
    real_speech_analyzer = None