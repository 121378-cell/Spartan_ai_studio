#!/usr/bin/env python3
import asyncio
import aiohttp
import time
from datetime import datetime
import json
from typing import Dict, Any, List
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('ai_test_results.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("ai_tester")

class AITester:
    def __init__(self):
        self.models = ["mixtral", "llama2", "orca-mini"]
        self.test_scenarios = self._get_test_scenarios()
        
    def _get_test_scenarios(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "Evaluación de Ejercicio",
                "prompt": """Evalúa el siguiente plan de ejercicio:
                - Ejercicio: Sentadilla con peso
                - Peso: 100kg
                - Series: 5
                - Repeticiones: 5
                - Nivel del usuario: Intermedio
                - Historial: Sin lesiones previas
                
                ¿Es apropiado este plan? Proporciona una evaluación detallada.""",
                "expected_elements": [
                    "seguridad",
                    "progresión",
                    "técnica",
                    "recomendación"
                ]
            },
            {
                "name": "Análisis de Nutrición",
                "prompt": """Analiza este plan nutricional:
                Desayuno: Avena con proteína y plátano
                Almuerzo: Pechuga de pollo, arroz y verduras
                Cena: Pescado con batata y ensalada
                
                Objetivo: Ganar masa muscular
                Calorías totales: 2500
                
                ¿Es adecuado este plan? Proporciona análisis detallado.""",
                "expected_elements": [
                    "macronutrientes",
                    "timing",
                    "calidad",
                    "sugerencias"
                ]
            },
            {
                "name": "Evaluación de Riesgo",
                "prompt": """Evalúa estos signos vitales durante el ejercicio:
                - Frecuencia cardíaca: 175 bpm
                - Presión arterial: 150/90
                - Nivel de esfuerzo percibido: 9/10
                - Síntomas: Mareo leve
                
                ¿Debe el usuario continuar el ejercicio? Proporciona una evaluación de riesgo.""",
                "expected_elements": [
                    "riesgo",
                    "recomendación",
                    "precaución",
                    "acción inmediata"
                ]
            }
        ]
    
    async def test_model(self, model: str, scenario: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()
        result = {
            "model": model,
            "scenario": scenario["name"],
            "success": False,
            "response": None,
            "error": None,
            "latency": 0,
            "coverage": 0
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'http://localhost:11434/api/generate',
                    json={
                        "model": model,
                        "prompt": scenario["prompt"],
                        "stream": False
                    },
                    timeout=30
                ) as response:
                    response_data = await response.json()
                    result["response"] = response_data.get("response", "")
                    result["latency"] = time.time() - start_time
                    
                    # Calcular cobertura de elementos esperados
                    coverage = sum(
                        1 for element in scenario["expected_elements"]
                        if element.lower() in result["response"].lower()
                    )
                    result["coverage"] = (coverage / len(scenario["expected_elements"])) * 100
                    result["success"] = True
                    
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Error testing {model} on {scenario['name']}: {str(e)}")
            
        return result

    async def run_all_tests(self) -> List[Dict[str, Any]]:
        all_results = []
        for model in self.models:
            logger.info(f"\n🤖 Testing model: {model}")
            for scenario in self.test_scenarios:
                logger.info(f"\n📝 Running scenario: {scenario['name']}")
                result = await self.test_model(model, scenario)
                all_results.append(result)
                self._log_result(result)
        
        return all_results
    
    def _log_result(self, result: Dict[str, Any]):
        status = "✅" if result["success"] else "❌"
        logger.info(f"{status} {result['model']} - {result['scenario']}:")
        logger.info(f"   Latencia: {result['latency']:.2f}s")
        logger.info(f"   Cobertura: {result['coverage']:.1f}%")
        if result["error"]:
            logger.error(f"   Error: {result['error']}")
    
    def generate_report(self, results: List[Dict[str, Any]]):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report = {
            "timestamp": timestamp,
            "summary": {
                "total_tests": len(results),
                "successful_tests": sum(1 for r in results if r["success"]),
                "failed_tests": sum(1 for r in results if not r["success"]),
                "average_latency": sum(r["latency"] for r in results) / len(results),
                "average_coverage": sum(r["coverage"] for r in results) / len(results)
            },
            "model_performance": {},
            "detailed_results": results
        }
        
        # Análisis por modelo
        for model in self.models:
            model_results = [r for r in results if r["model"] == model]
            if model_results:
                report["model_performance"][model] = {
                    "success_rate": sum(1 for r in model_results if r["success"]) / len(model_results) * 100,
                    "average_latency": sum(r["latency"] for r in model_results) / len(model_results),
                    "average_coverage": sum(r["coverage"] for r in model_results) / len(model_results)
                }
        
        # Guardar reporte
        with open(f'ai_test_report_{timestamp}.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        # Imprimir resumen
        logger.info("\n📊 Resumen de Pruebas:")
        logger.info(f"Tests totales: {report['summary']['total_tests']}")
        logger.info(f"Tests exitosos: {report['summary']['successful_tests']}")
        logger.info(f"Tests fallidos: {report['summary']['failed_tests']}")
        logger.info(f"Latencia promedio: {report['summary']['average_latency']:.2f}s")
        logger.info(f"Cobertura promedio: {report['summary']['average_coverage']:.1f}%")
        
        logger.info("\n📈 Rendimiento por Modelo:")
        for model, perf in report["model_performance"].items():
            logger.info(f"\n{model}:")
            logger.info(f"  Tasa de éxito: {perf['success_rate']:.1f}%")
            logger.info(f"  Latencia promedio: {perf['average_latency']:.2f}s")
            logger.info(f"  Cobertura promedio: {perf['average_coverage']:.1f}%")
        
        return report

async def main():
    logger.info("🚀 Iniciando pruebas de modelos de IA...")
    tester = AITester()
    results = await tester.run_all_tests()
    tester.generate_report(results)
    logger.info("\n✨ Pruebas completadas. Revisa ai_test_report_*.json para más detalles.")

if __name__ == "__main__":
    asyncio.run(main())