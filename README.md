# RadioTV PWA COMPLETO v5

Proyecto completo para GitHub + Vercel.

## Incluye
- Inicio
- Radio
- TV
- Noticias
- Programación
- Modo claro/oscuro/automático
- Fondos independientes
- Panel admin
- Guardado directo a GitHub
- Subida de imágenes
- PWA instalable
- Service Worker actualizado

## Vercel Environment Variables
ADMIN_PASSWORD
SESSION_SECRET
GITHUB_OWNER
GITHUB_REPO
GITHUB_BRANCH
GITHUB_TOKEN

## Panel
/admin.html

## Importante
Usa streams HTTPS.
Para TV se recomienda HLS .m3u8 compatible con navegador/CORS.


## v5.1 LIVE
- La app consulta `/api/public-config` al abrir.
- Esa función lee `data/config.json` directamente desde GitHub.
- Después del primer despliegue de v5.1, los cambios guardados desde Admin pueden verse sin esperar otro redeploy.
- Zeno usa EventSource/SSE para `api.zeno.fm/mounts/metadata/subscribe/...`.
- Los streams Zeno terminados en `.m3u`, `.m3u8` o `.pls` se convierten automáticamente a la URL directa.

## v5.2 LOGO DINÁMICO
- La Radio usa siempre el logo principal configurado en Admin.
- Los metadatos de Zeno cambian canción/artista, pero no cambian el logo.
- El favicon de la pestaña/dirección usa automáticamente el logo configurado.
- Las imágenes subidas se pueden leer directamente desde GitHub mediante `/api/public-asset`.
- Se eliminó "Portada de respaldo" de Radio.
- Se eliminó la tarjeta "PWA · Instalable" de la sección Más.

## v5.3 ROLL-UP
- Noticias destacadas ahora rotan automáticamente cada 5 segundos.
- Transición vertical tipo roll-up.
- Flechas y puntos para navegación manual.
- Swipe vertical en celulares.
- Pausa al pasar el mouse sobre el destacado.
- Al tocar una noticia se abre su contenido completo.

## v5.4 LOGO TOTAL
- El círculo grande del inicio ya no muestra "RT".
- Ahora usa automáticamente el logo principal configurado desde Admin.
- El mismo logo se reutiliza en cabecera, Radio, favicon y círculo del inicio.
