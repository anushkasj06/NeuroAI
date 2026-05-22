import pandas as pd
import numpy as np
import os
from typing import Tuple

def generate_academic_records(n_samples: int = 1000) -> pd.DataFrame:
    """Generate sample academic records with realistic patterns."""
    np.random.seed(42)
    
    # Generate base student characteristics
    data = {
        'student_id': range(1, n_samples + 1),
        'current_cgpa': np.random.normal(7.0, 1.5, n_samples).clip(0, 10),
        'education_level': np.random.choice(['btech1', 'btech2', 'btech3', 'btech4'], n_samples),
        'study_style': np.random.choice(['reading', 'auditory', 'kinesthetic', 'visual'], n_samples),
        'parent_education': np.random.choice(['high_school', 'bachelors', 'masters', 'phd'], n_samples),
        'screen_time': np.random.randint(0, 25, n_samples),
        'sleep_time': np.random.randint(4, 13, n_samples)
    }
    
    # Define subjects and their characteristics
    subjects = {
        'ads': {'difficulty': 0.8, 'practical_weight': 0.7},
        'ds': {'difficulty': 0.7, 'practical_weight': 0.6},
        'am': {'difficulty': 0.9, 'practical_weight': 0.4},
        'java': {'difficulty': 0.6, 'practical_weight': 0.8},
        'dbms': {'difficulty': 0.5, 'practical_weight': 0.5}
    }
    
    # Generate subject-specific data with realistic correlations
    for subject, params in subjects.items():
        # Base performance influenced by CGPA and study style
        base_performance = data['current_cgpa'] * 10 + np.random.normal(0, 5, n_samples)
        
        # Attendance influenced by base performance and random factor
        attendance = np.clip(base_performance * 0.5 + np.random.normal(30, 10, n_samples), 0, 100)
        
        # Interest influenced by performance and practical weight
        interest = np.clip(
            (base_performance * 0.1 + params['practical_weight'] * 5 + np.random.normal(0, 2, n_samples)),
            1, 10
        )
        
        # Marks influenced by base performance, attendance, interest and difficulty
        marks = np.clip(
            base_performance * 0.4 + 
            attendance * 0.3 + 
            interest * 2 + 
            (1 - params['difficulty']) * 10 + 
            np.random.normal(0, 5, n_samples),
            0, 100
        )
        
        # Add to data dictionary
        data[f'{subject}_marks'] = marks
        data[f'{subject}_attendance'] = attendance
        data[f'{subject}_interest'] = interest
        
        # Add additional features
        data[f'{subject}_assignments'] = np.clip(marks * 0.8 + np.random.normal(0, 5, n_samples), 0, 100)
        data[f'{subject}_quizzes'] = np.clip(marks * 0.7 + np.random.normal(0, 5, n_samples), 0, 100)
        data[f'{subject}_participation'] = np.clip(attendance * 0.3 + interest * 2 + np.random.normal(0, 3, n_samples), 0, 100)
        
        # Calculate performance score (0-100)
        data[f'{subject}_performance'] = (
            marks * 0.4 + 
            attendance * 0.3 + 
            interest * 3 +  # Interest is 1-10, so multiply by 3
            data[f'{subject}_assignments'] * 0.15 +
            data[f'{subject}_quizzes'] * 0.15
        )
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Add derived features
    df['study_efficiency'] = df['sleep_time'] / (df['screen_time'] + 1)
    df['overall_attendance'] = df[[f'{s}_attendance' for s in subjects.keys()]].mean(axis=1)
    df['overall_interest'] = df[[f'{s}_interest' for s in subjects.keys()]].mean(axis=1)
    
    return df

def generate_attendance_data(n_samples: int = 1000) -> pd.DataFrame:
    """Generate sample attendance data."""
    np.random.seed(42)
    
    data = {
        'student_id': range(1, n_samples + 1),
        'days_present': np.random.randint(120, 180, n_samples),
        'total_days': np.full(n_samples, 180),
        'attendance_rate': np.random.normal(0.85, 0.1, n_samples).clip(0, 1)
    }
    
    return pd.DataFrame(data)

def generate_study_habits(n_samples: int = 1000) -> pd.DataFrame:
    """Generate sample study habits data."""
    np.random.seed(42)
    
    data = {
        'student_id': range(1, n_samples + 1),
        'total_study_hours': np.random.randint(10, 40, n_samples),
        'study_efficiency': np.random.normal(0.7, 0.15, n_samples).clip(0, 1),
        'preferred_study_time': np.random.choice(['morning', 'afternoon', 'evening'], n_samples),
        'study_method': np.random.choice(['individual', 'group', 'both'], n_samples)
    }
    
    return pd.DataFrame(data)

def generate_demographics(n_samples: int = 1000) -> pd.DataFrame:
    """Generate sample demographic data."""
    np.random.seed(42)
    
    data = {
        'student_id': range(1, n_samples + 1),
        'age': np.random.randint(16, 25, n_samples),
        'gender': np.random.choice(['M', 'F'], n_samples),
        'grade_level': np.random.randint(9, 13, n_samples),
        'parent_education': np.random.choice(['high_school', 'bachelors', 'masters', 'phd'], n_samples)
    }
    
    return pd.DataFrame(data)

def generate_sample_data(n_samples: int = 1000) -> None:
    """
    Generate sample data for all required datasets.
    
    Args:
        n_samples: Number of samples to generate
    """
    # Create data directory if it doesn't exist
    os.makedirs('data/raw', exist_ok=True)
    
    # Generate academic records
    academic_records = generate_academic_records(n_samples)
    
    # Save dataset
    academic_records.to_csv('data/raw/academic_records.csv', index=False)
    
    print(f"Generated {n_samples} samples")
    print("Data saved in data/raw/academic_records.csv")

if __name__ == "__main__":
    generate_sample_data() 