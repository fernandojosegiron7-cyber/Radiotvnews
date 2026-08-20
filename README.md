# FG Radio & TV PWA v4.0 — Adaptive + Noticias

Versión mejorada de la PWA con panel administrativo conectado a GitHub.

## Novedades v4
- Rediseño completo de Radio
- Modo claro / oscuro / automático
- Botón manual para cambiar de tema
- Fondo independiente para modo claro y oscuro
- Nueva sección Noticias
- Categorías de noticias
- Noticias destacadas
- Lectura completa dentro de la app
- Imagen, fecha, categoría, resumen y cuerpo
- Administración de noticias desde /admin.html
- Subida de imágenes de noticias a GitHub
- Inicio más visual con Radio, TV, programación y noticias
- Navegación inferior: Inicio / Radio / TV / Noticias / Más

## Panel Administrativo
Desde `/admin.html` puedes editar:
- Identidad
- Radio
- TV
- Programación
- Noticias
- Apariencia
- Redes sociales

### Apariencia
Puedes elegir:
- Automático según el dispositivo
- Oscuro
- Claro

Además puedes subir:
- Fondo para modo oscuro
- Fondo para modo claro

## Noticias
Cada noticia permite:
- Fecha
- Categoría
- Titular
- Imagen
- Resumen
- Texto completo
- Marcar como destacada

## Backend
Se mantiene:
Panel → funciones privadas de Vercel → GitHub API → commit → nuevo deployment.

Consulta `INSTALACION-RAPIDA.txt` para las variables necesarias.

## Cambio v4.1
- Eliminada la barra negra fija de navegación inferior.
- Radio y TV siguen accesibles desde las tarjetas/botones de la pantalla principal.
- Ajustado el espacio inferior para aprovechar mejor la pantalla.
