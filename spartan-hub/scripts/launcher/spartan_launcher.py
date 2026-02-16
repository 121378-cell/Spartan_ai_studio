import os
import sys
import subprocess
import threading
import time
import tkinter as tk
from tkinter import ttk
import json
import psutil
import requests
from pathlib import Path

class SparkProgress:
    def __init__(self, canvas, x, y, size=10, color="#00ff00"):
        self.canvas = canvas
        self.x = x
        self.y = y
        self.size = size
        self.color = color
        self.active = False
        self.oval = canvas.create_oval(x, y, x + size, y + size, fill="gray")
    
    def activate(self):
        self.active = True
        self.canvas.itemconfig(self.oval, fill=self.color)
    
    def deactivate(self):
        self.active = False
        self.canvas.itemconfig(self.oval, fill="gray")

class SpartanLauncher:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Spartan Hub Launcher")
        self.root.geometry("600x400")
        self.root.configure(bg='#2b2b2b')
        
        # Configurar estilo
        style = ttk.Style()
        style.configure("Custom.TLabel", foreground="white", background="#2b2b2b")
        style.configure("Custom.TButton", padding=10)
        
        # Frame principal
        self.main_frame = ttk.Frame(self.root)
        self.main_frame.pack(padx=20, pady=20, fill=tk.BOTH, expand=True)
        
        # Canvas para los indicadores
        self.canvas = tk.Canvas(self.main_frame, width=560, height=200, bg="#2b2b2b", highlightthickness=0)
        self.canvas.pack(pady=20)
        
        # Crear indicadores de progreso
        self.services = {
            "Ollama Service": {"port": 11434, "spark": None, "status": False},
            "AI Backend": {"port": 8000, "spark": None, "status": False},
            "Main Backend": {"port": 3000, "spark": None, "status": False},
            "Frontend": {"port": 5173, "spark": None, "status": False}
        }
        
        # Posicionar los indicadores
        y_pos = 50
        for i, (service_name, service_data) in enumerate(self.services.items()):
            x_pos = 50 + (i * 140)
            self.canvas.create_text(x_pos + 25, y_pos - 20, text=service_name, fill="white", anchor="center")
            service_data["spark"] = SparkProgress(self.canvas, x_pos + 20, y_pos)
        
        # Botones
        self.button_frame = ttk.Frame(self.main_frame)
        self.button_frame.pack(pady=20)
        
        self.start_button = ttk.Button(self.button_frame, text="Iniciar Servicios", command=self.start_services)
        self.start_button.pack(side=tk.LEFT, padx=10)
        
        self.stop_button = ttk.Button(self.button_frame, text="Detener Servicios", command=self.stop_services)
        self.stop_button.pack(side=tk.LEFT, padx=10)
        
        # Log
        self.log_text = tk.Text(self.main_frame, height=8, bg="#1e1e1e", fg="white")
        self.log_text.pack(fill=tk.BOTH, expand=True, pady=10)
        
        self.processes = {}
        self.monitor_thread = None
        self.running = False

    def log(self, message):
        self.log_text.insert(tk.END, f"{message}\n")
        self.log_text.see(tk.END)
    
    def is_port_in_use(self, port):
        for proc in psutil.process_iter(['pid', 'name', 'connections']):
            try:
                for conn in proc.connections():
                    if conn.laddr.port == port:
                        return True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return False

    def start_services(self):
        if self.running:
            self.log("Los servicios ya están en ejecución")
            return
        
        self.running = True
        self.start_button.state(['disabled'])
        
        # Obtener la ruta base
        base_path = Path(os.path.dirname(os.path.abspath(__file__))).parent
        
        # Iniciar Ollama (asumiendo que ya está instalado)
        if not self.is_port_in_use(11434):
            self.log("Iniciando Ollama...")
            try:
                self.processes["ollama"] = subprocess.Popen(
                    ["ollama", "serve"],
                    cwd=str(base_path)
                )
            except Exception as e:
                self.log(f"Error al iniciar Ollama: {str(e)}")
        
        # Iniciar AI Backend
        self.log("Iniciando AI Backend...")
        ai_backend_path = base_path / "AI"
        env = os.environ.copy()
        env["PYTHONPATH"] = str(ai_backend_path)
        try:
            self.processes["ai_backend"] = subprocess.Popen(
                [sys.executable, "main.py"],
                cwd=str(ai_backend_path),
                env=env
            )
        except Exception as e:
            self.log(f"Error al iniciar AI Backend: {str(e)}")
        
        # Iniciar Main Backend
        self.log("Iniciando Main Backend...")
        backend_path = base_path / "backend"
        try:
            self.processes["main_backend"] = subprocess.Popen(
                ["npm", "start"],
                cwd=str(backend_path)
            )
        except Exception as e:
            self.log(f"Error al iniciar Main Backend: {str(e)}")
        
        # Iniciar Frontend
        self.log("Iniciando Frontend...")
        try:
            self.processes["frontend"] = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=str(base_path)
            )
        except Exception as e:
            self.log(f"Error al iniciar Frontend: {str(e)}")
        
        # Iniciar monitoreo
        self.monitor_thread = threading.Thread(target=self.monitor_services)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
    
    def monitor_services(self):
        while self.running:
            # Verificar Ollama
            try:
                response = requests.get("http://localhost:11434/api/tags")
                self.services["Ollama Service"]["spark"].activate()
                self.services["Ollama Service"]["status"] = True
            except:
                self.services["Ollama Service"]["spark"].deactivate()
                self.services["Ollama Service"]["status"] = False
            
            # Verificar AI Backend
            try:
                response = requests.get("http://localhost:8000/health")
                self.services["AI Backend"]["spark"].activate()
                self.services["AI Backend"]["status"] = True
            except:
                self.services["AI Backend"]["spark"].deactivate()
                self.services["AI Backend"]["status"] = False
            
            # Verificar Main Backend
            try:
                response = requests.get("http://localhost:3000/health")
                self.services["Main Backend"]["spark"].activate()
                self.services["Main Backend"]["status"] = True
            except:
                self.services["Main Backend"]["spark"].deactivate()
                self.services["Main Backend"]["status"] = False
            
            # Verificar Frontend
            try:
                response = requests.get("http://localhost:5173")
                self.services["Frontend"]["spark"].activate()
                self.services["Frontend"]["status"] = True
            except:
                self.services["Frontend"]["spark"].deactivate()
                self.services["Frontend"]["status"] = False
            
            time.sleep(2)
    
    def stop_services(self):
        if not self.running:
            return
        
        self.running = False
        self.log("Deteniendo servicios...")
        
        # Detener todos los procesos
        for service_name, process in self.processes.items():
            try:
                process.terminate()
                process.wait(timeout=5)
            except:
                try:
                    process.kill()
                except:
                    pass
            self.log(f"Servicio {service_name} detenido")
        
        self.processes.clear()
        
        # Desactivar todos los indicadores
        for service_data in self.services.values():
            service_data["spark"].deactivate()
            service_data["status"] = False
        
        self.start_button.state(['!disabled'])
        self.log("Todos los servicios detenidos")
    
    def run(self):
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        self.root.mainloop()
    
    def on_closing(self):
        self.stop_services()
        self.root.destroy()

if __name__ == "__main__":
    launcher = SpartanLauncher()
    launcher.run()