"""
Advanced Video Analysis Module
Facial expression analysis and emotion detection using computer vision
"""

import cv2
import numpy as np
import pandas as pd
import mediapipe as mp
import face_recognition
from fer import FER
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import json
import base64
from io import BytesIO
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')


class VideoAnalyzer:
    """Advanced video analysis with facial expression and emotion detection"""
    
    def __init__(self):
        # Initialize MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Initialize FER (Facial Expression Recognition)
        self.emotion_detector = FER(mtcnn=True)
        
        # Face landmarks for key features
        self.face_landmarks = {
            'left_eye': [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
            'right_eye': [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
            'mouth': [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 78],
            'eyebrows': [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 296, 334, 293, 300, 276, 283, 282, 295, 285, 336]
        }
        
    def extract_frames(self, video_path: str, max_frames: int = 100) -> List[np.ndarray]:
        """Extract frames from video for analysis"""
        try:
            cap = cv2.VideoCapture(video_path)
            frames = []
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            # Calculate frame interval to get max_frames evenly distributed
            frame_interval = max(1, total_frames // max_frames)
            
            frame_count = 0
            while cap.isOpened() and len(frames) < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_count % frame_interval == 0:
                    frames.append(frame)
                
                frame_count += 1
            
            cap.release()
            
            return frames, fps, total_frames
            
        except Exception as e:
            raise Exception(f"Error extracting frames: {str(e)}")
    
    def detect_faces(self, frame: np.ndarray) -> List[Dict]:
        """Detect faces in a frame and return face locations and encodings"""
        try:
            # Convert BGR to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Find face locations
            face_locations = face_recognition.face_locations(rgb_frame)
            face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
            
            faces = []
            for i, (top, right, bottom, left) in enumerate(face_locations):
                face_data = {
                    'location': (top, right, bottom, left),
                    'encoding': face_encodings[i] if i < len(face_encodings) else None,
                    'width': right - left,
                    'height': bottom - top,
                    'center': ((left + right) // 2, (top + bottom) // 2)
                }
                faces.append(face_data)
            
            return faces
            
        except Exception as e:
            print(f"Error detecting faces: {str(e)}")
            return []
    
    def analyze_facial_landmarks(self, frame: np.ndarray) -> Dict:
        """Analyze facial landmarks using MediaPipe"""
        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            with self.mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            ) as face_mesh:
                
                results = face_mesh.process(rgb_frame)
                
                if not results.multi_face_landmarks:
                    return {}
                
                face_landmarks = results.multi_face_landmarks[0]
                h, w, _ = frame.shape
                
                # Extract key landmark points
                landmarks_dict = {}
                for name, indices in self.face_landmarks.items():
                    points = []
                    for idx in indices:
                        if idx < len(face_landmarks.landmark):
                            landmark = face_landmarks.landmark[idx]
                            x = int(landmark.x * w)
                            y = int(landmark.y * h)
                            points.append((x, y))
                    landmarks_dict[name] = points
                
                # Calculate facial metrics
                metrics = self.calculate_facial_metrics(landmarks_dict, w, h)
                
                return {
                    'landmarks': landmarks_dict,
                    'metrics': metrics,
                    'detected': True
                }
                
        except Exception as e:
            print(f"Error analyzing facial landmarks: {str(e)}")
            return {'detected': False}
    
    def calculate_facial_metrics(self, landmarks: Dict, width: int, height: int) -> Dict:
        """Calculate facial expression metrics from landmarks"""
        try:
            metrics = {}
            
            # Eye aspect ratio (EAR) for blink detection
            if 'left_eye' in landmarks and 'right_eye' in landmarks:
                left_ear = self.calculate_eye_aspect_ratio(landmarks['left_eye'])
                right_ear = self.calculate_eye_aspect_ratio(landmarks['right_eye'])
                metrics['eye_aspect_ratio'] = (left_ear + right_ear) / 2
                metrics['blink_detected'] = metrics['eye_aspect_ratio'] < 0.25
            
            # Mouth aspect ratio (MAR) for mouth opening
            if 'mouth' in landmarks:
                metrics['mouth_aspect_ratio'] = self.calculate_mouth_aspect_ratio(landmarks['mouth'])
                metrics['mouth_open'] = metrics['mouth_aspect_ratio'] > 0.5
            
            # Eyebrow position for surprise/concern detection
            if 'eyebrows' in landmarks and 'left_eye' in landmarks:
                metrics['eyebrow_height'] = self.calculate_eyebrow_height(landmarks['eyebrows'], landmarks['left_eye'])
                metrics['eyebrows_raised'] = metrics['eyebrow_height'] > 0.3
            
            # Face symmetry
            if 'left_eye' in landmarks and 'right_eye' in landmarks:
                metrics['face_symmetry'] = self.calculate_face_symmetry(landmarks['left_eye'], landmarks['right_eye'])
            
            return metrics
            
        except Exception as e:
            print(f"Error calculating facial metrics: {str(e)}")
            return {}
    
    def calculate_eye_aspect_ratio(self, eye_points: List[Tuple]) -> float:
        """Calculate Eye Aspect Ratio (EAR)"""
        if len(eye_points) < 6:
            return 0.0
        
        try:
            # Vertical eye landmarks
            A = np.linalg.norm(np.array(eye_points[1]) - np.array(eye_points[5]))
            B = np.linalg.norm(np.array(eye_points[2]) - np.array(eye_points[4]))
            
            # Horizontal eye landmark
            C = np.linalg.norm(np.array(eye_points[0]) - np.array(eye_points[3]))
            
            # EAR calculation
            ear = (A + B) / (2.0 * C)
            return ear
        except:
            return 0.0
    
    def calculate_mouth_aspect_ratio(self, mouth_points: List[Tuple]) -> float:
        """Calculate Mouth Aspect Ratio (MAR)"""
        if len(mouth_points) < 8:
            return 0.0
        
        try:
            # Vertical mouth landmarks
            A = np.linalg.norm(np.array(mouth_points[2]) - np.array(mouth_points[6]))
            B = np.linalg.norm(np.array(mouth_points[3]) - np.array(mouth_points[7]))
            
            # Horizontal mouth landmark
            C = np.linalg.norm(np.array(mouth_points[0]) - np.array(mouth_points[4]))
            
            # MAR calculation
            mar = (A + B) / (2.0 * C)
            return mar
        except:
            return 0.0
    
    def calculate_eyebrow_height(self, eyebrow_points: List[Tuple], eye_points: List[Tuple]) -> float:
        """Calculate relative eyebrow height"""
        if not eyebrow_points or not eye_points:
            return 0.0
        
        try:
            # Average eyebrow y-coordinate
            eyebrow_y = np.mean([point[1] for point in eyebrow_points])
            
            # Average eye y-coordinate
            eye_y = np.mean([point[1] for point in eye_points])
            
            # Relative height (normalized)
            height_diff = abs(eyebrow_y - eye_y)
            return height_diff / 100.0  # Normalize
        except:
            return 0.0
    
    def calculate_face_symmetry(self, left_eye: List[Tuple], right_eye: List[Tuple]) -> float:
        """Calculate face symmetry based on eye positions"""
        if not left_eye or not right_eye:
            return 0.0
        
        try:
            left_center = np.mean(left_eye, axis=0)
            right_center = np.mean(right_eye, axis=0)
            
            # Calculate symmetry score (1.0 = perfect symmetry)
            y_diff = abs(left_center[1] - right_center[1])
            symmetry = max(0, 1.0 - (y_diff / 50.0))  # Normalize
            return symmetry
        except:
            return 0.0
    
    def detect_emotions(self, frame: np.ndarray) -> Dict:
        """Detect emotions using FER"""
        try:
            # Convert BGR to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Detect emotions
            emotions = self.emotion_detector.detect_emotions(rgb_frame)
            
            if not emotions:
                return {'detected': False}
            
            # Get the first (most prominent) face
            emotion_data = emotions[0]
            
            # Extract emotion scores
            emotion_scores = emotion_data['emotions']
            dominant_emotion = max(emotion_scores, key=emotion_scores.get)
            confidence = emotion_scores[dominant_emotion]
            
            return {
                'detected': True,
                'emotions': emotion_scores,
                'dominant_emotion': dominant_emotion,
                'confidence': confidence,
                'face_box': emotion_data['box']
            }
            
        except Exception as e:
            print(f"Error detecting emotions: {str(e)}")
            return {'detected': False}
    
    def analyze_video(self, video_path: str) -> Dict:
        """Complete video analysis pipeline"""
        try:
            # Extract frames
            frames, fps, total_frames = self.extract_frames(video_path, max_frames=50)
            
            if not frames:
                raise Exception("No frames extracted from video")
            
            # Initialize analysis results
            analysis_results = {
                'video_info': {
                    'total_frames': total_frames,
                    'fps': fps,
                    'duration': total_frames / fps if fps > 0 else 0,
                    'analyzed_frames': len(frames)
                },
                'face_detection': [],
                'facial_landmarks': [],
                'emotions': [],
                'micro_expressions': [],
                'summary': {}
            }
            
            # Analyze each frame
            for i, frame in enumerate(frames):
                frame_time = i * (analysis_results['video_info']['duration'] / len(frames))
                
                # Face detection
                faces = self.detect_faces(frame)
                analysis_results['face_detection'].append({
                    'frame': i,
                    'time': frame_time,
                    'faces_detected': len(faces),
                    'faces': faces
                })
                
                # Facial landmarks analysis
                landmarks_data = self.analyze_facial_landmarks(frame)
                landmarks_data['frame'] = i
                landmarks_data['time'] = frame_time
                analysis_results['facial_landmarks'].append(landmarks_data)
                
                # Emotion detection
                emotion_data = self.detect_emotions(frame)
                emotion_data['frame'] = i
                emotion_data['time'] = frame_time
                analysis_results['emotions'].append(emotion_data)
            
            # Generate summary
            analysis_results['summary'] = self.generate_video_summary(analysis_results)
            
            return analysis_results
            
        except Exception as e:
            raise Exception(f"Error in video analysis: {str(e)}")
    
    def generate_video_summary(self, analysis_results: Dict) -> Dict:
        """Generate summary of video analysis"""
        try:
            # Emotion analysis
            emotion_counts = {}
            total_detections = 0
            confidence_scores = []
            
            for emotion_data in analysis_results['emotions']:
                if emotion_data.get('detected', False):
                    total_detections += 1
                    dominant = emotion_data['dominant_emotion']
                    emotion_counts[dominant] = emotion_counts.get(dominant, 0) + 1
                    confidence_scores.append(emotion_data['confidence'])
            
            # Most frequent emotion
            most_frequent_emotion = max(emotion_counts, key=emotion_counts.get) if emotion_counts else 'neutral'
            
            # Facial expression metrics
            ear_values = []
            mar_values = []
            symmetry_values = []
            
            for landmark_data in analysis_results['facial_landmarks']:
                if landmark_data.get('detected', False):
                    metrics = landmark_data.get('metrics', {})
                    if 'eye_aspect_ratio' in metrics:
                        ear_values.append(metrics['eye_aspect_ratio'])
                    if 'mouth_aspect_ratio' in metrics:
                        mar_values.append(metrics['mouth_aspect_ratio'])
                    if 'face_symmetry' in metrics:
                        symmetry_values.append(metrics['face_symmetry'])
            
            # Calculate averages
            avg_ear = np.mean(ear_values) if ear_values else 0
            avg_mar = np.mean(mar_values) if mar_values else 0
            avg_symmetry = np.mean(symmetry_values) if symmetry_values else 0
            
            # Face detection consistency
            frames_with_faces = sum(1 for fd in analysis_results['face_detection'] if fd['faces_detected'] > 0)
            face_detection_rate = frames_with_faces / len(analysis_results['face_detection']) if analysis_results['face_detection'] else 0
            
            summary = {
                'emotion_analysis': {
                    'most_frequent_emotion': most_frequent_emotion,
                    'emotion_distribution': emotion_counts,
                    'average_confidence': np.mean(confidence_scores) if confidence_scores else 0,
                    'emotion_stability': len(set(emotion_counts.keys())) <= 3  # Stable if <= 3 different emotions
                },
                'facial_metrics': {
                    'average_eye_aspect_ratio': round(avg_ear, 3),
                    'average_mouth_aspect_ratio': round(avg_mar, 3),
                    'average_face_symmetry': round(avg_symmetry, 3),
                    'blink_frequency': sum(1 for ld in analysis_results['facial_landmarks'] 
                                         if ld.get('metrics', {}).get('blink_detected', False))
                },
                'engagement_metrics': {
                    'face_detection_rate': round(face_detection_rate, 3),
                    'eye_contact_quality': 'Good' if avg_ear > 0.2 else 'Poor',
                    'overall_engagement': 'High' if face_detection_rate > 0.8 and avg_ear > 0.2 else 'Medium' if face_detection_rate > 0.5 else 'Low'
                }
            }
            
            return summary
            
        except Exception as e:
            print(f"Error generating video summary: {str(e)}")
            return {}
    
    def create_video_visualization(self, analysis_results: Dict) -> str:
        """Create interactive visualization of video analysis"""
        try:
            # Create subplots
            fig = make_subplots(
                rows=3, cols=2,
                subplot_titles=[
                    'Emotion Timeline', 'Facial Metrics Over Time',
                    'Emotion Distribution', 'Eye & Mouth Activity',
                    'Face Detection Rate', 'Engagement Score'
                ],
                specs=[
                    [{"secondary_y": False}, {"secondary_y": False}],
                    [{"type": "pie"}, {"secondary_y": False}],
                    [{"secondary_y": False}, {"type": "indicator"}]
                ],
                vertical_spacing=0.12,
                horizontal_spacing=0.1
            )
            
            # Extract time series data
            times = []
            emotions = []
            ear_values = []
            mar_values = []
            symmetry_values = []
            
            for i, emotion_data in enumerate(analysis_results['emotions']):
                times.append(emotion_data.get('time', i))
                if emotion_data.get('detected', False):
                    emotions.append(emotion_data['dominant_emotion'])
                else:
                    emotions.append('unknown')
            
            for landmark_data in analysis_results['facial_landmarks']:
                if landmark_data.get('detected', False):
                    metrics = landmark_data.get('metrics', {})
                    ear_values.append(metrics.get('eye_aspect_ratio', 0))
                    mar_values.append(metrics.get('mouth_aspect_ratio', 0))
                    symmetry_values.append(metrics.get('face_symmetry', 0))
                else:
                    ear_values.append(0)
                    mar_values.append(0)
                    symmetry_values.append(0)
            
            # Emotion timeline
            emotion_numeric = [hash(e) % 7 for e in emotions]  # Convert to numeric for plotting
            fig.add_trace(
                go.Scatter(
                    x=times,
                    y=emotion_numeric,
                    mode='lines+markers',
                    name='Emotions',
                    line=dict(color='blue', width=2),
                    text=emotions,
                    hovertemplate='Time: %{x:.1f}s<br>Emotion: %{text}<extra></extra>'
                ),
                row=1, col=1
            )
            
            # Facial metrics over time
            if times:
                fig.add_trace(
                    go.Scatter(
                        x=times,
                        y=ear_values,
                        mode='lines',
                        name='Eye Aspect Ratio',
                        line=dict(color='green', width=2)
                    ),
                    row=1, col=2
                )
                
                fig.add_trace(
                    go.Scatter(
                        x=times,
                        y=mar_values,
                        mode='lines',
                        name='Mouth Aspect Ratio',
                        line=dict(color='red', width=2)
                    ),
                    row=1, col=2
                )
            
            # Emotion distribution
            emotion_counts = analysis_results['summary'].get('emotion_analysis', {}).get('emotion_distribution', {})
            if emotion_counts:
                fig.add_trace(
                    go.Pie(
                        labels=list(emotion_counts.keys()),
                        values=list(emotion_counts.values()),
                        name="Emotion Distribution"
                    ),
                    row=2, col=1
                )
            
            # Eye & Mouth Activity
            if times:
                fig.add_trace(
                    go.Scatter(
                        x=times,
                        y=symmetry_values,
                        mode='lines',
                        name='Face Symmetry',
                        line=dict(color='purple', width=2)
                    ),
                    row=2, col=2
                )
            
            # Face Detection Rate
            detection_rate = analysis_results['summary'].get('engagement_metrics', {}).get('face_detection_rate', 0)
            detection_times = [fd['time'] for fd in analysis_results['face_detection']]
            detection_values = [1 if fd['faces_detected'] > 0 else 0 for fd in analysis_results['face_detection']]
            
            fig.add_trace(
                go.Scatter(
                    x=detection_times,
                    y=detection_values,
                    mode='lines+markers',
                    name='Face Detected',
                    line=dict(color='orange', width=2),
                    fill='tonexty'
                ),
                row=3, col=1
            )
            
            # Engagement Score
            engagement = analysis_results['summary'].get('engagement_metrics', {}).get('overall_engagement', 'Medium')
            engagement_score = {'High': 85, 'Medium': 60, 'Low': 30}.get(engagement, 50)
            
            fig.add_trace(
                go.Indicator(
                    mode="gauge+number+delta",
                    value=engagement_score,
                    domain={'x': [0, 1], 'y': [0, 1]},
                    title={'text': "Engagement Score"},
                    gauge={
                        'axis': {'range': [None, 100]},
                        'bar': {'color': "darkblue"},
                        'steps': [
                            {'range': [0, 50], 'color': "lightgray"},
                            {'range': [50, 80], 'color': "gray"}
                        ],
                        'threshold': {
                            'line': {'color': "red", 'width': 4},
                            'thickness': 0.75,
                            'value': 90
                        }
                    }
                ),
                row=3, col=2
            )
            
            # Update layout
            fig.update_layout(
                height=1000,
                title_text="Advanced Video Analysis Dashboard",
                title_x=0.5,
                showlegend=True,
                font=dict(size=10)
            )
            
            # Update axes labels
            fig.update_xaxes(title_text="Time (s)", row=1, col=1)
            fig.update_yaxes(title_text="Emotion", row=1, col=1)
            fig.update_xaxes(title_text="Time (s)", row=1, col=2)
            fig.update_yaxes(title_text="Ratio", row=1, col=2)
            
            return fig.to_json()
            
        except Exception as e:
            print(f"Error creating video visualization: {str(e)}")
            return "{}"
    
    def generate_video_report(self, analysis_results: Dict) -> Dict:
        """Generate comprehensive video analysis report"""
        try:
            summary = analysis_results.get('summary', {})
            
            report = {
                'video_summary': {
                    'duration': analysis_results['video_info']['duration'],
                    'frames_analyzed': analysis_results['video_info']['analyzed_frames'],
                    'face_detection_rate': summary.get('engagement_metrics', {}).get('face_detection_rate', 0)
                },
                'emotion_analysis': {
                    'dominant_emotion': summary.get('emotion_analysis', {}).get('most_frequent_emotion', 'neutral'),
                    'emotion_stability': summary.get('emotion_analysis', {}).get('emotion_stability', False),
                    'confidence': summary.get('emotion_analysis', {}).get('average_confidence', 0)
                },
                'facial_expression': {
                    'eye_contact_quality': summary.get('engagement_metrics', {}).get('eye_contact_quality', 'Unknown'),
                    'facial_symmetry': summary.get('facial_metrics', {}).get('average_face_symmetry', 0),
                    'expression_variety': len(summary.get('emotion_analysis', {}).get('emotion_distribution', {}))
                },
                'engagement_assessment': {
                    'overall_engagement': summary.get('engagement_metrics', {}).get('overall_engagement', 'Medium'),
                    'visual_attention': 'Good' if summary.get('engagement_metrics', {}).get('face_detection_rate', 0) > 0.7 else 'Needs Improvement',
                    'non_verbal_communication': 'Effective' if summary.get('facial_metrics', {}).get('average_face_symmetry', 0) > 0.7 else 'Could be improved'
                },
                'recommendations': []
            }
            
            # Generate recommendations
            if report['video_summary']['face_detection_rate'] < 0.6:
                report['recommendations'].append("Maintain better eye contact with the camera")
            
            if report['emotion_analysis']['dominant_emotion'] in ['sad', 'angry', 'fear']:
                report['recommendations'].append("Try to project more positive emotions during the interview")
            
            if not report['emotion_analysis']['emotion_stability']:
                report['recommendations'].append("Work on maintaining consistent facial expressions")
            
            if report['facial_expression']['eye_contact_quality'] == 'Poor':
                report['recommendations'].append("Improve eye contact by looking directly at the camera")
            
            if not report['recommendations']:
                report['recommendations'].append("Excellent non-verbal communication! Keep it up.")
            
            return report
            
        except Exception as e:
            print(f"Error generating video report: {str(e)}")
            return {}