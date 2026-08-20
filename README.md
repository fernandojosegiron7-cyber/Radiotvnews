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
