#!/usr/bin/env python3
import subprocess
import json
import sys

def setup_ollama_models():
    """Configura los modelos de Ollama con parámetros optimizados."""
    models_config = {
        "mixtral": {
            "command": "ollama pull mixtral",
            "params": {
                "context_window": 8192,
                "num_ctx": 8192,
                "num_gqa": 8,
                "rope_freq_scale": 0.5,
                "temperature": 0.7
            }
        },
        "llama2": {
            "command": "ollama pull llama2",
            "params": {
                "context_window": 4096,
                "num_ctx": 4096,
                "temperature": 0.8
            }
        },
        "orca-mini": {
            "command": "ollama pull orca-mini",
            "params": {
                "context_window": 2048,
                "num_ctx": 2048,
                "temperature": 0.9
            }
        }
    }

    print("🚀 Configurando modelos de Ollama para gobernanza...")

    for model, config in models_config.items():
        print(f"\n⚙️ Configurando {model}...")
        
        # Descargar modelo
        try:
            subprocess.run(config["command"].split(), check=True)
            print(f"✅ {model} descargado correctamente")
        except subprocess.CalledProcessError as e:
            print(f"❌ Error descargando {model}: {e}")
            continue

        # Crear archivo de configuración del modelo
        model_config = {
            "model": model,
            "parameters": config["params"]
        }

        config_file = f"ollama_{model}_config.json"
        with open(config_file, 'w') as f:
            json.dump(model_config, f, indent=2)
        
        print(f"✅ Configuración guardada en {config_file}")

    print("\n🎯 Configuración completada")
    print("\nRecomendaciones de uso:")
    print("1. Mixtral: Decisiones críticas y análisis complejo")
    print("2. Llama2: Operaciones estándar y validaciones")
    print("3. Orca-mini: Respuestas rápidas y validaciones simples")

if __name__ == "__main__":
    setup_ollama_models()