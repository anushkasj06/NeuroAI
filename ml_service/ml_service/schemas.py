from typing import List, Optional

from pydantic import BaseModel, Field

from .models import UserProfile


class SkillInput(BaseModel):
    skill_id: Optional[int] = Field(default=None, alias="skillId")
    skill_name: Optional[str] = Field(default=None, alias="skillName")
    category: Optional[str] = None
    level: Optional[int] = None
    evidence: Optional[str] = None


class ConstraintsInput(BaseModel):
    college: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[int] = None
    location_preference: Optional[str] = Field(default=None, alias="locationPreference")
    salary_expectation: Optional[float] = Field(default=None, alias="salaryExpectation")
    remote_preference: Optional[str] = Field(default=None, alias="remotePreference")


class RecommendationRequest(BaseModel):
    user_id: Optional[int] = Field(default=None, alias="userId")
    skills: List[SkillInput] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    constraints: Optional[ConstraintsInput] = None


class RecommendationItem(BaseModel):
    role: str
    score: float


class SimulationRequest(BaseModel):
    user_id: Optional[int] = Field(default=None, alias="userId")
    role: Optional[str] = None
    target_level: Optional[str] = Field(default=None, alias="targetLevel")
    current_skills: List[SkillInput] = Field(default_factory=list, alias="currentSkills")


class SimulationStep(BaseModel):
    title: str
    description: str
    priority: int


class SimulationResponse(BaseModel):
    role: Optional[str] = None
    readiness_score: float = Field(alias="readinessScore")
    steps: List[SimulationStep] = Field(default_factory=list)


class ParsedResumeResponse(BaseModel):
    candidate_name: Optional[str] = Field(default=None, alias="candidateName")
    emails: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    experience_summary: Optional[str] = Field(default=None, alias="experienceSummary")


class ResumeParseRequest(BaseModel):
    model_config = {"populate_by_name": True}
    resume_text: str
    is_base64_encoded: bool = Field(default=False, alias="isBase64Encoded")


class RecommendationSourceBreakdown(BaseModel):
    content_score: float
    cf_score: float


class RecommendationResponseItem(BaseModel):
    role_name: str
    final_score: float
    source_breakdown: RecommendationSourceBreakdown


class RecommendationResponse(BaseModel):
    recommendations: List[RecommendationResponseItem]
    explanation: Optional[str] = None
    debates: Optional[dict[str, list[dict[str, str]]]] = None


class ChatMessage(BaseModel):
    speaker: Optional[str] = None
    message: Optional[str] = None


class RoleChatRequest(BaseModel):
    profile: UserProfile
    role: str
    persona: str
    message: Optional[str] = None
    history: List[ChatMessage] = Field(default_factory=list)


class RoleChatResponse(BaseModel):
    role: str
    persona: str
    reply: str
    suggested_followups: List[str] = Field(default_factory=list)


class MarketTrendRoleItem(BaseModel):
    role_name: str
    demand_index: float
    openings: int
    median_score: float


class MarketTrendSnapshot(BaseModel):
    top_skills: List[str]
    roles: List[MarketTrendRoleItem]


class MarketTrendsResponse(BaseModel):
    snapshot: MarketTrendSnapshot


class WhatIfSimulationRequest(BaseModel):
    current_profile: UserProfile
    added_skills: List[str] = Field(default_factory=list)
    removed_skills: List[str] = Field(default_factory=list)


class WhatIfRoleDelta(BaseModel):
    role_name: str
    score_before: float
    score_after: float
    delta: float


class WhatIfSimulationResponse(BaseModel):
    roles: List[WhatIfRoleDelta]


class LiveJobItem(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    url: str
    source: str
    role_hint: Optional[str] = None


class LiveJobsResponse(BaseModel):
    jobs: List[LiveJobItem]
