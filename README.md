# Registro de Comprobantes (PWA)

Aplicacion web progresiva enfocada en movil y web para registrar:

- Comprobantes de ingreso (`CI`) y egreso (`CE`)
- Fecha
- Valor del comprobante
- `Recibido de` (autocompletado con terceros)
- `Por concepto de`

Tambien incluye CRUD de terceros (`codigo`, `nombre`) y sincronizacion con Google Sheets mediante Google Apps Script.

## Sincronizacion y configuracion

La app mantiene el mismo enfoque de configuracion y sincronizacion de la guia base:

- Configurar `URL` del Apps Script + `token`
- Probar conexion
- Sincronizar subida y descarga
- Forzar re-subida total
- Auto-sync silencioso en carga/recarga, al volver a foco, al reconectar internet y cada 60 segundos

## Hojas esperadas en Excel

El Apps Script (`backend/Code.js`) crea y mantiene estas hojas:

- `Terceros`: `id`, `codigo`, `nombre`
- `Comprobantes`: `id`, `tipo`, `fecha`, `valor`, `terceroId`, `recibidoDe`, `concepto`

## Ejecucion local

1. `npm install`
2. `npm run dev`
3. `npm run build`

### Probar desde celular en red local

- Para abrir desde otro dispositivo en la misma red: `npm run dev:lan`
- URL ejemplo: `http://<IP-PC>:5173/RegistroDeComprobantes/`

Nota importante:
- En Android/iOS, si usas **HTTP por IP local** (`http://192...`, `http://198...`), normalmente el navegador solo permite **Agregar acceso directo**.
- Para instalación PWA real (sin depender del navegador), necesitas **origen seguro (HTTPS)**.

### Probar instalacion PWA real en celular (recomendado)

1. Ejecuta la app: `npm run dev:lan` o `npm run preview:lan`
2. Expone el puerto por un túnel HTTPS (ejemplo: Cloudflare Tunnel o ngrok).
3. Abre en el celular la URL `https://...` del túnel.
4. Ahí sí debería aparecer `Instalar app` / `Add to Home Screen` como PWA instalable.

## Despliegue en GitHub Pages (indicado)

1. Subir el proyecto a un repositorio GitHub.
2. En `vite.config.ts`, ajustar `VITE_BASE_PATH` (o dejar `/RegistroDeComprobantes/` si coincide con el nombre del repo).
3. Habilitar GitHub Pages con **GitHub Actions**.
4. El workflow ya existe en `.github/workflows/deploy.yml` y desplegara en cada push a `main`.

## Publicacion de Apps Script

1. Abrir el archivo de Google Sheet.
2. Ir a `Extensiones > Apps Script` y pegar `backend/Code.js`.
3. Cambiar `API_TOKEN` por un valor seguro.
4. Implementar como `Aplicacion web` (acceso segun necesidad) y copiar URL.
5. Pegar URL y token en la pantalla de configuracion de la app.
