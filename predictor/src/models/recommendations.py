import pandas as pd
import numpy as np
import joblib
import json
import os
from typing import Dict, List, Tuple, Any
import logging
from sklearn.preprocessing import StandardScaler, LabelEncoder, MinMaxScaler
from dotenv import load_dotenv

try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

class RecommendationEngine:
    def __init__(self, model_dir: str = "models"):
        """
        Initialize the recommendation engine.
        
        Args:
            model_dir (str): Directory containing trained models
        """
        self.model_dir = model_dir
        self.models = {}
        self.subject_models = {}
        self.feature_importance = {}
        self.subject_feature_importance = {}
        self.scaler = StandardScaler()
        self.minmax_scaler = MinMaxScaler()
        self.label_encoders = {}
        self.gemini_model = None
        
        # Initialize Gemini only when available and configured.
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        if self.gemini_api_key and genai is not None:
            genai.configure(api_key=self.gemini_api_key)
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
        elif not self.gemini_api_key:
            logger.warning("GEMINI_API_KEY not found; using local fallback recommendations.")
        else:
            logger.warning("google.generativeai is unavailable; using local fallback recommendations.")
        
        # Initialize data preprocessor
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from data_preprocessing.prepare_data import DataPreprocessor
        self.data_preprocessor = DataPreprocessor("data/raw")
        
        self.load_models()
        self.load_preprocessors()
        
    def load_models(self) -> None:
        """Load trained models and feature importance data."""
        try:
            # Load overall performance models
            model_files = ['random_forest.joblib', 'xgboost.joblib', 'lightgbm.joblib']
            for file in model_files:
                model_path = os.path.join(self.model_dir, file)
                if not os.path.exists(model_path):
                    raise FileNotFoundError(f"Model file not found: {model_path}. Please run train_model.py first.")
                model_name = file.split('.')[0]
                self.models[model_name] = joblib.load(model_path)
            
            # Load subject-specific models
            subjects = ['ads', 'ds', 'am', 'java', 'dbms']
            for subject in subjects:
                for model_type in ['rf', 'xgb', 'lgb']:
                    model_path = os.path.join(self.model_dir, f"{subject}_{model_type}.joblib")
                    if os.path.exists(model_path):
                        self.subject_models[f"{subject}_{model_type}"] = joblib.load(model_path)
            
            # Load feature importance
            importance_path = os.path.join(self.model_dir, "feature_importance.json")
            if os.path.exists(importance_path):
                with open(importance_path, 'r') as f:
                    self.feature_importance = json.load(f)
            
            subject_importance_path = os.path.join(self.model_dir, "subject_feature_importance.json")
            if os.path.exists(subject_importance_path):
                with open(subject_importance_path, 'r') as f:
                    self.subject_feature_importance = json.load(f)
            
            logger.info("Models and feature importance loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise
    
    def load_preprocessors(self) -> None:
        """Load preprocessors from saved files."""
        try:
            # Load scalers
            scaler_path = os.path.join(self.model_dir, "scaler.joblib")
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
            
            minmax_scaler_path = os.path.join(self.model_dir, "minmax_scaler.joblib")
            if os.path.exists(minmax_scaler_path):
                self.minmax_scaler = joblib.load(minmax_scaler_path)
            
            # Load label encoders
            encoders_path = os.path.join(self.model_dir, "label_encoders.joblib")
            if os.path.exists(encoders_path):
                self.label_encoders = joblib.load(encoders_path)
            
            logger.info("Preprocessors loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading preprocessors: {str(e)}")
            raise
    
    def preprocess_data(self, student_data: Dict) -> pd.DataFrame:
        """
        Preprocess student data for prediction.
        
        Args:
            student_data (Dict): Student data dictionary
            
        Returns:
            pd.DataFrame: Preprocessed data
        """
        # Convert to DataFrame with proper structure
        if isinstance(student_data, pd.DataFrame):
            df = student_data.copy()
        else:
            # Flatten nested dictionary if present
            if 'profile' in student_data:
                flat_data = {
                    'current_cgpa': student_data.get('current_cgpa', 0),
                    'education_level': student_data.get('education_level', 'btech1'),
                    'study_style': student_data.get('study_style', 'visual'),
                    'parent_education': student_data.get('parent_education', 'bachelors'),
                    'screen_time': student_data.get('screen_time', 0),
                    'sleep_time': student_data.get('sleep_time', 0),
                }
                
                # Add subject data from profile
                subjects = ['ads', 'ds', 'am', 'java', 'dbms']
                for subject in subjects:
                    subject_data = student_data['profile'].get(subject, {})
                    flat_data.update({
                        f'{subject}_marks': subject_data.get('marks', 0),
                        f'{subject}_attendance': subject_data.get('attendance', 0),
                        f'{subject}_interest': subject_data.get('interest', 0),
                        f'{subject}_assignments': subject_data.get('assignments', 0),
                        f'{subject}_quizzes': subject_data.get('quizzes', 0),
                        f'{subject}_participation': subject_data.get('participation', 0)
                    })
            else:
                flat_data = student_data
            
            # Create DataFrame from flattened data
            df = pd.DataFrame([flat_data])
        
        # Ensure all required features are present
        required_features = [
            'current_cgpa', 'education_level', 'study_style', 'parent_education',
            'screen_time', 'sleep_time', 'study_efficiency', 'overall_attendance',
            'overall_interest', 'overall_performance'
        ]
        
        # Add subject-specific features
        subjects = ['ads', 'ds', 'am', 'java', 'dbms']
        for subject in subjects:
            required_features.extend([
                f'{subject}_marks', f'{subject}_attendance', f'{subject}_interest',
                f'{subject}_assignments', f'{subject}_quizzes', f'{subject}_participation'
            ])
        
        # Calculate derived features if not present
        if 'study_efficiency' not in df.columns:
            df['study_efficiency'] = df['sleep_time'] / (df['screen_time'] + 1)
        
        if 'overall_attendance' not in df.columns:
            df['overall_attendance'] = df[[f'{s}_attendance' for s in subjects]].mean(axis=1)
        
        if 'overall_interest' not in df.columns:
            df['overall_interest'] = df[[f'{s}_interest' for s in subjects]].mean(axis=1)
        
        if 'overall_performance' not in df.columns:
            df['overall_performance'] = df[[f'{s}_marks' for s in subjects]].mean(axis=1)
        
        # Check for missing features
        missing_features = [f for f in required_features if f not in df.columns]
        if missing_features:
            raise ValueError(f"Missing required features: {', '.join(missing_features)}")
        
        # Scale numerical features
        df = self.data_preprocessor.scale_numerical_features(df)
        
        # One-hot encode categorical features
        df = self.data_preprocessor.encode_categorical_features(df)
        
        # Ensure all required features are present after preprocessing
        for feature in required_features:
            if feature not in df.columns:
                # If feature was transformed during encoding, find its new name
                encoded_features = [col for col in df.columns if col.startswith(feature)]
                if not encoded_features:
                    raise ValueError(f"Feature {feature} is missing after preprocessing")
        
        logger.info("Data preprocessing completed successfully")
        return df
    
    def format_recommendations_html(self, recommendations: str) -> str:
        """
        Format the LLM recommendations into HTML for frontend display.
        
        Args:
            recommendations: Raw recommendations text from Gemini
            
        Returns:
            str: Formatted HTML string
        """
        try:
            # Split recommendations into sections
            sections = recommendations.split('\n\n')
            html_parts = []
            
            for section in sections:
                if not section.strip():
                    continue
                    
                # Check if section is a list
                if section.strip().startswith(('1.', '2.', '3.', '4.', '5.', '-', '*')):
                    # Format as unordered list
                    items = [item.strip() for item in section.split('\n') if item.strip()]
                    html_parts.append('<div class="mb-4">')
                    for item in items:
                        # Remove bullet points or numbers
                        clean_item = item.lstrip('12345.-* ').strip()
                        # Convert **text** to <strong>text</strong> while preserving the rest
                        parts = clean_item.split('**')
                        formatted_parts = []
                        for i, part in enumerate(parts):
                            if i % 2 == 0:  # Odd indices are between **
                                formatted_parts.append(f'<strong>{part}</strong>')
                            else:
                                formatted_parts.append(part)
                        formatted_item = ''.join(formatted_parts)
                        html_parts.append(f'<p class="text-gray-700 mb-2">{formatted_item}</p>')
                    html_parts.append('</div>')
                else:
                    # Format as paragraph
                    # Convert **text** to <strong>text</strong> while preserving the rest
                    parts = section.strip().split('**')
                    formatted_parts = []
                    for i, part in enumerate(parts):
                        if i % 2 == 0:  # Odd indices are between **
                            formatted_parts.append(f'<strong>{part}</strong>')
                        else:
                            formatted_parts.append(part)
                    formatted_text = ''.join(formatted_parts)
                    html_parts.append(f'<div class="mb-4"><p class="text-gray-700">{formatted_text}</p></div>')
            
            # Add overall styling
            html = f"""
            <div class="space-y-4">
                <div class="space-y-2">
                    {''.join(html_parts)}
                </div>
            </div>
            """
            
            return html
            
        except Exception as e:
            logger.error(f"Error formatting recommendations: {str(e)}")
            # Return basic HTML if formatting fails
            return f'<div class="text-gray-700">{recommendations}</div>'

    def generate_subject_recommendations(
        self,
        subject: str,
        current_score: float,
        predicted_score: float,
        attendance: float,
        interest: float,
        assignments: float,
        quizzes: float,
        participation: float
    ) -> str:
        """
        Generate personalized recommendations based on current performance and predicted trajectory.
        
        Args:
            subject: Subject code
            current_score: Current marks
            predicted_score: Predicted future marks
            attendance: Attendance percentage
            interest: Interest level (1-10)
            assignments: Assignment score
            quizzes: Quiz score
            participation: Participation score
            
        Returns:
            str: Formatted HTML recommendations
        """
        try:
            # Calculate performance indicators
            trend = predicted_score - current_score
            is_improving = trend > 0
            needs_improvement = current_score < 70
            
            # Build the prompt based on current status and trajectory
            prompt = f"""
            Generate personalized study recommendations for a student with the following {subject.upper()} performance metrics:
            
            Current Score: {current_score}%
            Predicted Score: {predicted_score}%
            Attendance: {attendance}%
            Interest Level: {interest}/10
            Assignment Score: {assignments}%
            Quiz Score: {quizzes}%
            Participation: {participation}%
            
            The student is currently {'improving' if is_improving else 'declining'} in performance.
            {'Significant improvement is needed' if needs_improvement else 'Performance is satisfactory but can be enhanced'}.
            
            Provide specific, actionable recommendations in the following format:
            
            **Current Status Analysis:**
            [Brief analysis of current performance and trajectory]
            
            **Key Areas to Focus:**
            [2-3 specific areas that need attention]
            
            **Study Strategy Recommendations:**
            [3-4 specific study techniques tailored to the student's current status]
            
            **Attendance and Engagement:**
            [Recommendations for improving attendance and class participation]
            
            **Performance Enhancement:**
            [Specific steps to improve performance based on current trajectory]
            
            **Confidence Building:**
            [Strategies to build confidence and maintain motivation]
            
            **Expected Progress:**
            [Provide a detailed prediction of the student's expected progress if they follow these recommendations. Include:
            1. Expected score improvement in percentage format (e.g., "Your score is likely to improve by 15-20%")
            2. Timeline for improvement (e.g., "within the next 2-3 weeks")
            3. Specific milestones they can expect to achieve
            4. Confidence level in this prediction based on their current trajectory]
            
            Format the response with clear sections and bullet points where appropriate.
            """
            
            if self.gemini_model is not None:
                # Generate recommendations using Gemini when configured.
                response = self.gemini_model.generate_content(prompt)
                recommendations = response.text
            else:
                recommendations = self._generate_local_recommendation_text(
                    subject=subject,
                    current_score=current_score,
                    predicted_score=predicted_score,
                    attendance=attendance,
                    interest=interest,
                    assignments=assignments,
                    quizzes=quizzes,
                    participation=participation,
                )
            
            # Format the recommendations into HTML
            return self.format_recommendations_html(recommendations)
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return self._generate_fallback_recommendations(
                subject, current_score, attendance, interest, predicted_score
            )

    def _generate_fallback_recommendations(self, subject: str, marks: float, attendance: float,
                                         interest: float, predicted_score: float) -> str:
        """
        Generate basic recommendations if Gemini fails.
        
        Args:
            subject: Subject name
            marks: Current marks
            attendance: Attendance percentage
            interest: Interest level (1-10)
            predicted_score: Predicted score
            
        Returns:
            str: Basic recommendations in HTML format
        """
        recommendations = []
        
        # Performance-based recommendations
        if marks < 60:
            recommendations.append("Focus on fundamental concepts and seek additional help if needed.")
        elif marks < 75:
            recommendations.append("Work on strengthening core concepts and practice regularly.")
        elif marks < 90:
            recommendations.append("Maintain current performance and focus on advanced topics.")
        else:
            recommendations.append("Excellent performance! Consider exploring advanced topics and real-world applications.")
        
        # Attendance-based recommendations
        if attendance < 75:
            recommendations.append("Improve attendance to enhance learning and understanding.")
        elif attendance < 85:
            recommendations.append("Maintain good attendance for consistent learning.")
        
        # Interest-based recommendations
        if interest < 5:
            recommendations.append("Try to engage more with practical applications to increase interest.")
        elif interest < 7:
            recommendations.append("Explore real-world applications to maintain interest.")
        
        # Prediction-based recommendations
        if predicted_score > marks + 5:
            recommendations.append("Your current efforts are showing good progress, keep it up!")
        elif predicted_score < marks - 5:
            recommendations.append("Review recent topics and identify areas needing improvement.")
        
        # Format as HTML
        html = f"""
        <div class="space-y-4">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Basic Recommendations</h3>
            <ul class="list-disc pl-4 space-y-2">
                {''.join(f'<li class="text-gray-700">{rec}</li>' for rec in recommendations)}
            </ul>
        </div>
        """
        
        return html

    def _generate_local_recommendation_text(
        self,
        subject: str,
        current_score: float,
        predicted_score: float,
        attendance: float,
        interest: float,
        assignments: float,
        quizzes: float,
        participation: float,
    ) -> str:
        """
        Build deterministic study recommendations when Gemini is unavailable.

        Returns plain text that can still be formatted into HTML by the existing renderer.
        """
        trend = predicted_score - current_score
        sections = [
            f"**Current Status Analysis:**\nYour {subject.upper()} score is {current_score:.1f}% and the model projects {predicted_score:.1f}%.",
            "**Key Areas to Focus:**\n- Review weak concepts from recent chapters.\n- Improve assignment and quiz consistency.\n- Keep participation active in class.",
            "**Study Strategy Recommendations:**\n- Use short daily revision sessions.\n- Practice 10-15 questions after each topic.\n- Summarize mistakes and revisit them weekly.",
            "**Attendance and Engagement:**\n- Keep attendance above 85% for stable progress.\n- Ask at least one question in class each week.",
            "**Performance Enhancement:**\n- Track quiz scores and correct repeated errors.\n- Rework low-scoring assignments before the next test.",
            "**Confidence Building:**\n- Set a small weekly target and measure progress.\n- Focus on consistency rather than large one-time effort.",
            f"**Expected Progress:**\nIf you keep improving, your {subject.upper()} score can move by {abs(trend):.0f} points over the next few weeks.",
        ]

        return "\n\n".join(sections)
    
    def predict_subject_performance(self, student_data: Dict) -> List[Dict]:
        """
        Predict performance for each subject based on current trajectory.
        
        Args:
            student_data: Dictionary containing student's current data
            
        Returns:
            List of dictionaries containing predictions for each subject
        """
        try:
            # Preprocess the input data
            processed_data = self.preprocess_data(student_data)
            
            predictions = []
            subjects = ['ads', 'ds', 'am', 'java', 'dbms']
            subject_names = {
                'ads': 'ADS (Advanced Data Structures)',
                'ds': 'DS (Data Structures)',
                'am': 'AM (Applied Mathematics)',
                'java': 'JAVA (Java Programming)',
                'dbms': 'DBMS (Database Management)'
            }
            
            for subject in subjects:
                # Convert Series to float using the recommended method
                current_score = float(student_data[f'{subject}_marks'].iloc[0])
                
                # Calculate trend indicators with more granular weights
                attendance_trend = float(student_data[f'{subject}_attendance'].iloc[0]) / 100
                interest_trend = float(student_data[f'{subject}_interest'].iloc[0]) / 10
                assignment_trend = float(student_data[f'{subject}_assignments'].iloc[0]) / 100
                quiz_trend = float(student_data[f'{subject}_quizzes'].iloc[0]) / 100
                participation_trend = float(student_data[f'{subject}_participation'].iloc[0]) / 100
                
                # Calculate weighted trend score (0-1) with adjusted weights
                trend_score = float(
                    attendance_trend * 0.25 +      # Attendance is crucial
                    interest_trend * 0.25 +        # Interest drives engagement
                    assignment_trend * 0.2 +       # Assignments show consistency
                    quiz_trend * 0.2 +            # Quizzes show understanding
                    participation_trend * 0.1      # Participation is supplementary
                )
                
                # Calculate confidence based on data consistency and trend strength
                confidence = min(100, int(trend_score * 100))
                
                # Calculate predicted score based on current trajectory
                # If trend is positive (above 0.7), score may increase significantly
                # If trend is negative (below 0.3), score may decrease significantly
                # If trend is neutral (0.3-0.7), score stays similar
                if trend_score > 0.7:
                    # Strong positive trajectory: significant improvement possible
                    improvement_factor = (trend_score - 0.7) * 3  # Max 0.9
                    predicted_score = min(100, current_score * (1 + improvement_factor))
                elif trend_score < 0.3:
                    # Strong negative trajectory: significant decline possible
                    decline_factor = (0.3 - trend_score) * 3  # Max 0.9
                    predicted_score = max(0, current_score * (1 - decline_factor))
                else:
                    # Neutral trajectory: minor changes possible
                    if trend_score > 0.5:
                        # Slightly positive: small improvement
                        predicted_score = min(100, current_score * 1.05)
                    elif trend_score < 0.5:
                        # Slightly negative: small decline
                        predicted_score = max(0, current_score * 0.95)
                    else:
                        # Exactly neutral: no change
                        predicted_score = current_score
                
                # Calculate improvement percentage
                improvement = int(predicted_score - current_score)
                improvement_str = f"{'+' if improvement > 0 else ''}{improvement}"
                
                # Generate recommendations based on current status and predicted trajectory
                recommendations = self.generate_subject_recommendations(
                    subject=subject,
                    current_score=current_score,
                    predicted_score=predicted_score,
                    attendance=float(student_data[f'{subject}_attendance'].iloc[0]),
                    interest=float(student_data[f'{subject}_interest'].iloc[0]),
                    assignments=float(student_data[f'{subject}_assignments'].iloc[0]),
                    quizzes=float(student_data[f'{subject}_quizzes'].iloc[0]),
                    participation=float(student_data[f'{subject}_participation'].iloc[0])
                )
                
                predictions.append({
                    'subject': subject_names[subject],
                    'currentScore': current_score,
                    'predictedScore': round(predicted_score, 2),
                    'improvement': improvement_str,
                    'confidence': f"{confidence}%",
                    'recommendations': recommendations
                })
            
            logger.info("Subject predictions generated successfully")
            return predictions
            
        except Exception as e:
            logger.error(f"Error generating predictions: {str(e)}")
            raise
    
    def generate_predictions(self, student_data: pd.DataFrame) -> List[Dict]:
        """
        Generate comprehensive predictions and recommendations.
        
        Args:
            student_data: Student features
            
        Returns:
            List[Dict]: Complete predictions and recommendations
        """
        # Get subject-wise predictions
        subject_predictions = self.predict_subject_performance(student_data)
        print("Subject predictions generated successfully")
        
        # Format predictions for frontend
        predictions = []
        for pred in subject_predictions:
            predictions.append({
                'subject': pred['subject'],
                'currentScore': pred['currentScore'],
                'predictedScore': pred['predictedScore'],
                'improvement': pred['improvement'],
                'confidence': pred['confidence'],
                'recommendations': pred['recommendations']
            })

        print("Predictions generated successfully")
        print(predictions)
        
        return predictions
    
    def get_subject_full_name(self, subject: str) -> str:
        """Get full name of subject."""
        subject_names = {
            'ads': 'Advanced Data Structures',
            'ds': 'Data Structures',
            'am': 'Applied Mathematics',
            'java': 'Java Programming',
            'dbms': 'Database Management'
        }
        return subject_names.get(subject, subject)

if __name__ == "__main__":
    # Initialize the recommendation engine
    engine = RecommendationEngine()
    print("Recommendation engine initialized successfully")
    
    # Example student data
    student_data = pd.DataFrame({
        'current_cgpa': [7.5],
        'education_level': ['btech2'],
        'study_style': ['visual'],
        'parent_education': ['bachelors'],
        'screen_time': [6],
        'sleep_time': [7],
        'study_efficiency': [0.8],
        'overall_attendance': [85],
        'overall_interest': [7.5],
        
        # ADS features
        'ads_marks': [75],
        'ads_attendance': [85],
        'ads_interest': [8],
        'ads_assignments': [80],
        'ads_quizzes': [78],
        'ads_participation': [85],
        
        # DS features
        'ds_marks': [68],
        'ds_attendance': [80],
        'ds_interest': [7],
        'ds_assignments': [75],
        'ds_quizzes': [70],
        'ds_participation': [78],
        
        # AM features
        'am_marks': [72],
        'am_attendance': [82],
        'am_interest': [7.5],
        'am_assignments': [75],
        'am_quizzes': [70],
        'am_participation': [80],
        
        # Java features
        'java_marks': [70],
        'java_attendance': [78],
        'java_interest': [7],
        'java_assignments': [72],
        'java_quizzes': [68],
        'java_participation': [75],
        
        # DBMS features
        'dbms_marks': [75],
        'dbms_attendance': [85],
        'dbms_interest': [8],
        'dbms_assignments': [80],
        'dbms_quizzes': [75],
        'dbms_participation': [82]
    })
    
    try:
        print("\nGenerating predictions for example student data...")
        predictions = engine.generate_predictions(student_data)
        print("Predictions generated successfully")
        
        # Print results
        print("\nSubject-wise Predictions:")
        for pred in predictions:
            print(f"\n{pred['subject']}:")
            print(f"Current Score: {pred['currentScore']}%")
            print(f"Predicted Score: {pred['predictedScore']}%")
            print(f"Improvement: {pred['improvement']}%")
            print(f"Confidence: {pred['confidence']}")
            print(f"Recommendations: {pred['recommendations']}")
            
    except Exception as e:
        print(f"\nError during prediction: {str(e)}")
        print("\nDetailed error information:")
        import traceback
        traceback.print_exc() 