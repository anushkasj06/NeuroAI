# Student Performance Predictor

A machine learning-based system for predicting student performance and providing personalized recommendations.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Generate sample data:
```bash
python src/data_preprocessing/generate_sample_data.py
```

4. Prepare data:
```bash
python src/data_preprocessing/prepare_data.py
```

5. Train models:
```bash
python src/models/train_model.py
```

6. Start the API server:
```bash
python src/api/app.py
```

The API will be available at `http://localhost:5001`

Optional: add `GEMINI_API_KEY` to your `.env` file if you want AI-generated recommendations. If it is missing, the API still runs and uses local fallback recommendations.

## API Endpoints

### POST /api/predict
Predict student performance based on input data.

Request body:
```json
{
  "current_cgpa": 7.5,
  "education_level": "btech2",
  "study_style": "visual",
  "parent_education": "bachelors",
  "screen_time": 6,
  "sleep_time": 7,
  "ads_marks": 75,
  "ads_attendance": 85,
  "ads_interest": 8,
  "ds_marks": 68,
  "ds_attendance": 80,
  "ds_interest": 7,
  "am_marks": 82,
  "am_attendance": 90,
  "am_interest": 9,
  "java_marks": 70,
  "java_attendance": 75,
  "java_interest": 6,
  "dbms_marks": 77,
  "dbms_attendance": 88,
  "dbms_interest": 8
}
```

Response:
```json
{
  "success": true,
  "predictions": [
    {
      "subject": "ADS (Advanced Data Structures)",
      "currentScore": 75,
      "predictedScore": 82,
      "improvement": "+7",
      "confidence": "85%",
      "recommendations": "Focus on Tree and Graph algorithms. Improve attendance to enhance learning."
    },
    ...
  ]
}
```

## Project Structure

```
StudentPerformancePredictor/
├── data/
│   ├── raw/
│   └── processed/
├── models/
│   ├── random_forest.joblib
│   ├── xgboost.joblib
│   ├── lightgbm.joblib
│   └── feature_importance.json
├── src/
│   ├── api/
│   │   └── app.py
│   ├── data_preprocessing/
│   │   ├── generate_sample_data.py
│   │   └── prepare_data.py
│   ├── models/
│   │   ├── recommendations.py
│   │   └── train_model.py
│   └── visualization/
│       └── dashboard.py
├── requirements.txt
└── README.md
```

## Features

- **Performance Prediction**: Predicts student performance using historical data
- **Risk Assessment**: Identifies students at risk of poor academic performance
- **Personalized Recommendations**: Provides tailored study plans and resources
- **Real-time Monitoring**: Tracks student progress and attendance
- **Interactive Dashboard**: Visualizes performance metrics and trends

## Usage

1. Data Preparation:
```bash
python src/data_preprocessing/prepare_data.py
```



Model Evaluation Metrics:

ADS_RF:
mse: 0.0152
rmse: 0.1231
mae: 0.0883
r2: 0.9836

ADS_XGB:
mse: 0.0056
rmse: 0.0752
mae: 0.0579
r2: 0.9939

ADS_LGB:
mse: 0.0083
rmse: 0.0911
mae: 0.0641
r2: 0.9910

DS_RF:
mse: 0.0138
rmse: 0.1174
mae: 0.0867
r2: 0.9848

DS_XGB:
mse: 0.0051
rmse: 0.0717
mae: 0.0530
r2: 0.9943

DS_LGB:
mse: 0.0060
rmse: 0.0774
mae: 0.0540
r2: 0.9934

AM_RF:
mse: 0.0161
rmse: 0.1269
mae: 0.0970
r2: 0.9831

AM_XGB:
mse: 0.0111
rmse: 0.1052
mae: 0.0799
r2: 0.9884

AM_LGB:
mse: 0.0083
rmse: 0.0911
mae: 0.0649
r2: 0.9913

JAVA_RF:
mse: 0.0141
rmse: 0.1186
mae: 0.0848
r2: 0.9837

JAVA_XGB:
mse: 0.0064
rmse: 0.0800
mae: 0.0618
r2: 0.9926

JAVA_LGB:
mse: 0.0073
rmse: 0.0856
mae: 0.0630
r2: 0.9915

DBMS_RF:
mse: 0.0145
rmse: 0.1203
mae: 0.0922
r2: 0.9868

DBMS_XGB:
mse: 0.0068
rmse: 0.0828
mae: 0.0592
r2: 0.9938

DBMS_LGB:
mse: 0.0080
rmse: 0.0896
mae: 0.0578
r2: 0.9927

RANDOM_FOREST:
mse: 0.0108
rmse: 0.1041
mae: 0.0773
r2: 0.9836

XGBOOST:
mse: 0.0089
rmse: 0.0942
mae: 0.0712
r2: 0.9865

LIGHTGBM:
mse: 0.0097
rmse: 0.0987
mae: 0.0720
r2: 0.9852