from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import sys
import os

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.recommendations import RecommendationEngine
import logging
from typing import Dict, Any
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize recommendation engine
engine = RecommendationEngine()

def validate_student_data(data: Dict[str, Any]) -> None:
    """
    Validate student data before processing.
    
    Args:
        data: Student data dictionary
        
    Raises:
        ValueError: If data is invalid
    """
    required_fields = [
        'current_cgpa', 'education_level', 'study_style', 'parent_education',
        'screen_time', 'sleep_time', 'overall_performance'
    ]
    
    subjects = ['ads', 'ds', 'am', 'java', 'dbms']
    for subject in subjects:
        required_fields.extend([
            f'{subject}_marks',
            f'{subject}_attendance',
            f'{subject}_interest'
        ])
    
    # Check for missing fields
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
    
    # Validate numerical ranges
    if not (0 <= data['current_cgpa'] <= 10):
        raise ValueError("CGPA must be between 0 and 10")
    
    if not (0 <= data['screen_time'] <= 24):
        raise ValueError("Screen time must be between 0 and 24 hours")
    
    if not (0 <= data['sleep_time'] <= 24):
        raise ValueError("Sleep time must be between 0 and 24 hours")
    
    if not (0 <= data['overall_performance'] <= 100):
        raise ValueError("Overall performance must be between 0 and 100")
    
    # Validate education level
    valid_education_levels = ['btech1', 'btech2', 'btech3', 'btech4']
    if data['education_level'] not in valid_education_levels:
        raise ValueError(f"Education level must be one of: {', '.join(valid_education_levels)}")
    
    # Validate study style
    valid_study_styles = ['reading', 'auditory', 'kinesthetic', 'visual']
    if data['study_style'] not in valid_study_styles:
        raise ValueError(f"Study style must be one of: {', '.join(valid_study_styles)}")
    
    # Validate parent education
    valid_parent_education = ['high_school', 'bachelors', 'masters', 'phd']
    if data['parent_education'] not in valid_parent_education:
        raise ValueError(f"Parent education must be one of: {', '.join(valid_parent_education)}")
    
    # Validate subject data
    for subject in subjects:
        if not (0 <= data[f'{subject}_marks'] <= 100):
            raise ValueError(f"{subject.upper()} marks must be between 0 and 100")
        
        if not (0 <= data[f'{subject}_attendance'] <= 100):
            raise ValueError(f"{subject.upper()} attendance must be between 0 and 100")
        
        if not (1 <= data[f'{subject}_interest'] <= 10):
            raise ValueError(f"{subject.upper()} interest must be between 1 and 10")

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        # Get student data from request
        student_data = request.json
        
        # Define the expected feature order
        expected_features = [
            'current_cgpa', 'education_level', 'study_style', 'parent_education',
            'screen_time', 'sleep_time', 'study_efficiency', 'overall_attendance',
            'overall_interest', 'overall_performance',
            
            # ADS features
            'ads_marks', 'ads_attendance', 'ads_interest', 'ads_assignments',
            'ads_quizzes', 'ads_participation', 'ads_performance',
            'ads_improvement', 'ads_confidence', 'ads_trend',
            
            # DS features
            'ds_marks', 'ds_attendance', 'ds_interest', 'ds_assignments',
            'ds_quizzes', 'ds_participation', 'ds_performance',
            'ds_improvement', 'ds_confidence', 'ds_trend',
            
            # AM features
            'am_marks', 'am_attendance', 'am_interest', 'am_assignments',
            'am_quizzes', 'am_participation', 'am_performance',
            'am_improvement', 'am_confidence', 'am_trend',
            
            # Java features
            'java_marks', 'java_attendance', 'java_interest', 'java_assignments',
            'java_quizzes', 'java_participation', 'java_performance',
            'java_improvement', 'java_confidence', 'java_trend',
            
            # DBMS features
            'dbms_marks', 'dbms_attendance', 'dbms_interest', 'dbms_assignments',
            'dbms_quizzes', 'dbms_participation', 'dbms_performance',
            'dbms_improvement', 'dbms_confidence', 'dbms_trend'
        ]
        
        # Convert to DataFrame with consistent feature order
        df = pd.DataFrame([student_data])
        
        # Calculate derived features if not provided
        subjects = ['ads', 'ds', 'am', 'java', 'dbms']
        
        if 'study_efficiency' not in df.columns:
            df['study_efficiency'] = df['sleep_time'] / (df['screen_time'] + 1)
        
        if 'overall_attendance' not in df.columns:
            df['overall_attendance'] = df[[f'{s}_attendance' for s in subjects]].mean(axis=1)
        
        if 'overall_interest' not in df.columns:
            df['overall_interest'] = df[[f'{s}_interest' for s in subjects]].mean(axis=1)
        
        if 'overall_performance' not in df.columns:
            df['overall_performance'] = df[[f'{s}_marks' for s in subjects]].mean(axis=1)
        
        # Calculate subject-specific features if not provided
        for subject in subjects:
            if f'{subject}_performance' not in df.columns:
                df[f'{subject}_performance'] = df[f'{subject}_marks']
            
            if f'{subject}_improvement' not in df.columns:
                df[f'{subject}_improvement'] = 0
            
            if f'{subject}_confidence' not in df.columns:
                df[f'{subject}_confidence'] = (
                    df[f'{subject}_attendance'] * 0.4 +
                    df[f'{subject}_interest'] * 10 * 0.3 +
                    (df[f'{subject}_marks'] / 100) * 30
                )
            
            if f'{subject}_trend' not in df.columns:
                df[f'{subject}_trend'] = 0
        
        # Ensure all expected features are present
        missing_features = [f for f in expected_features if f not in df.columns]
        if missing_features:
            raise ValueError(f"Missing required features: {', '.join(missing_features)}")
        
        # Reorder columns to match expected feature order
        df = df[expected_features]
        
        # Validate input data
        validate_student_data(df.to_dict('records')[0])
        
        # Generate predictions
        predictions = engine.generate_predictions(df)
        
        return jsonify({
            'success': True,
            'predictions': predictions
        })
        
    except ValueError as e:
        logger.warning(f"Invalid input data: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
        
    except Exception as e:
        logger.error(f"Error generating predictions: {str(e)}")
        return jsonify({
            'success': False,
            'error': "An unexpected error occurred while generating predictions"
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    try:
        # Test prediction with sample data
        sample_data = {
            'current_cgpa': 7.5,
            'education_level': 'btech2',
            'study_style': 'visual',
            'parent_education': 'bachelors',
            'screen_time': 6,
            'sleep_time': 7,
            'ads_marks': 75,
            'ads_attendance': 85,
            'ads_interest': 8,
            'ds_marks': 68,
            'ds_attendance': 80,
            'ds_interest': 7,
            'am_marks': 82,
            'am_attendance': 90,
            'am_interest': 9,
            'java_marks': 70,
            'java_attendance': 75,
            'java_interest': 6,
            'dbms_marks': 77,
            'dbms_attendance': 88,
            'dbms_interest': 8
        }
        
        df = pd.DataFrame([sample_data])
        predictions = engine.generate_predictions(df)
        
        return jsonify({
            'status': 'healthy',
            'models_loaded': len(engine.models) > 0,
            'subject_models_loaded': len(engine.subject_models) > 0
        })
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001) 