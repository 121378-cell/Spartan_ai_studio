import PyInstaller.__main__
import os
import shutil

# Obtener el directorio actual
current_dir = os.path.dirname(os.path.abspath(__file__))

# Configurar las opciones de PyInstaller
options = [
    'spartan_launcher.py',
    '--onefile',
    '--windowed',
    '--icon=../favicon.ico',
    '--name=SpartanHub',
    f'--distpath={os.path.join(current_dir, "../")}',
    '--clean',
    '--add-data=../favicon.ico;.'
]

# Ejecutar PyInstaller
PyInstaller.__main__.run(options)

# Limpiar archivos temporales
build_dir = os.path.join(current_dir, 'build')
spec_file = os.path.join(current_dir, 'SpartanHub.spec')

if os.path.exists(build_dir):
    shutil.rmtree(build_dir)
if os.path.exists(spec_file):
    os.remove(spec_file)

print("Ejecutable creado con éxito!")