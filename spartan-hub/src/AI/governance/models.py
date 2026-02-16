from pydantic import BaseModel, Field, constr, validator
from enum import Enum
from typing import Dict, Any, Optional, List
from datetime import datetime

class DecisionType(str, Enum):
    EXERCISE = "exercise"
    NUTRITION = "nutrition"
    TRAINING = "training"
    SAFETY = "safety"
    EXERCISE_RISK = "exercise_risk"
    NUTRITION_PLAN = "nutrition_plan"
    TRAINING_LOAD = "training_load"
    RECOVERY_TIME = "recovery_time"

class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    LIMITED = "limited"
    AT_RISK = "at_risk"

class Context(BaseModel):
    time_of_day: str = Field(..., pattern="^(morning|afternoon|evening|night)$")
    available_equipment: List[str] = Field(default_factory=list)
    current_metrics: Dict[str, float] = Field(default_factory=dict)
    environmental_factors: Dict[str, Any] = Field(default_factory=dict)
    health_status: HealthStatus = Field(default=HealthStatus.HEALTHY)

    @validator('available_equipment')
    def validate_equipment(cls, v):
        if len(v) > 50:
            raise ValueError('Too many equipment items listed (max 50)')
        return v

    @validator('current_metrics')
    def validate_metrics(cls, v):
        valid_metrics = {
            'heart_rate', 'blood_pressure', 'temperature',
            'oxygen_saturation', 'glucose_level', 'fatigue_score'
        }
        invalid_metrics = set(v.keys()) - valid_metrics
        if invalid_metrics:
            raise ValueError(f'Invalid metrics: {", ".join(invalid_metrics)}')
        return v

class DecisionRequest(BaseModel):
    request_id: str = Field(..., min_length=10, max_length=50)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    decision_type: DecisionType
    user_profile: UserProfile
    context: Context
    query: str = Field(..., min_length=10, max_length=1000)

    @validator('query')
    def validate_query_content(cls, v):
        forbidden_words = ['hack', 'exploit', 'bypass', 'inject', 'malicious']
        if any(word in v.lower() for word in forbidden_words):
            raise ValueError("Query contains forbidden terms")
        return v

    @validator('request_id')
    def validate_request_id(cls, v):
        if not v.isalnum():
            raise ValueError("request_id must be alphanumeric")
        return v

class DecisionResponseData(BaseModel):
    recommendation: str = Field(..., min_length=20)
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    alternatives: List[str] = Field(..., min_items=1, max_items=5)
    rationale: str = Field(..., min_length=50)
    safety_checks: List[Dict[str, Any]] = Field(..., min_items=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @validator('safety_checks')
    def validate_safety_checks(cls, v):
        required_fields = {'check_name', 'passed'}
        for check in v:
            if not all(field in check for field in required_fields):
                raise ValueError(f"Safety check must contain fields: {required_fields}")
            if not isinstance(check['passed'], bool):
                raise ValueError("Safety check 'passed' field must be boolean")
        return v

class DecisionResponse(BaseModel):
    request_id: str = Field(..., min_length=10, max_length=50)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(..., pattern="^(success|error)$")
    data: DecisionResponseData
    processing_time: float = Field(..., ge=0.0)

    @validator('processing_time')
    def validate_processing_time(cls, v):
        if v > 30.0:  # Maximum 30 seconds processing time
            raise ValueError("Processing time exceeds maximum allowed (30s)")
        return v

class UserProfile(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=50)
    age: int = Field(..., ge=13, le=120)
    weight: Optional[float] = Field(None, gt=0, lt=500)
    height: Optional[float] = Field(None, gt=0, lt=300)
    fitness_level: str = Field(..., pattern="^(beginner|intermediate|advanced)$")
    health_conditions: List[str] = Field(default_factory=list)
    goals: List[str] = Field(..., min_items=1, max_items=5)
    
    @validator('health_conditions')
    def validate_health_conditions(cls, v):
        if len(v) > 20:
            raise ValueError('Too many health conditions listed (max 20)')
        if any(len(condition) > 100 for condition in v):
            raise ValueError('Health condition description too long (max 100 chars)')
        return v

    @validator('goals')
    def validate_goals(cls, v):
        valid_goals = {
            'weight_loss', 'muscle_gain', 'endurance', 'strength',
            'flexibility', 'general_fitness', 'rehabilitation'
        }
        if not all(goal.lower() in valid_goals for goal in v):
            raise ValueError(f'Goals must be one of: {", ".join(valid_goals)}')
        return v
        return v

class ExerciseData(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    intensity: str = Field(..., pattern=r'^(low|moderate|high)$')
    duration_minutes: int = Field(..., ge=1, le=480)
    target_muscle_groups: List[str] = Field(..., min_items=1, max_items=10)

class DecisionRequest(BaseModel):
    type: DecisionType
    user_profile: UserProfile
    exercise_data: Optional[ExerciseData]
    current_timestamp: datetime = Field(default_factory=datetime.now)
    context: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('context')
    def validate_context(cls, v):
        if len(v) > 20:
            raise ValueError('Context object too large (max 20 key-value pairs)')
        for key, value in v.items():
            if len(str(key)) > 50:
                raise ValueError('Context key too long (max 50 chars)')
            if isinstance(value, str) and len(value) > 1000:
                raise ValueError('Context value too long (max 1000 chars)')
        return v

class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

class DecisionResponse(BaseModel):
    decision_id: str = Field(..., regex=r'^[a-zA-Z0-9-]+$')
    type: DecisionType
    timestamp: datetime
    risk_level: Optional[RiskLevel]
    recommendations: List[str] = Field(..., min_items=1, max_items=10)
    explanation: str = Field(..., min_length=10, max_length=2000)
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('recommendations')
    def validate_recommendations(cls, v):
        if any(len(rec) > 500 for rec in v):
            raise ValueError('Recommendation too long (max 500 chars each)')
        return v
    
    @validator('metadata')
    def validate_metadata(cls, v):
        if len(v) > 10:
            raise ValueError('Metadata too large (max 10 key-value pairs)')
        return v

class HealthCheckResponse(BaseModel):
    status: HealthStatus
    last_check: datetime
    model_version: str = Field(..., regex=r'^\d+\.\d+\.\d+$')
    uptime_seconds: int = Field(..., ge=0)
    api_version: str = Field(..., regex=r'^\d+\.\d+\.\d+$')
    active_models: List[str]