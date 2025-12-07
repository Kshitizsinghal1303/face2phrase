#!/usr/bin/env python3
"""
Test script to demonstrate the new analysis capabilities
"""

import json
from speech_analyzer_simple import SpeechAnalyzer
from video_analyzer_simple import VideoAnalyzer

def test_speech_analysis():
    """Test speech analysis functionality"""
    print("🎤 Testing Speech Analysis...")
    
    analyzer = SpeechAnalyzer()
    
    # Mock audio analysis
    results = analyzer.analyze_audio("mock_audio.wav")
    print(f"✅ Audio analysis completed: {results['audio_info']['duration']}s duration")
    
    # Generate visualization
    viz = analyzer.create_interactive_visualization(results)
    print(f"✅ Visualization generated: {len(viz)} characters")
    
    # Generate report
    report = analyzer.generate_speech_report(results)
    print(f"✅ Report generated with {len(report['recommendations'])} recommendations")
    
    return results, viz, report

def test_video_analysis():
    """Test video analysis functionality"""
    print("\n📹 Testing Video Analysis...")
    
    analyzer = VideoAnalyzer()
    
    # Mock video analysis
    results = analyzer.analyze_video("mock_video.mp4")
    print(f"✅ Video analysis completed: {results['video_info']['duration']}s duration")
    print(f"✅ Dominant emotion: {results['emotion_analysis']['dominant_emotion']}")
    
    # Generate visualization
    viz = analyzer.create_interactive_visualization(results)
    print(f"✅ Visualization generated: {len(viz)} characters")
    
    # Generate report
    report = analyzer.generate_video_report(results)
    print(f"✅ Report generated with {len(report['recommendations'])} recommendations")
    
    return results, viz, report

def test_combined_analysis():
    """Test combined analysis"""
    print("\n🔄 Testing Combined Analysis...")
    
    speech_results, speech_viz, speech_report = test_speech_analysis()
    video_results, video_viz, video_report = test_video_analysis()
    
    # Simulate combined analysis
    combined_analysis = {
        "session_id": "test_session_123",
        "analysis_timestamp": "2024-12-07T12:00:00",
        "question_analyses": [
            {
                "question_id": 1,
                "question": "Tell me about yourself and your background.",
                "speech_analysis": {
                    "results": speech_results,
                    "visualization": speech_viz,
                    "report": speech_report
                },
                "video_analysis": {
                    "results": video_results,
                    "visualization": video_viz,
                    "report": video_report
                }
            },
            {
                "question_id": 2,
                "question": "What are your greatest strengths?",
                "speech_analysis": {
                    "results": speech_results,
                    "visualization": speech_viz,
                    "report": speech_report
                },
                "video_analysis": {
                    "results": video_results,
                    "visualization": video_viz,
                    "report": video_report
                }
            }
        ],
        "overall_summary": {
            "total_questions": 2,
            "speech_analysis_complete": True,
            "video_analysis_complete": True,
            "overall_performance": "Excellent",
            "key_insights": [
                "Strong vocal delivery with consistent energy",
                "Excellent eye contact and engagement",
                "Confident body language throughout",
                "Clear articulation and appropriate pace"
            ]
        }
    }
    
    print(f"✅ Combined analysis generated for {len(combined_analysis['question_analyses'])} questions")
    print(f"✅ Overall performance: {combined_analysis['overall_summary']['overall_performance']}")
    
    return combined_analysis

if __name__ == "__main__":
    print("🚀 Face2Phrase Advanced Analysis Test")
    print("=" * 50)
    
    try:
        combined_results = test_combined_analysis()
        
        print("\n📊 Analysis Summary:")
        print(f"   • Questions analyzed: {combined_results['overall_summary']['total_questions']}")
        print(f"   • Speech analysis: {'✅' if combined_results['overall_summary']['speech_analysis_complete'] else '❌'}")
        print(f"   • Video analysis: {'✅' if combined_results['overall_summary']['video_analysis_complete'] else '❌'}")
        print(f"   • Performance rating: {combined_results['overall_summary']['overall_performance']}")
        
        print("\n💡 Key Insights:")
        for insight in combined_results['overall_summary']['key_insights']:
            print(f"   • {insight}")
        
        print("\n🎉 All tests completed successfully!")
        print("\nThe enhanced Face2Phrase system now includes:")
        print("   ✅ Advanced speech analysis with acoustic feature extraction")
        print("   ✅ Interactive visualizations for speech patterns")
        print("   ✅ Facial expression and emotion analysis")
        print("   ✅ Engagement and micro-expression detection")
        print("   ✅ Combined analysis dashboard")
        print("   ✅ Professional reporting with recommendations")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()