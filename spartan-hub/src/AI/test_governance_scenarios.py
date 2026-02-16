#!/usr/bin/env python3
import asyncio
from governance.engine import GovernanceEngine, DecisionType, DecisionRequest

async def test_governance():
    engine = GovernanceEngine()
    
    # Test casos de uso típicos
    test_cases = [
        {
            "type": DecisionType.TRAINING,
            "context": {
                "user_level": "intermediate",
                "exercise": "deadlift",
                "weight": "100kg",
                "previous_max": "120kg",
                "recovery_status": "good"
            },
            "urgency": False
        },
        {
            "type": DecisionType.HEALTH,
            "context": {
                "heart_rate": 180,
                "blood_pressure": "150/90",
                "symptoms": ["dizziness", "fatigue"],
                "perceived_effort": 9
            },
            "urgency": True
        },
        {
            "type": DecisionType.SECURITY,
            "context": {
                "action": "export_data",
                "data_type": "health_metrics",
                "user_role": "trainer",
                "target": "all_clients"
            },
            "urgency": False
        }
    ]
    
    for case in test_cases:
        print(f"\n🧪 Probando escenario: {case['type'].value}")
        request = DecisionRequest(
            context=case["context"],
            decision_type=case["type"],
            urgency=case["urgency"]
        )
        
        try:
            response = await engine.make_decision(request)
            print(f"✅ Decisión: {response.decision}")
            print(f"📊 Confianza: {response.confidence:.2%}")
            print(f"🤖 Modelo usado: {response.model_used}")
            print(f"⏱️ Tiempo de procesamiento: {response.processing_time:.2f}s")
            print("\n🔍 Razonamiento:")
            print(response.reasoning)
        except Exception as e:
            print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_governance())