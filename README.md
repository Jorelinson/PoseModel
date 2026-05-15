#  Hand Signal AI · Detector de Poses

Aplicación web que detecta gestos de manos usando un modelo de **Teachable Machine** (PoseNet) entrenado con TensorFlow.js. Funciona completamente en el navegador — sin servidor backend.

---

## 🖐️ Poses reconocidas

| Emoji | Pose |
|-------|------|
| 👍 | Pulgar arriba |
| ✌️ | Paz |
| ✋ | Mano abierta |
| ✊ | Puño |
| 🙌 | Manos arriba |
| ☝️ | Apuntando |

---

##  Cómo usar

### Opción A — GitHub Pages (recomendado)

1. Sube el repositorio a GitHub.
2. Ve a **Settings → Pages → Source → Deploy from branch → main / root**.
3. Abre la URL que te da GitHub Pages.

### Opción B — Local con servidor HTTP

```bash
# Python 3
python -m http.server 8080

# Node.js
npx serve .
```

Luego abre `http://localhost:8080` en tu navegador.

> ⚠️ **No abras `index.html` directamente con doble clic.** Los modelos TensorFlow.js requieren que los archivos se sirvan desde un servidor HTTP (incluso local). De lo contrario obtendrás errores CORS.

---

## 📁 Estructura del proyecto

```
pose-detector/
├── index.html          ← Aplicación principal
├── model/
│   ├── model.json      ← Arquitectura del modelo
│   ├── weights.bin     ← Pesos entrenados
│   └── metadata.json   ← Etiquetas y configuración
└── README.md
```

---

##  Tecnologías

- [TensorFlow.js](https://www.tensorflow.org/js) `v1.3.1`
- [Teachable Machine Pose](https://teachablemachine.withgoogle.com/) `v0.8`
- [PoseNet](https://github.com/tensorflow/tfjs-models/tree/master/posenet) (MobileNetV1)
- HTML + CSS + Vanilla JS — sin frameworks, sin dependencias npm

---

##  Modos de uso

| Modo | Descripción |
|------|-------------|
| 📷 **Cámara** | Detección en tiempo real con tu webcam |
| 📁 **Imagen** | Sube una foto y analiza la pose |

---

## 🛠️ Personalización

Para cambiar el modelo, reemplaza los 3 archivos dentro de `model/` con los exportados desde [Teachable Machine](https://teachablemachine.withgoogle.com/) y actualiza el array `LABELS` y `EMOJIS` en `index.html`.

---

##  Licencia

MIT — libre para usar y modificar.
