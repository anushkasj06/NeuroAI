from __future__ import annotations

from datetime import datetime
import re
from typing import Optional

import numpy as np
import pandas as pd
from pydantic import BaseModel, Field
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize

from .data_loader import load_candidate_roles, load_career_reco, load_student_career

career_reco_df = load_career_reco()
student_career_df = load_student_career()
candidate_role_df = load_candidate_roles()


class Skill(BaseModel):
    skill_id: Optional[int] = Field(default=None, alias="skillId")
    name: str
    category: Optional[str] = None
    level: Optional[int] = None
    evidence: Optional[str] = None
    last_updated: Optional[datetime] = Field(default=None, alias="lastUpdated")


class UserProfile(BaseModel):
    user_id: Optional[int] = Field(default=None, alias="userId")
    name: str
    email: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[int] = None
    location_preference: Optional[str] = Field(default=None, alias="locationPreference")
    salary_expectation: Optional[float] = Field(default=None, alias="salaryExpectation")
    remote_preference: Optional[str] = Field(default=None, alias="remotePreference")
    interests_text: Optional[str] = None
    preferred_location: Optional[str] = None
    interests: list[str] = Field(default_factory=list)
    skills: list[Skill] = Field(default_factory=list)
    # Full resume context (passed from the client; not stored in the SQL DB)
    resume_text: Optional[str] = Field(default=None, alias="resumeText")
    projects: list[str] = Field(default_factory=list)
    experience: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    objective: Optional[str] = None

    model_config = {"populate_by_name": True, "extra": "ignore"}


class RecommendationResult(BaseModel):
    role: str
    score: float


career_vectorizer: TfidfVectorizer
career_classifier: LogisticRegression
career_label_order: list[str]

candidate_skill_vectorizer: TfidfVectorizer
candidate_skill_matrix: object
candidate_role_svd: TruncatedSVD
candidate_latent_embeddings: np.ndarray
role_latent_embeddings: np.ndarray
role_label_order: list[str]
role_frequency_prior: dict[str, float]


def _normalize_text(value: object) -> str:
    if isinstance(value, list):
        return " ".join(str(item).strip().lower() for item in value if str(item).strip())
    if isinstance(value, np.ndarray):
        return " ".join(str(item).strip().lower() for item in value.tolist() if str(item).strip())
    if value is None:
        return ""
    try:
        missing = pd.isna(value)
        if isinstance(missing, (bool, np.bool_)) and missing:
            return ""
    except ValueError:
        pass
    return str(value).strip().lower()


def _split_interest_text(value: object) -> list[str]:
    if pd.isna(value):
        return []
    if isinstance(value, list):
        return [str(item).strip().lower() for item in value if str(item).strip()]
    raw_value = str(value).strip().lower()
    if not raw_value:
        return []
    return [part.strip() for part in re.split(r"[,;/|]+", raw_value) if part.strip()]


def _join_text(skills_text: object, interests_text: object) -> str:
    skills_part = _normalize_text(skills_text)
    interests_part = " ".join(_split_interest_text(interests_text))
    return " ".join(part for part in [skills_part, interests_part] if part).strip()


def _prepare_training_frame() -> pd.DataFrame:
    career_rows = pd.DataFrame(
        {
            "text": [
                _join_text(row.get("skills"), row.get("interests"))
                for _, row in career_reco_df.iterrows()
            ],
            "career_label": career_reco_df["recommended_career"].astype(str).str.strip(),
        }
    )

    student_rows = pd.DataFrame(
        {
            "text": [
                _join_text(row.get("skill"), "")
                for _, row in student_career_df.iterrows()
            ],
            "career_label": student_career_df["career"].astype(str).str.strip(),
        }
    )

    training_frame = pd.concat([career_rows, student_rows], ignore_index=True)
    training_frame["text"] = training_frame["text"].fillna("").astype(str).str.strip()
    training_frame["career_label"] = training_frame["career_label"].fillna("").astype(str).str.strip()
    training_frame = training_frame[training_frame["text"] != ""]
    training_frame = training_frame[training_frame["career_label"] != ""]
    return training_frame


def _train_career_model() -> tuple[TfidfVectorizer, LogisticRegression, list[str]]:
    training_frame = _prepare_training_frame()
    if training_frame.empty:
        raise ValueError("Career training data is empty")

    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=5000)
    features = vectorizer.fit_transform(training_frame["text"])
    labels = training_frame["career_label"].tolist()

    classifier = LogisticRegression(max_iter=1000, class_weight="balanced")
    classifier.fit(features, labels)
    return vectorizer, classifier, list(classifier.classes_)


career_vectorizer, career_classifier, career_label_order = _train_career_model()


def _prepare_candidate_role_frame() -> pd.DataFrame:
    frame = candidate_role_df.copy()
    frame["skills_text"] = frame["skills"].apply(_normalize_text)
    frame["job_role"] = frame["job_role"].astype(str).str.strip()
    frame = frame[frame["skills_text"] != ""]
    frame = frame[frame["job_role"] != ""]
    return frame.reset_index(drop=True)


