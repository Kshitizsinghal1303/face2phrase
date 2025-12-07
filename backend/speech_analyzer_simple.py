"""
Simplified Speech Analysis Module for Testing
"""

import numpy as np
import json
from typing import Dict


class SpeechAnalyzer:
    """Simplified speech analysis for testing"""
    
    def __init__(self, sample_rate: int = 22050):
        self.sample_rate = sample_rate
        
    def analyze_audio(self, audio_path: str) -> Dict:
        """Mock audio analysis for testing"""
        # Generate mock data for testing
        duration = 10.0  # Mock 10 second audio
        
        analysis_results = {
            'audio_info': {
                'duration': duration,
                'sample_rate': self.sample_rate,
                'total_samples': int(duration * self.sample_rate)
            },
            'pitch': {
                'mean_pitch': 150.0,
                'std_pitch': 25.0,
                'min_pitch': 100.0,
                'max_pitch': 200.0,
                'pitch_range': 100.0,
                'pitch_values': [150 + 20 * np.sin(i/10) for i in range(100)],
                'time_stamps': [i * 0.1 for i in range(100)]
            },
            'spectral': {
                'spectral_centroid': {
                    'values': [1500 + 200 * np.sin(i/5) for i in range(100)],
                    'mean': 1500.0,
                    'std': 200.0
                },
                'spectral_rolloff': {
                    'values': [3000 + 300 * np.sin(i/7) for i in range(100)],
                    'mean': 3000.0,
                    'std': 300.0
                }
            },
            'energy': {
                'rms_energy': {
                    'values': [0.5 + 0.2 * np.sin(i/8) for i in range(100)],
                    'mean': 0.5,
                    'std': 0.2,
                    'max': 0.7,
                    'min': 0.3
                },
                'intensity_db': {
                    'values': [-20 + 5 * np.sin(i/6) for i in range(100)],
                    'mean': -20.0,
                    'std': 5.0
                },
                'time_frames': [i * 0.1 for i in range(100)]
            },
            'speech_rate': {
                'speech_rate': 0.75,
                'syllable_rate': 3.5,
                'total_speech_time': 7.5,
                'total_duration': duration,
                'speaking_time_ratio': 0.75
            },
            'analysis_timestamp': '2024-12-07T12:00:00'
        }
        
        return analysis_results
    
    def create_interactive_visualization(self, analysis_results: Dict) -> str:
        """Create mock visualization JSON"""
        mock_plot = {
            "data": [
                {
                    "x": analysis_results['pitch']['time_stamps'],
                    "y": analysis_results['pitch']['pitch_values'],
                    "type": "scatter",
                    "mode": "lines",
                    "name": "Pitch (Hz)",
                    "line": {"color": "blue"}
                },
                {
                    "x": analysis_results['energy']['time_frames'],
                    "y": analysis_results['energy']['rms_energy']['values'],
                    "type": "scatter",
                    "mode": "lines",
                    "name": "Energy",
                    "line": {"color": "red"},
                    "yaxis": "y2"
                }
            ],
            "layout": {
                "title": "Speech Analysis Dashboard",
                "xaxis": {"title": "Time (s)"},
                "yaxis": {"title": "Pitch (Hz)", "side": "left"},
                "yaxis2": {"title": "Energy", "side": "right", "overlaying": "y"},
                "height": 400
            }
        }
        
        return json.dumps(mock_plot)
    
    def generate_speech_report(self, analysis_results: Dict) -> Dict:
        """Generate mock speech report"""
        return {
            'summary': {
                'duration': analysis_results['audio_info']['duration'],
                'overall_quality': 'Good'
            },
            'pitch_analysis': {
                'mean_pitch': analysis_results['pitch']['mean_pitch'],
                'pitch_range': analysis_results['pitch']['pitch_range'],
                'pitch_stability': 'Stable'
            },
            'energy_analysis': {
                'mean_energy': analysis_results['energy']['rms_energy']['mean'],
                'energy_variation': analysis_results['energy']['rms_energy']['std'],
                'volume_consistency': 'Consistent'
            },
            'speech_timing': {
                'speech_rate': analysis_results['speech_rate']['speech_rate'],
                'speaking_time_ratio': analysis_results['speech_rate']['speaking_time_ratio'],
                'pace_assessment': 'Normal'
            },
            'spectral_analysis': {
                'voice_clarity': 'Clear',
                'frequency_range': 'Good'
            },
            'recommendations': [
                "Great speech delivery! Keep up the good work.",
                "Consider maintaining consistent volume levels for better clarity."
            ]
        }