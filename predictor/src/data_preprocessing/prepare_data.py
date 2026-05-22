import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder, MinMaxScaler
from sklearn.model_selection import train_test_split
import os
from typing import Tuple, Dict, List
import logging
import joblib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataPreprocessor:
    def __init__(self, data_path: str):
        """
        Initialize the data preprocessor.
        
        Args:
            data_path (str): Path to the raw data directory
        """
        self.data_path = data_path
        self.scaler = StandardScaler()
        self.minmax_scaler = MinMaxScaler()
        self.label_encoders = {}
        
    def load_data(self) -> pd.DataFrame:
        """
        Load and combine all relevant data sources.
        
        Returns:
            pd.DataFrame: Combined dataset
        """
        try:
            # Load academic records
            academic_data = pd.read_csv(os.path.join(self.data_path, 'academic_records.csv'))
            
            # Calculate subject-wise performance metrics
            subjects = ['ads', 'ds', 'am', 'java', 'dbms']
            for subject in subjects:
                # Calculate performance score (0-100)
                academic_data[f'{subject}_performance'] = (
                    academic_data[f'{subject}_marks'] * 0.4 + 
                    academic_data[f'{subject}_attendance'] * 0.3 + 
                    academic_data[f'{subject}_interest'] * 3 +  # Interest is 1-10, so multiply by 3
                    academic_data[f'{subject}_assignments'] * 0.15 +
                    academic_data[f'{subject}_quizzes'] * 0.15
                )
                
                # Calculate improvement potential
                academic_data[f'{subject}_improvement'] = 100 - academic_data[f'{subject}_performance']
                
                # Calculate confidence score (0-100)
                academic_data[f'{subject}_confidence'] = (
                    academic_data[f'{subject}_attendance'] * 0.4 +
                    academic_data[f'{subject}_interest'] * 3 +  # Interest is 1-10, so multiply by 3
                    academic_data[f'{subject}_participation'] * 0.3
                )
            
            # Calculate overall performance
            academic_data['overall_performance'] = academic_data[[f'{s}_performance' for s in subjects]].mean(axis=1)
            
            logger.info(f"Successfully loaded and processed data. Shape: {academic_data.shape}")
            return academic_data
            
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise
    
    def handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle missing values in the dataset.
        
        Args:
            df (pd.DataFrame): Input dataframe
            
        Returns:
            pd.DataFrame: DataFrame with handled missing values
        """
        # Create a copy to avoid chained assignment warnings
        df = df.copy()
        
        # Fill numerical missing values with median
        numerical_columns = df.select_dtypes(include=[np.number]).columns
        for col in numerical_columns:
            df[col] = df[col].fillna(df[col].median())
        
        # Fill categorical missing values with mode
        categorical_columns = df.select_dtypes(include=['object']).columns
        for col in categorical_columns:
            df[col] = df[col].fillna(df[col].mode()[0])
            
        logger.info("Handled missing values successfully")
        return df
    
    def encode_categorical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Encode categorical features using Label Encoding.
        
        Args:
            df (pd.DataFrame): Input dataframe
            
        Returns:
            pd.DataFrame: DataFrame with encoded categorical features
        """
        # Create a copy to avoid chained assignment warnings
        df = df.copy()
        
        categorical_columns = ['education_level', 'study_style', 'parent_education']
        
        for col in categorical_columns:
            if col in df.columns:
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    df[col] = self.label_encoders[col].fit_transform(df[col])
                else:
                    # Handle unseen labels by adding them to the encoder's classes
                    try:
                        df[col] = self.label_encoders[col].transform(df[col])
                    except ValueError:
                        # Get current classes
                        current_classes = set(self.label_encoders[col].classes_)
                        # Get new unique values
                        new_values = set(df[col].unique())
                        # Find unseen values
                        unseen_values = new_values - current_classes
                        
                        if unseen_values:
                            logger.warning(f"Found unseen labels in {col}: {unseen_values}")
                            # Add unseen values to the encoder's classes
                            self.label_encoders[col].classes_ = np.append(
                                self.label_encoders[col].classes_,
                                list(unseen_values)
                            )
                            # Transform the data
                            df[col] = self.label_encoders[col].transform(df[col])
                
        logger.info("Encoded categorical features successfully")
        return df
    
    def scale_numerical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Scale numerical features using appropriate scalers.
        
        Args:
            df (pd.DataFrame): Input dataframe
            
        Returns:
            pd.DataFrame: DataFrame with scaled numerical features
        """
        # Create a copy to avoid chained assignment warnings
        df = df.copy()
        
        # Define columns that should be scaled to 0-100 range
        minmax_columns = [
            'current_cgpa', 'screen_time', 'sleep_time', 'study_efficiency',
            'overall_attendance', 'overall_interest'
        ]
        
        # Ensure all minmax columns are present
        missing_columns = [col for col in minmax_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns for scaling: {missing_columns}")
        
        # Create a DataFrame with only the minmax columns
        df_minmax = df[minmax_columns].copy()
        
        # Scale CGPA separately (assuming max CGPA is 10)
        df_minmax['current_cgpa'] = df_minmax['current_cgpa'] * 10
        
        # Scale other features to 0-100 range
        other_columns = [col for col in minmax_columns if col != 'current_cgpa']
        if other_columns:
            df_minmax[other_columns] = self.minmax_scaler.fit_transform(df_minmax[other_columns]) * 100
        
        # Update the original DataFrame with scaled values
        df[minmax_columns] = df_minmax
        
        # Scale subject-specific features
        subjects = ['ads', 'ds', 'am', 'java', 'dbms']
        for subject in subjects:
            # Scale marks to 0-100 range (already in correct range)
            df[f'{subject}_marks'] = df[f'{subject}_marks']
            
            # Scale attendance to 0-100 range (already in correct range)
            df[f'{subject}_attendance'] = df[f'{subject}_attendance']
            
            # Scale interest to 1-10 range (already in correct range)
            df[f'{subject}_interest'] = df[f'{subject}_interest']
            
            # Scale assignments, quizzes, and participation to 0-100 range
            for metric in ['assignments', 'quizzes', 'participation']:
                df[f'{subject}_{metric}'] = df[f'{subject}_{metric}']
        
        logger.info("Scaled numerical features successfully")
        return df
    
    def create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create new features from existing data.
        
        Args:
            df (pd.DataFrame): Input dataframe
            
        Returns:
            pd.DataFrame: DataFrame with new features
        """
        # Create a copy to avoid chained assignment warnings
        df = df.copy()
        
        # Calculate study efficiency (0-100)
        df['study_efficiency'] = (df['sleep_time'] / (df['screen_time'] + 1)) * 10
        
        # Calculate overall metrics
        subjects = ['ads', 'ds', 'am', 'java', 'dbms']
        df['overall_attendance'] = df[[f'{s}_attendance' for s in subjects]].mean(axis=1)
        df['overall_interest'] = df[[f'{s}_interest' for s in subjects]].mean(axis=1)
        
        # Calculate performance trends
        for subject in subjects:
            df[f'{subject}_trend'] = (
                df[f'{subject}_assignments'] * 0.4 +
                df[f'{subject}_quizzes'] * 0.4 +
                df[f'{subject}_participation'] * 0.2
            )
        
        logger.info("Created new features successfully")
        return df
    
    def prepare_data(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Prepare data for model training.
        
        Returns:
            Tuple containing:
            - X_train: Training features
            - X_test: Testing features
            - y_train: Training labels (DataFrame with subject-wise targets)
            - y_test: Testing labels (DataFrame with subject-wise targets)
        """
        # Load and preprocess data
        df = self.load_data()
        df = self.handle_missing_values(df)
        df = self.create_features(df)
        df = self.encode_categorical_features(df)
        df = self.scale_numerical_features(df)
        
        # Prepare features
        feature_columns = [
            'current_cgpa', 'education_level', 'study_style', 'parent_education',
            'screen_time', 'sleep_time', 'study_efficiency', 'overall_attendance',
            'overall_interest'
        ]
        
        # Add subject-specific features
        subjects = ['ads', 'ds', 'am', 'java', 'dbms']
        for subject in subjects:
            feature_columns.extend([
                f'{subject}_marks',
                f'{subject}_attendance',
                f'{subject}_interest',
                f'{subject}_assignments',
                f'{subject}_quizzes',
                f'{subject}_participation'
            ])
        
        # Prepare targets
        target_columns = [f'{subject}_performance' for subject in subjects]
        
        # Split features and targets
        X = df[feature_columns]
        y = df[target_columns]
        
        # Split into train and test sets
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        logger.info("Data preparation completed successfully")
        return X_train, X_test, y_train, y_test
    
    def save_preprocessors(self, output_dir: str) -> None:
        """
        Save preprocessors for later use.
        
        Args:
            output_dir (str): Directory to save preprocessors
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # Save scalers
        joblib.dump(self.scaler, os.path.join(output_dir, "scaler.joblib"))
        joblib.dump(self.minmax_scaler, os.path.join(output_dir, "minmax_scaler.joblib"))
        
        # Save label encoders
        joblib.dump(self.label_encoders, os.path.join(output_dir, "label_encoders.joblib"))
        
        logger.info("Preprocessors saved successfully")

if __name__ == "__main__":
    # Example usage
    preprocessor = DataPreprocessor("data/raw")
    X_train, X_test, y_train, y_test = preprocessor.prepare_data()
    
    # Save processed data
    processed_data_path = "data/processed"
    os.makedirs(processed_data_path, exist_ok=True)
    
    pd.DataFrame(X_train).to_csv(os.path.join(processed_data_path, "X_train.csv"), index=False)
    pd.DataFrame(X_test).to_csv(os.path.join(processed_data_path, "X_test.csv"), index=False)
    y_train.to_csv(os.path.join(processed_data_path, "y_train.csv"), index=False)
    y_test.to_csv(os.path.join(processed_data_path, "y_test.csv"), index=False)
    
    # Save preprocessors
    preprocessor.save_preprocessors("models") 