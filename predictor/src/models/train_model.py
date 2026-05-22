import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import xgboost as xgb
import lightgbm as lgb
from sklearn.model_selection import cross_val_score, KFold
import optuna
import joblib
import os
import logging
from typing import Dict, Tuple, List
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StudentPerformanceModel:
    def __init__(self, model_dir: str = "models"):
        """
        Initialize the student performance prediction model.
        
        Args:
            model_dir (str): Directory to save trained models
        """
        self.model_dir = model_dir
        self.models = {}
        self.subject_models = {}
        self.feature_importance = {}
        self.subject_feature_importance = {}
        os.makedirs(model_dir, exist_ok=True)
        
    def load_data(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """
        Load processed training and testing data.
        
        Returns:
            Tuple containing training and testing data
        """
        data_dir = "data/processed"
        X_train = pd.read_csv(os.path.join(data_dir, "X_train.csv"))
        X_test = pd.read_csv(os.path.join(data_dir, "X_test.csv"))
        y_train = pd.read_csv(os.path.join(data_dir, "y_train.csv")).squeeze()
        y_test = pd.read_csv(os.path.join(data_dir, "y_test.csv")).squeeze()
        
        logger.info(f"Loaded data - Train shape: {X_train.shape}, Test shape: {X_test.shape}")
        return X_train, X_test, y_train, y_test
    
    def optimize_random_forest(self, X_train: pd.DataFrame, y_train: pd.Series) -> Dict:
        """
        Optimize Random Forest hyperparameters using Optuna.
        
        Args:
            X_train: Training features
            y_train: Training labels
            
        Returns:
            Dict: Best hyperparameters
        """
        def objective(trial):
            params = {
                'n_estimators': trial.suggest_int('n_estimators', 100, 1000),
                'max_depth': trial.suggest_int('max_depth', 3, 20),
                'min_samples_split': trial.suggest_int('min_samples_split', 2, 10),
                'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 5),
                'max_features': trial.suggest_float('max_features', 0.1, 1.0)
            }
            
            model = RandomForestRegressor(**params, random_state=42)
            scores = cross_val_score(model, X_train, y_train, cv=5, scoring='neg_mean_squared_error')
            return -scores.mean()
        
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=50)
        
        logger.info(f"Best Random Forest parameters: {study.best_params}")
        return study.best_params
    
    def optimize_xgboost(self, X_train: pd.DataFrame, y_train: pd.Series) -> Dict:
        """
        Optimize XGBoost hyperparameters using Optuna.
        
        Args:
            X_train: Training features
            y_train: Training labels
            
        Returns:
            Dict: Best hyperparameters
        """
        def objective(trial):
            params = {
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'n_estimators': trial.suggest_int('n_estimators', 100, 1000),
                'min_child_weight': trial.suggest_int('min_child_weight', 1, 7),
                'subsample': trial.suggest_float('subsample', 0.6, 0.9),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 0.9),
                'gamma': trial.suggest_float('gamma', 0, 5)
            }
            
            model = xgb.XGBRegressor(**params, random_state=42)
            scores = cross_val_score(model, X_train, y_train, cv=5, scoring='neg_mean_squared_error')
            return -scores.mean()
        
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=50)
        
        logger.info(f"Best XGBoost parameters: {study.best_params}")
        return study.best_params
    
    def optimize_lightgbm(self, X_train: pd.DataFrame, y_train: pd.Series) -> Dict:
        """
        Optimize LightGBM hyperparameters using Optuna.
        
        Args:
            X_train: Training features
            y_train: Training labels
            
        Returns:
            Dict: Best hyperparameters
        """
        def objective(trial):
            params = {
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'n_estimators': trial.suggest_int('n_estimators', 100, 1000),
                'num_leaves': trial.suggest_int('num_leaves', 20, 100),
                'feature_fraction': trial.suggest_float('feature_fraction', 0.6, 0.9),
                'bagging_fraction': trial.suggest_float('bagging_fraction', 0.6, 0.9),
                'lambda_l1': trial.suggest_float('lambda_l1', 0, 5),
                'lambda_l2': trial.suggest_float('lambda_l2', 0, 5)
            }
            
            model = lgb.LGBMRegressor(**params, random_state=42)
            scores = cross_val_score(model, X_train, y_train, cv=5, scoring='neg_mean_squared_error')
            return -scores.mean()
        
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=50)
        
        logger.info(f"Best LightGBM parameters: {study.best_params}")
        return study.best_params
    
    def train_subject_models(self, X_train: pd.DataFrame, y_train: pd.DataFrame) -> None:
        """
        Train subject-specific models.
        
        Args:
            X_train: Training features
            y_train: Training labels for each subject
        """
        subjects = ['ads', 'ds', 'am', 'java', 'dbms']
        
        for subject in subjects:
            logger.info(f"Training models for {subject}")
            
            # Get subject-specific target
            y_subject = y_train[f'{subject}_performance']
            
            # Train Random Forest
            rf_params = self.optimize_random_forest(X_train, y_subject)
            self.subject_models[f'{subject}_rf'] = RandomForestRegressor(**rf_params, random_state=42)
            self.subject_models[f'{subject}_rf'].fit(X_train, y_subject)
            
            # Train XGBoost
            xgb_params = self.optimize_xgboost(X_train, y_subject)
            self.subject_models[f'{subject}_xgb'] = xgb.XGBRegressor(**xgb_params, random_state=42)
            self.subject_models[f'{subject}_xgb'].fit(X_train, y_subject)
            
            # Train LightGBM
            lgb_params = self.optimize_lightgbm(X_train, y_subject)
            self.subject_models[f'{subject}_lgb'] = lgb.LGBMRegressor(**lgb_params, random_state=42)
            self.subject_models[f'{subject}_lgb'].fit(X_train, y_subject)
            
            # Store feature importance
            for model_name, model in self.subject_models.items():
                if subject in model_name and hasattr(model, 'feature_importances_'):
                    self.subject_feature_importance[model_name] = {
                        feature: float(importance)
                        for feature, importance in zip(X_train.columns, model.feature_importances_)
                    }
    
    def train_models(self, X_train: pd.DataFrame, y_train: pd.DataFrame) -> None:
        """
        Train all models with optimized hyperparameters.
        
        Args:
            X_train: Training features
            y_train: Training labels (DataFrame with subject-wise targets)
        """
        # Train subject-specific models
        self.train_subject_models(X_train, y_train)
        
        # Train overall performance model
        y_overall = y_train.mean(axis=1)
        
        # Train Random Forest
        rf_params = self.optimize_random_forest(X_train, y_overall)
        self.models['random_forest'] = RandomForestRegressor(**rf_params, random_state=42)
        self.models['random_forest'].fit(X_train, y_overall)
        
        # Train XGBoost
        xgb_params = self.optimize_xgboost(X_train, y_overall)
        self.models['xgboost'] = xgb.XGBRegressor(**xgb_params, random_state=42)
        self.models['xgboost'].fit(X_train, y_overall)
        
        # Train LightGBM
        lgb_params = self.optimize_lightgbm(X_train, y_overall)
        self.models['lightgbm'] = lgb.LGBMRegressor(**lgb_params, random_state=42)
        self.models['lightgbm'].fit(X_train, y_overall)
        
        logger.info("All models trained successfully")
    
    def evaluate_models(self, X_test: pd.DataFrame, y_test: pd.DataFrame) -> Dict:
        """
        Evaluate all models on test data.
        
        Args:
            X_test: Test features
            y_test: Test labels (DataFrame with subject-wise targets)
            
        Returns:
            Dict: Evaluation metrics for each model
        """
        metrics = {}
        
        # Evaluate subject-specific models
        subjects = ['ads', 'ds', 'am', 'java', 'dbms']
        for subject in subjects:
            y_subject = y_test[f'{subject}_performance']
            
            for model_type in ['rf', 'xgb', 'lgb']:
                model_name = f"{subject}_{model_type}"
                if model_name in self.subject_models:
                    y_pred = self.subject_models[model_name].predict(X_test)
                    
                    metrics[model_name] = {
                        'mse': float(mean_squared_error(y_subject, y_pred)),
                        'rmse': float(np.sqrt(mean_squared_error(y_subject, y_pred))),
                        'mae': float(mean_absolute_error(y_subject, y_pred)),
                        'r2': float(r2_score(y_subject, y_pred))
                    }
        
        # Evaluate overall performance models
        y_overall = y_test.mean(axis=1)
        for name, model in self.models.items():
            y_pred = model.predict(X_test)
            
            metrics[name] = {
                'mse': float(mean_squared_error(y_overall, y_pred)),
                'rmse': float(np.sqrt(mean_squared_error(y_overall, y_pred))),
                'mae': float(mean_absolute_error(y_overall, y_pred)),
                'r2': float(r2_score(y_overall, y_pred))
                }
        
        logger.info("Model evaluation completed")
        return metrics
    
    def save_models(self) -> None:
        """Save trained models and their metadata."""
        # Save overall performance models
        for name, model in self.models.items():
            joblib.dump(model, os.path.join(self.model_dir, f"{name}.joblib"))
        
        # Save subject-specific models
        for name, model in self.subject_models.items():
            joblib.dump(model, os.path.join(self.model_dir, f"{name}.joblib"))
        
        # Save feature importance
        with open(os.path.join(self.model_dir, "feature_importance.json"), 'w') as f:
            json.dump(self.feature_importance, f)
        
        with open(os.path.join(self.model_dir, "subject_feature_importance.json"), 'w') as f:
            json.dump(self.subject_feature_importance, f)
        
        logger.info("Models and metadata saved successfully")
    
    def train_and_evaluate(self) -> Dict:
        """
        Train and evaluate all models.
        
        Returns:
            Dict: Evaluation metrics for all models
        """
        # Load data
        X_train, X_test, y_train, y_test = self.load_data()
        
        # Train models
        self.train_models(X_train, y_train)
        
        # Evaluate models
        metrics = self.evaluate_models(X_test, y_test)
        
        # Save models
        self.save_models()
        
        return metrics

if __name__ == "__main__":
    # Initialize and train models
    model = StudentPerformanceModel()
    metrics = model.train_and_evaluate()
    
    # Print evaluation metrics
    print("\nModel Evaluation Metrics:")
    for model_name, model_metrics in metrics.items():
        print(f"\n{model_name.upper()}:")
        for metric_name, value in model_metrics.items():
            print(f"{metric_name}: {value:.4f}") 