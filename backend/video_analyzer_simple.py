"""
Simplified Video Analysis Module for Testing
"""

import json
import numpy as np
from typing import Dict, List


class VideoAnalyzer:
    """Simplified video analysis for testing"""
    
    def __init__(self):
        self.emotions = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'fear', 'disgust']
        
    def analyze_video(self, video_path: str) -> Dict:
        """Mock video analysis for testing"""
        # Generate mock data for testing
        duration = 10.0  # Mock 10 second video
        fps = 30
        total_frames = int(duration * fps)
        
        # Mock emotion data over time
        time_points = np.linspace(0, duration, 50)
        emotion_scores = {
            'happy': [0.6 + 0.2 * np.sin(i/5) for i in range(50)],
            'neutral': [0.3 + 0.1 * np.cos(i/3) for i in range(50)],
            'confident': [0.7 + 0.15 * np.sin(i/7) for i in range(50)],
            'engaged': [0.8 + 0.1 * np.cos(i/4) for i in range(50)]
        }
        
        analysis_results = {
            'video_info': {
                'duration': duration,
                'fps': fps,
                'total_frames': total_frames,
                'resolution': '1280x720'
            },
            'facial_landmarks': {
                'face_detection_rate': 0.95,
                'landmark_confidence': 0.88,
                'frames_with_face': int(total_frames * 0.95)
            },
            'emotion_analysis': {
                'time_points': time_points.tolist(),
                'emotion_scores': emotion_scores,
                'dominant_emotion': 'happy',
                'emotion_stability': 0.85,
                'confidence_scores': [0.85 + 0.1 * np.sin(i/6) for i in range(50)]
            },
            'engagement_metrics': {
                'eye_contact_ratio': 0.78,
                'head_pose_stability': 0.82,
                'facial_expression_variety': 0.65,
                'overall_engagement': 0.75
            },
            'micro_expressions': {
                'detected_count': 12,
                'types': ['smile', 'eyebrow_raise', 'head_nod'],
                'confidence': 0.72
            },
            'gaze_analysis': {
                'looking_at_camera': 0.78,
                'gaze_direction_variance': 0.22,
                'eye_contact_quality': 'Good'
            },
            'analysis_timestamp': '2024-12-07T12:00:00'
        }
        
        return analysis_results
    
    def create_interactive_visualization(self, analysis_results: Dict) -> str:
        """Create mock visualization JSON"""
        time_points = analysis_results['emotion_analysis']['time_points']
        emotion_scores = analysis_results['emotion_analysis']['emotion_scores']
        
        mock_plot = {
            "data": [
                {
                    "x": time_points,
                    "y": emotion_scores['happy'],
                    "type": "scatter",
                    "mode": "lines",
                    "name": "Happiness",
                    "line": {"color": "gold"}
                },
                {
                    "x": time_points,
                    "y": emotion_scores['confident'],
                    "type": "scatter",
                    "mode": "lines",
                    "name": "Confidence",
                    "line": {"color": "green"}
                },
                {
                    "x": time_points,
                    "y": emotion_scores['engaged'],
                    "type": "scatter",
                    "mode": "lines",
                    "name": "Engagement",
                    "line": {"color": "blue"}
                },
                {
                    "x": time_points,
                    "y": emotion_scores['neutral'],
                    "type": "scatter",
                    "mode": "lines",
                    "name": "Neutral",
                    "line": {"color": "gray"}
                }
            ],
            "layout": {
                "title": "Facial Expression Analysis Over Time",
                "xaxis": {"title": "Time (s)"},
                "yaxis": {"title": "Expression Intensity", "range": [0, 1]},
                "height": 400,
                "showlegend": True
            }
        }
        
        return json.dumps(mock_plot)
    
    def create_video_visualization(self, analysis_results: Dict) -> str:
        """Create video visualization - alias for create_interactive_visualization"""
        return self.create_interactive_visualization(analysis_results)
    
    def generate_video_report(self, analysis_results: Dict) -> Dict:
        """Generate mock video report"""
        return {
            'video_summary': {
                'duration': analysis_results['video_info']['duration'],
                'face_detection_rate': analysis_results['facial_landmarks']['face_detection_rate'],
                'overall_quality': 'Good'
            },
            'emotion_analysis': {
                'dominant_emotion': analysis_results['emotion_analysis']['dominant_emotion'],
                'emotion_stability': analysis_results['emotion_analysis']['emotion_stability'],
                'emotional_range': 'Appropriate'
            },
            'facial_expression': {
                'expression_variety': analysis_results['engagement_metrics']['facial_expression_variety'],
                'micro_expressions_detected': analysis_results['micro_expressions']['detected_count'],
                'eye_contact_quality': analysis_results['gaze_analysis']['eye_contact_quality']
            },
            'engagement_assessment': {
                'overall_engagement': analysis_results['engagement_metrics']['overall_engagement'],
                'eye_contact_ratio': analysis_results['engagement_metrics']['eye_contact_ratio'],
                'head_pose_stability': analysis_results['engagement_metrics']['head_pose_stability'],
                'engagement_level': 'High'
            },
            'recommendations': [
                "Excellent eye contact and engagement throughout the interview!",
                "Your facial expressions show good emotional range and authenticity.",
                "Consider maintaining consistent head position for better video quality."
            ]
        }