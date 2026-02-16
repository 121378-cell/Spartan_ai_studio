#!/usr/bin/env python3
import asyncio
import json
import time
from typing import Dict, List
import aiohttp
import pandas as pd
import matplotlib.pyplot as plt
from tabulate import tabulate

# Escenarios de prueba para gobernanza
TEST_SCENARIOS = [
    {
        "name": "Política de Seguridad",
        "prompt": """Evalúa la siguiente acción del usuario:
        El usuario intenta acceder a '/admin/settings' sin autenticación.
        ¿Debería permitirse? Explica por qué y sugiere una política.""",
        "criteria": ["seguridad", "autenticación", "política", "recomendación"]
    },
    {
        "name": "Validación de Datos",
        "prompt": """Analiza esta entrada de datos:
        {
            "weight": -50,
            "height": 0,
            "age": 999
        }
        ¿Son válidos estos datos para un perfil de fitness? Explica los problemas y sugiere validaciones.""",
        "criteria": ["validación", "límites", "coherencia", "reglas_negocio"]
    },
    {
        "name": "Cumplimiento GDPR",
        "prompt": """Revisa esta solicitud de datos:
        Un entrenador quiere exportar todos los datos de sus clientes incluyendo métricas de salud.
        ¿Qué consideraciones de privacidad y GDPR deben aplicarse?""",
        "criteria": ["privacidad", "gdpr", "consentimiento", "datos_sensibles"]
    },
    {
        "name": "Gestión de Recursos",
        "prompt": """Evalúa este patrón de uso:
        Un usuario está haciendo 100 requests por segundo al endpoint de IA.
        ¿Cómo deberíamos manejar esto?""",
        "criteria": ["rate_limiting", "recursos", "optimización", "costes"]
    },
    {
        "name": "Decisiones de Entrenamiento",
        "prompt": """Analiza esta situación:
        Usuario reporta dolor de rodilla nivel 7/10, pero quiere continuar con entrenamiento de alta intensidad.
        ¿Qué decisión debe tomar el sistema?""",
        "criteria": ["seguridad_usuario", "adaptación", "riesgo", "personalización"]
    }
]

MODELS = [
    "mistral",  # Modelo base actual
    "llama2",   # Alternativa generalista
    "codellama",  # Especializado en código
    "orca-mini"  # Modelo ligero
]

async def test_model(session: aiohttp.ClientSession, model: str, scenario: Dict) -> Dict:
    start_time = time.time()
    try:
        async with session.post('http://localhost:11434/api/generate', 
                              json={
                                  "model": model,
                                  "prompt": scenario["prompt"],
                                  "stream": False
                              }) as response:
            result = await response.json()
            response_time = time.time() - start_time
            
            # Evaluar criterios
            score = sum(1 for criterion in scenario["criteria"] 
                       if criterion.lower() in result["response"].lower())
            coverage = (score / len(scenario["criteria"])) * 100
            
            return {
                "model": model,
                "scenario": scenario["name"],
                "response_time": response_time,
                "coverage": coverage,
                "response": result["response"][:200] + "..."  # Truncar para legibilidad
            }
    except Exception as e:
        return {
            "model": model,
            "scenario": scenario["name"],
            "error": str(e),
            "coverage": 0,
            "response_time": -1
        }

async def run_tests():
    results = []
    async with aiohttp.ClientSession() as session:
        tasks = [
            test_model(session, model, scenario)
            for model in MODELS
            for scenario in TEST_SCENARIOS
        ]
        results = await asyncio.gather(*tasks)
    
    return results

def analyze_results(results: List[Dict]):
    # Convertir resultados a DataFrame
    df = pd.DataFrame(results)
    
    # Análisis por modelo
    model_analysis = df.groupby('model').agg({
        'coverage': ['mean', 'std'],
        'response_time': ['mean', 'std']
    }).round(2)
    
    # Visualización
    plt.figure(figsize=(12, 6))
    
    plt.subplot(1, 2, 1)
    df.boxplot(column='coverage', by='model')
    plt.title('Cobertura de Criterios por Modelo')
    plt.ylabel('Cobertura (%)')
    
    plt.subplot(1, 2, 2)
    df.boxplot(column='response_time', by='model')
    plt.title('Tiempo de Respuesta por Modelo')
    plt.ylabel('Segundos')
    
    plt.tight_layout()
    plt.savefig('model_comparison.png')
    
    return model_analysis

def main():
    print("🤖 Iniciando pruebas de modelos de IA para gobernanza...")
    
    results = asyncio.run(run_tests())
    
    # Análisis de resultados
    analysis = analyze_results(results)
    
    print("\n📊 Resultados del Análisis:")
    print(tabulate(analysis, headers='keys', tablefmt='grid'))
    
    print("\n💾 Gráficos guardados en 'model_comparison.png'")
    
    # Recomendaciones basadas en resultados
    best_coverage = analysis['coverage']['mean'].idxmax()
    fastest = analysis['response_time']['mean'].idxmin()
    
    print("\n🎯 Recomendaciones:")
    print(f"- Mejor cobertura de criterios: {best_coverage}")
    print(f"- Respuesta más rápida: {fastest}")
    
    # Guardar resultados detallados
    with open('governance_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()