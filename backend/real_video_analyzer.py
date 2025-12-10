"""
Real Video Analysis using MediaPipe and Computer Vision
Provides actual facial expression detection and emotion analysis
"""

import cv2
import numpy as np
import mediapipe as mp
import logging
from typing import Dict, List, Tuple, Optional
import json
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class RealVideoAnalyzer:
    """Real video analysis using MediaPipe for facial expression detection"""
    
    def __init__(self):
        """Initialize MediaPipe components"""
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Initialize face mesh and detection
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0,
            min_detection_confidence=0.5
        )
        
        # Facial landmark indices for different features
        self.landmark_indices = {
            'left_eye': [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
            'right_eye': [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
            'mouth': [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 78],
            'eyebrows': [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 285, 295, 282, 283, 276, 300, 293, 334, 296, 336]
        }
        
        self.available = True
        logger.info("Real video analyzer initialized with MediaPipe")
    
    def extract_facial_features(self, frame: np.ndarray) -> Dict:
        """Extract facial landmarks and features from a frame"""
        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb_frame)
            
            features = {
                'face_detected': False,
                'landmarks': [],
                'eye_aspect_ratio': 0.0,
                'mouth_aspect_ratio': 0.0,
                'eyebrow_height': 0.0,
                'face_width': 0.0,
                'face_height': 0.0
            }
            
            if results.multi_face_landmarks:
                features['face_detected'] = True
                landmarks = results.multi_face_landmarks[0]
                
                # Convert landmarks to pixel coordinates
                h, w = frame.shape[:2]
                landmark_points = []
                for lm in landmarks.landmark:
                    x = int(lm.x * w)
                    y = int(lm.y * h)
                    landmark_points.append([x, y])
                
                features['landmarks'] = landmark_points
                
                # Calculate facial feature ratios
                features['eye_aspect_ratio'] = self._calculate_eye_aspect_ratio(landmark_points)
                features['mouth_aspect_ratio'] = self._calculate_mouth_aspect_ratio(landmark_points)
                features['eyebrow_height'] = self._calculate_eyebrow_height(landmark_points)
                
                # Calculate face dimensions
                face_box = self._get_face_bounding_box(landmark_points)
                if face_box:
                    features['face_width'] = face_box[2] - face_box[0]
                    features['face_height'] = face_box[3] - face_box[1]
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting facial features: {e}")
            return {'face_detected': False, 'error': str(e)}
    
    def _calculate_eye_aspect_ratio(self, landmarks: List[List[int]]) -> float:
        """Calculate Eye Aspect Ratio (EAR) for blink detection"""
        try:
            # Left eye landmarks
            left_eye_points = [landmarks[i] for i in self.landmark_indices['left_eye'][:6]]
            # Right eye landmarks  
            right_eye_points = [landmarks[i] for i in self.landmark_indices['right_eye'][:6]]
            
            def eye_aspect_ratio(eye_points):
                # Vertical distances
                A = np.linalg.norm(np.array(eye_points[1]) - np.array(eye_points[5]))
                B = np.linalg.norm(np.array(eye_points[2]) - np.array(eye_points[4]))
                # Horizontal distance
                C = np.linalg.norm(np.array(eye_points[0]) - np.array(eye_points[3]))
                return (A + B) / (2.0 * C)
            
            left_ear = eye_aspect_ratio(left_eye_points)
            right_ear = eye_aspect_ratio(right_eye_points)
            
            return (left_ear + right_ear) / 2.0
            
        except Exception as e:
            logger.error(f"Error calculating eye aspect ratio: {e}")
            return 0.0
    
    def _calculate_mouth_aspect_ratio(self, landmarks: List[List[int]]) -> float:
        """Calculate Mouth Aspect Ratio (MAR) for smile detection"""
        try:
            mouth_points = [landmarks[i] for i in self.landmark_indices['mouth'][:8]]
            
            # Vertical distances
            A = np.linalg.norm(np.array(mouth_points[2]) - np.array(mouth_points[6]))
            B = np.linalg.norm(np.array(mouth_points[3]) - np.array(mouth_points[5]))
            # Horizontal distance
            C = np.linalg.norm(np.array(mouth_points[0]) - np.array(mouth_points[4]))
            
            return (A + B) / (2.0 * C)
            
        except Exception as e:
            logger.error(f"Error calculating mouth aspect ratio: {e}")
            return 0.0
    
    def _calculate_eyebrow_height(self, landmarks: List[List[int]]) -> float:
        """Calculate eyebrow height for surprise/concern detection"""
        try:
            eyebrow_points = [landmarks[i] for i in self.landmark_indices['eyebrows'][:4]]
            eye_points = [landmarks[i] for i in self.landmark_indices['left_eye'][:4]]
            
            # Average eyebrow height
            eyebrow_y = np.mean([p[1] for p in eyebrow_points])
            # Average eye height
            eye_y = np.mean([p[1] for p in eye_points])
            
            return abs(eyebrow_y - eye_y)
            
        except Exception as e:
            logger.error(f"Error calculating eyebrow height: {e}")
            return 0.0
    
    def _get_face_bounding_box(self, landmarks: List[List[int]]) -> Optional[Tuple[int, int, int, int]]:
        """Get bounding box of the face"""
        try:
            if not landmarks:
                return None
            
            x_coords = [p[0] for p in landmarks]
            y_coords = [p[1] for p in landmarks]
            
            return (min(x_coords), min(y_coords), max(x_coords), max(y_coords))
            
        except Exception as e:
            logger.error(f"Error getting face bounding box: {e}")
            return None
    
    def analyze_emotion(self, features: Dict) -> Dict:
        """Analyze emotion based on facial features"""
        try:
            if not features.get('face_detected', False):
                return {
                    'dominant_emotion': 'neutral',
                    'confidence': 0.0,
                    'emotions': {'neutral': 100.0},
                    'analysis': 'No face detected'
                }
            
            # Extract feature values
            ear = features.get('eye_aspect_ratio', 0.0)
            mar = features.get('mouth_aspect_ratio', 0.0)
            eyebrow_height = features.get('eyebrow_height', 0.0)
            
            # Emotion detection based on facial feature ratios
            emotions = {
                'happy': 0.0,
                'sad': 0.0,
                'surprised': 0.0,
                'angry': 0.0,
                'neutral': 50.0,  # Base neutral score
                'focused': 0.0
            }
            
            # Happy detection (smile)
            if mar > 0.02:  # Mouth open/smile
                emotions['happy'] = min(95.0, mar * 2000)
                emotions['neutral'] = max(0.0, emotions['neutral'] - emotions['happy'])
            
            # Surprised detection (raised eyebrows, wide eyes)
            if eyebrow_height > 15 and ear > 0.25:
                emotions['surprised'] = min(90.0, (eyebrow_height - 15) * 5 + (ear - 0.25) * 200)
                emotions['neutral'] = max(0.0, emotions['neutral'] - emotions['surprised'])
            
            # Focused/concentrated (slightly narrowed eyes)
            if 0.15 < ear < 0.22:
                emotions['focused'] = min(80.0, (0.22 - ear) * 1000)
                emotions['neutral'] = max(0.0, emotions['neutral'] - emotions['focused'])
            
            # Sad detection (droopy features)
            if mar < 0.01 and eyebrow_height < 10:
                emotions['sad'] = min(75.0, (0.01 - mar) * 3000 + (10 - eyebrow_height) * 5)
                emotions['neutral'] = max(0.0, emotions['neutral'] - emotions['sad'])
            
            # Angry detection (furrowed brow, tight mouth)
            if eyebrow_height < 8 and mar < 0.008:
                emotions['angry'] = min(85.0, (8 - eyebrow_height) * 8 + (0.008 - mar) * 4000)
                emotions['neutral'] = max(0.0, emotions['neutral'] - emotions['angry'])
            
            # Normalize emotions to sum to 100%
            total = sum(emotions.values())
            if total > 0:
                emotions = {k: (v / total) * 100 for k, v in emotions.items()}
            
            # Find dominant emotion
            dominant_emotion = max(emotions.items(), key=lambda x: x[1])
            
            return {
                'dominant_emotion': dominant_emotion[0],
                'confidence': dominant_emotion[1] / 100.0,
                'emotions': emotions,
                'analysis': f"Detected {dominant_emotion[0]} with {dominant_emotion[1]:.1f}% confidence",
                'features': {
                    'eye_aspect_ratio': ear,
                    'mouth_aspect_ratio': mar,
                    'eyebrow_height': eyebrow_height
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing emotion: {e}")
            return {
                'dominant_emotion': 'neutral',
                'confidence': 0.0,
                'emotions': {'neutral': 100.0},
                'analysis': f'Error in emotion analysis: {str(e)}'
            }
    
    def analyze_video(self, video_path: str, sample_rate: int = 30) -> Dict:
        """Analyze entire video for facial expressions and emotions"""
        try:
            if not os.path.exists(video_path):
                return {'error': f'Video file not found: {video_path}'}
            
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return {'error': f'Could not open video: {video_path}'}
            
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            duration = total_frames / fps if fps > 0 else 0
            
            # Sample frames for analysis
            frame_interval = max(1, int(fps / sample_rate)) if fps > 0 else 1
            
            emotions_timeline = []
            frame_count = 0
            analyzed_frames = 0
            
            logger.info(f"Analyzing video: {video_path} ({total_frames} frames, {fps:.1f} fps)")
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Sample frames at specified rate
                if frame_count % frame_interval == 0:
                    features = self.extract_facial_features(frame)
                    emotion_data = self.analyze_emotion(features)
                    
                    timestamp = frame_count / fps if fps > 0 else frame_count
                    emotions_timeline.append({
                        'timestamp': timestamp,
                        'frame': frame_count,
                        **emotion_data
                    })
                    analyzed_frames += 1
                
                frame_count += 1
            
            cap.release()
            
            # Calculate overall statistics
            if emotions_timeline:
                # Average emotions across all frames
                emotion_sums = {}
                for frame_data in emotions_timeline:
                    for emotion, value in frame_data.get('emotions', {}).items():
                        emotion_sums[emotion] = emotion_sums.get(emotion, 0) + value
                
                avg_emotions = {k: v / len(emotions_timeline) for k, v in emotion_sums.items()}
                dominant_overall = max(avg_emotions.items(), key=lambda x: x[1])
                
                # Calculate confidence and engagement metrics
                face_detection_rate = sum(1 for f in emotions_timeline if f.get('confidence', 0) > 0.3) / len(emotions_timeline)
                avg_confidence = np.mean([f.get('confidence', 0) for f in emotions_timeline])
                
                return {
                    'success': True,
                    'video_info': {
                        'duration': duration,
                        'total_frames': total_frames,
                        'analyzed_frames': analyzed_frames,
                        'fps': fps
                    },
                    'overall_analysis': {
                        'dominant_emotion': dominant_overall[0],
                        'confidence': dominant_overall[1] / 100.0,
                        'emotions': avg_emotions,
                        'face_detection_rate': face_detection_rate,
                        'average_confidence': avg_confidence
                    },
                    'timeline': emotions_timeline,
                    'summary': f"Primary emotion: {dominant_overall[0]} ({dominant_overall[1]:.1f}%), Face detection: {face_detection_rate*100:.1f}%"
                }
            else:
                return {
                    'success': False,
                    'error': 'No faces detected in video',
                    'video_info': {
                        'duration': duration,
                        'total_frames': total_frames,
                        'analyzed_frames': 0,
                        'fps': fps
                    }
                }
                
        except Exception as e:
            logger.error(f"Error analyzing video: {e}")
            return {'success': False, 'error': str(e)}
    
    def create_video_visualization(self, analysis_data: Dict, output_path: str = None) -> str:
        """Create visualization of video analysis results"""
        return self.create_interactive_visualization(analysis_data, output_path)
    
    def create_interactive_visualization(self, analysis_data: Dict, output_path: str = None) -> str:
        """Create interactive visualization of video analysis results"""
        try:
            import plotly.graph_objects as go
            import plotly.express as px
            from plotly.subplots import make_subplots
            
            if not analysis_data.get('success', False):
                return f"<div class='error'>Video analysis failed: {analysis_data.get('error', 'Unknown error')}</div>"
            
            timeline = analysis_data.get('timeline', [])
            if not timeline:
                return "<div class='error'>No timeline data available</div>"
            
            # Create subplots
            fig = make_subplots(
                rows=3, cols=1,
                subplot_titles=('Emotion Timeline', 'Confidence Over Time', 'Facial Features'),
                vertical_spacing=0.08,
                specs=[[{"secondary_y": False}],
                       [{"secondary_y": False}],
                       [{"secondary_y": False}]]
            )
            
            # Extract data for plotting
            timestamps = [frame['timestamp'] for frame in timeline]
            emotions = ['happy', 'sad', 'surprised', 'angry', 'neutral', 'focused']
            
            # Plot 1: Emotion timeline
            for emotion in emotions:
                values = [frame.get('emotions', {}).get(emotion, 0) for frame in timeline]
                fig.add_trace(
                    go.Scatter(
                        x=timestamps,
                        y=values,
                        mode='lines',
                        name=emotion.capitalize(),
                        line=dict(width=2)
                    ),
                    row=1, col=1
                )
            
            # Plot 2: Confidence over time
            confidence_values = [frame.get('confidence', 0) * 100 for frame in timeline]
            fig.add_trace(
                go.Scatter(
                    x=timestamps,
                    y=confidence_values,
                    mode='lines+markers',
                    name='Confidence',
                    line=dict(color='red', width=3),
                    marker=dict(size=4)
                ),
                row=2, col=1
            )
            
            # Plot 3: Facial features
            if timeline and 'features' in timeline[0]:
                ear_values = [frame.get('features', {}).get('eye_aspect_ratio', 0) * 100 for frame in timeline]
                mar_values = [frame.get('features', {}).get('mouth_aspect_ratio', 0) * 1000 for frame in timeline]
                eyebrow_values = [frame.get('features', {}).get('eyebrow_height', 0) for frame in timeline]
                
                fig.add_trace(
                    go.Scatter(x=timestamps, y=ear_values, mode='lines', name='Eye Openness', line=dict(color='blue')),
                    row=3, col=1
                )
                fig.add_trace(
                    go.Scatter(x=timestamps, y=mar_values, mode='lines', name='Mouth Movement', line=dict(color='green')),
                    row=3, col=1
                )
                fig.add_trace(
                    go.Scatter(x=timestamps, y=eyebrow_values, mode='lines', name='Eyebrow Height', line=dict(color='orange')),
                    row=3, col=1
                )
            
            # Update layout
            fig.update_layout(
                height=800,
                title_text="Real-Time Facial Expression Analysis",
                showlegend=True,
                template="plotly_white"
            )
            
            # Update axes labels
            fig.update_xaxes(title_text="Time (seconds)", row=3, col=1)
            fig.update_yaxes(title_text="Emotion %", row=1, col=1)
            fig.update_yaxes(title_text="Confidence %", row=2, col=1)
            fig.update_yaxes(title_text="Feature Values", row=3, col=1)
            
            # Generate HTML
            html_content = fig.to_html(include_plotlyjs='cdn')
            
            # Add summary statistics
            overall = analysis_data.get('overall_analysis', {})
            summary_html = f"""
            <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3>📊 Analysis Summary</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div><strong>Dominant Emotion:</strong> {overall.get('dominant_emotion', 'N/A').title()}</div>
                    <div><strong>Overall Confidence:</strong> {overall.get('confidence', 0)*100:.1f}%</div>
                    <div><strong>Face Detection Rate:</strong> {overall.get('face_detection_rate', 0)*100:.1f}%</div>
                    <div><strong>Frames Analyzed:</strong> {analysis_data.get('video_info', {}).get('analyzed_frames', 0)}</div>
                </div>
                <p style="margin-top: 15px;"><strong>Summary:</strong> {analysis_data.get('summary', 'No summary available')}</p>
            </div>
            """
            
            # Combine HTML
            full_html = summary_html + html_content
            
            # Save if output path provided
            if output_path:
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(full_html)
                logger.info(f"Video analysis visualization saved to: {output_path}")
            
            return full_html
            
        except Exception as e:
            logger.error(f"Error creating video visualization: {e}")
            return f"<div class='error'>Error creating visualization: {str(e)}</div>"

# Create global instance
try:
    real_video_analyzer = RealVideoAnalyzer()
    logger.info("✅ Real video analyzer initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize real video analyzer: {e}")
    real_video_analyzer = None