def _train_candidate_role_model() -> tuple[
    TfidfVectorizer,
    object,
    TruncatedSVD,
    np.ndarray,
    np.ndarray,
    list[str],
    dict[str, float],
]:
    frame = _prepare_candidate_role_frame()
    if frame.empty:
        raise ValueError("Candidate role training data is empty")

    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=5000)
    skill_matrix = vectorizer.fit_transform(frame["skills_text"])

    role_label_order = list(dict.fromkeys(frame["job_role"].tolist()))
    role_to_index = {role: index for index, role in enumerate(role_label_order)}
    candidate_indices = np.arange(len(frame))
    role_indices = frame["job_role"].map(role_to_index).to_numpy()
    interaction_matrix = np.zeros((len(frame), len(role_label_order)), dtype=float)
    interaction_matrix[candidate_indices, role_indices] = 1.0

    n_components = max(1, min(32, min(interaction_matrix.shape) - 1))
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    candidate_latent = svd.fit_transform(interaction_matrix)
    role_latent = svd.transform(np.eye(len(role_label_order)))
    role_latent = normalize(role_latent)

    role_counts = frame["job_role"].value_counts(normalize=True).to_dict()
    return vectorizer, skill_matrix, svd, candidate_latent, role_latent, role_label_order, role_counts


(
    candidate_skill_vectorizer,
    candidate_skill_matrix,
    candidate_role_svd,
    candidate_latent_embeddings,
    role_latent_embeddings,
    role_label_order,
    role_frequency_prior,
) = _train_candidate_role_model()


def predict_top_k_careers(user_skills_text: str, user_interests_text: str, k: int = 5) -> list[RecommendationResult]:
    combined_text = _join_text(user_skills_text, user_interests_text)
    if not combined_text:
        return []

    feature_vector = career_vectorizer.transform([combined_text])
    probabilities = career_classifier.predict_proba(feature_vector)[0]
    ranked_indices = probabilities.argsort()[::-1][: max(k, 0)]

    return [
        RecommendationResult(role=career_label_order[index], score=float(probabilities[index]))
        for index in ranked_indices
    ]


def similar_roles_for_user_skills(user_skills_text: str, top_n: int = 5) -> list[RecommendationResult]:
    if top_n <= 0:
        return []

    query_text = _normalize_text(user_skills_text)
    if not query_text:
        ranked_roles = sorted(role_frequency_prior.items(), key=lambda item: item[1], reverse=True)[:top_n]
        return [RecommendationResult(role=role, score=float(score)) for role, score in ranked_roles]

    query_vector = candidate_skill_vectorizer.transform([query_text])
    candidate_similarities = cosine_similarity(query_vector, candidate_skill_matrix).ravel()

    if np.allclose(candidate_similarities, 0.0):
        ranked_roles = sorted(role_frequency_prior.items(), key=lambda item: item[1], reverse=True)[:top_n]
        return [RecommendationResult(role=role, score=float(score)) for role, score in ranked_roles]

    top_candidate_count = min(max(top_n * 5, top_n), len(candidate_similarities))
    top_candidate_indices = np.argsort(candidate_similarities)[::-1][:top_candidate_count]

    vote_scores: dict[str, float] = {}
    latent_seed_vectors = []
    latent_seed_weights = []

    for candidate_index in top_candidate_indices:
        similarity_score = float(candidate_similarities[candidate_index])
        if similarity_score <= 0:
            continue
        role_label = str(candidate_role_df.iloc[candidate_index]["job_role"]).strip()
        vote_scores[role_label] = vote_scores.get(role_label, 0.0) + similarity_score
        latent_seed_vectors.append(candidate_latent_embeddings[candidate_index])
        latent_seed_weights.append(similarity_score)

    if not vote_scores:
        ranked_roles = sorted(role_frequency_prior.items(), key=lambda item: item[1], reverse=True)[:top_n]
        return [RecommendationResult(role=role, score=float(score)) for role, score in ranked_roles]

    vote_max = max(vote_scores.values()) or 1.0
    vote_scores = {role: score / vote_max for role, score in vote_scores.items()}

    latent_seed_matrix = np.asarray(latent_seed_vectors)
    latent_weights = np.asarray(latent_seed_weights)
    weighted_user_latent = np.average(latent_seed_matrix, axis=0, weights=latent_weights)
    latent_scores = cosine_similarity(weighted_user_latent.reshape(1, -1), role_latent_embeddings).ravel()
    latent_scores = (latent_scores + 1.0) / 2.0

    final_scores: dict[str, float] = {}
    for role_index, role_label in enumerate(role_label_order):
        vote_component = vote_scores.get(role_label, 0.0)
        latent_component = float(latent_scores[role_index])
        prior_component = float(role_frequency_prior.get(role_label, 0.0))
        final_scores[role_label] = (0.65 * vote_component) + (0.25 * latent_component) + (0.10 * prior_component)

    ranked_roles = sorted(final_scores.items(), key=lambda item: item[1], reverse=True)[:top_n]
    return [RecommendationResult(role=role, score=float(score)) for role, score in ranked_roles]
