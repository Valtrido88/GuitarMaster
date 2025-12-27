GuitarMaster — Página de aprendizaje de guitarra con asesor virtual

Características principales
- Asesor virtual: Consejos dinámicos para progresar de lo simple a lo complejo.
- Metrónomo: WebAudio con acentos, tap-tempo y visual.
- Afinador: Detección de pitch (autocorrelación) para cuerdas E2–E4.
- Karaoke + Banda: Resaltado de letra por compases, percusión y bajo sintéticos.
- Ejercicios de dedos: Patrones 1-2-3-4, evaluación de golpes en pulso.
- Práctica de acordes: Cambios y rasgueos al pulso, feedback del público.
- Público (abucheos/ánimos): Voces sintetizadas; se puede deshabilitar.
- Modo competición: Puntuación P1 vs P2 con eventos del público.
- Logros: Rachas, tiempo practicado, BPM máximo; almacenamiento local.

Requisitos
- Navegador moderno con soporte WebAudio y `getUserMedia`.
- Micrófono para afinador y evaluación de ritmo.

Cómo ejecutar (sin Python)
Opción A — Docker + nginx (recomendado):

```bash
pushd /workspaces/GuitarMaster
docker run --rm -p 8080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine
```

Abre en el navegador:

```bash
$BROWSER http://localhost:8080/index.html
```

Opción B — Extensión VS Code (Live Server / Live Preview):
- Instala “Live Server” o “Live Preview” desde el Marketplace.
- Abre `index.html` y ejecuta “Open with Live Server/Preview”.

Consejos de uso
- Pulsa “Activar audio” antes de reproducir sonido.
- Pulsa “Conectar micrófono” para habilitar afinador y detección.
- Usa el karaoke: define BPM, progresión (ej. "C G Am F") y letra.
- Si el público abuchea mucho, baja el BPM y vuelve a subir.
- Deshabilita el público en Ajustes si prefieres practicar sin distracciones.

Privacidad
- El audio del micrófono se procesa localmente en el navegador. No se envía a servidores.

Próximos pasos
- Integración IA real para análisis de desempeño y recomendaciones personalizadas.
- Reconocimiento de acordes más preciso y evaluación de timing avanzada.
# GuitarMaster

## Método IA (beta)
- Diagnóstico inicial: pruebas rápidas de ritmo (palmas), afinación (nota sostenida) y cambio de acordes.
- Perfil del alumno: guarda métricas (precisión de ritmo, desviación en cents, tiempo medio de cambio).
- Sesión diaria (10 min): cola adaptativa con calentamiento, técnica, fragmento de canción y repaso.
- Runner de sesión: ejecución secuencial con cuenta atrás y paradas automáticas de cada segmento.
- Ajustes: umbral de ritmo y tolerancia de afinación configurables.

Acceso en la app
- Diagnóstico: menú “Diagnóstico” → ejecuta los tests y guarda el perfil.
- Sesión diaria: menú “Sesión diaria” → pulsa “Iniciar sesión completa”.
- Ajustes: menú “Ajustes” → configura umbrales si detecta falsos positivos.

Notas
- Las métricas de ritmo/afinación son aproximadas y se ejecutan en el navegador.
- El audio no se sube ni se almacena en servidores.