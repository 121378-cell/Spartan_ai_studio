import logging
from typing import Dict, Any
from datetime import datetime

class ValidationError(Exception):
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message)
        self.details = details or {}

logger = logging.getLogger("governance_api")

DECISION_RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["decision_id", "type", "timestamp", "recommendations", "explanation", "confidence_score"],
    "properties": {
        "decision_id": {
            "type": "string",
            "pattern": "^[a-zA-Z0-9-]+$"
        },
        "type": {
            "type": "string",
            "enum": ["exercise_risk", "nutrition_plan", "training_load", "recovery_time"]
        },
        "timestamp": {
            "type": "string",
            "format": "date-time"
        },
        "risk_level": {
            "type": "string",
            "enum": ["low", "moderate", "high", "critical"]
        },
        "recommendations": {
            "type": "array",
            "minItems": 1,
            "maxItems": 10,
            "items": {
                "type": "string",
                "maxLength": 500
            }
        },
        "explanation": {
            "type": "string",
            "minLength": 10,
            "maxLength": 2000
        },
        "confidence_score": {
            "type": "number",
            "minimum": 0.0,
            "maximum": 1.0
        },
        "metadata": {
            "type": "object",
            "maxProperties": 10
        }
    }
}

def validate_ai_response(response: Dict[str, Any]) -> bool:
    """
    Validates the AI model's response against our schema.
    Returns True if valid, raises ValidationError if invalid.
    """
    try:
        import jsonschema
        jsonschema.validate(instance=response, schema=DECISION_RESPONSE_SCHEMA)
        return True
    except jsonschema.exceptions.ValidationError as e:
        logger.error(f"AI response validation failed: {str(e)}")
        raise ValidationError(
            "AI response does not match expected format",
            details={
                "validation_error": str(e),
                "schema_path": list(e.schema_path),
                "failed_value": e.instance
            }
        )