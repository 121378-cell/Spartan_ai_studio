from PIL import Image, ImageDraw

# Crear una imagen de 64x64 píxeles
img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Dibujar un círculo como icono simple
draw.ellipse([4, 4, 60, 60], fill='#4a90e2')
draw.ellipse([8, 8, 56, 56], fill='#357abd')

# Guardar como ICO
img.save('../favicon.ico', format='ICO')