# Salva el Mes

> Aplicación móvil de finanzas personales, **offline-first**, que aplica un método de reparto
> por categorías para organizar el ingreso de cada mes: **Fijos, Variables, Ahorro y Deudas**.

Proyecto desarrollado con **Expo (React Native)** para Android e iOS. Todos los datos viven en el
teléfono (sin backend, sin cuentas, sin internet obligatorio).

![Plataforma](https://img.shields.io/badge/plataforma-Android%20%7C%20iOS-3DDC84?logo=android&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2023-F7DF1E?logo=javascript&logoColor=black)
![Licencia](https://img.shields.io/badge/licencia-MIT-green.svg)

---

## Descripción

**Salva el Mes** no es una libreta de gastos más: parte de una regla de reparto del ingreso
(por defecto **50 / 30 / 10 / 10**) y te muestra, en tiempo real, cuánto llevas gastado en cada
categoría contra el límite que le corresponde. Así el usuario no solo registra gastos, sino que
sabe si va dentro de su presupuesto.

Pensada para funcionar sin conexión y sin registro. Los datos se guardan en el propio dispositivo
y se pueden exportar o respaldar cuando el usuario quiera.

---

## Características

### Ingresos y presupuesto

- Sueldo o ingreso mensual base, con la opción de **repetirse cada mes**.
- Múltiples **fuentes de ingreso extra** (freelance, bonos, ventas) con nombre y monto.
- Reparto configurable con **presets** (50/30/10/10, 60/20/10/10, 40/30/20/10) o **porcentajes
  propios** validados para que sumen 100 %.
- **Meta de ahorro** mensual con barra de progreso.
- **Topes por tipo de gasto** (Comida, Transporte, etc.) con alertas.

### Gastos

- Registro de gastos con monto, descripción, categoría, tipo y **foto del ticket**.
- **Entrada rápida**: botón "Repetir último" que precarga el formulario con el último gasto.
- **Gastos fijos recurrentes**: se registran una vez y se agregan solos cada mes nuevo.
- **Editar** (tocar) y **eliminar** (mantener presionado) cualquier gasto.
- **Buscador y filtros** por texto y categoría.
- **Selector de mes** para consultar meses anteriores.
- **Cargar meses anteriores** sin detallar: registra un mes pasado con solo su **ingreso** y su
  **gasto total** (se muestra como «Sin detalle» y no altera tu reparto). Cada mes guarda su propio
  ingreso y lo puedes revisar con los chips de mes.

### Análisis

- **Gráfico de dona interactivo** por categoría, con animación de barrido y detalle al tocar.
- **Barras de progreso** por categoría contra el límite del reparto.
- **Evolución de 6 meses** y comparativa del gasto, con el **ingreso real de cada mes**.
- **Estadísticas del mes**: promedio diario y semanal, número de gastos, día con más gasto y tipo
  más repetido.

### Datos y respaldo

- **Exportar gastos a CSV** (abre en Excel o Google Sheets).
- **Respaldo completo en JSON** y **restauración** para cambiar de teléfono o recuperar datos.

### Experiencia

- **Modo claro y oscuro**.
- **Bloqueo con huella o rostro** (`expo-local-authentication`).
- **Recordatorio diario** para registrar gastos y **recordatorio mensual de gastos fijos**
  (notificaciones locales).
- **Alertas de presupuesto** al 90 % y 100 % del tope, como notificación del sistema (con
  degradación a alerta dentro de la app cuando el entorno no lo permite).
- **Selector de moneda** (símbolo configurable).
- Interfaz en español, sin emojis, con iconos vectoriales.

> Nota: las notificaciones (recordatorios y alertas del sistema) requieren la app **instalada**
> (development build o APK). En Expo Go el recordatorio se degrada a un aviso dentro de la app.

---

## Capturas

> Pendiente: colocar imágenes en `docs/capturas/` y referenciarlas aquí.
> Sugerido: `docs/capturas/01-gastos.png`, `02-agregar.png`, `03-ingresos.png`, `04-resumen.png`.

<!--
![Pantalla de gastos](docs/capturas/01-gastos.png)
![Agregar gasto](docs/capturas/02-agregar.png)
-->

---

## Tecnologías

| Área | Tecnología |
| --- | --- |
| Framework | [Expo](https://expo.dev) SDK 57 |
| UI | [React Native](https://reactnative.dev) 0.86 · React 19 |
| Navegación | [Expo Router](https://docs.expo.dev/router/introduction/) (rutas por archivos) + `react-native-tab-view` / `react-native-pager-view` |
| Estado global | React Context + hooks (`src/store.jsx`) |
| Persistencia | `@react-native-async-storage/async-storage` |
| Gráficos | `react-native-svg` (dona y barras dibujadas a mano) |
| Notificaciones | `expo-notifications` (locales) |
| Seguridad | `expo-local-authentication` (biometría) |
| Archivos | `expo-file-system`, `expo-sharing`, `expo-document-picker` |
| Cámara y galería | `expo-image-picker` |
| UI auxiliar | `expo-linear-gradient`, `@expo/vector-icons` (Ionicons), `react-native-keyboard-aware-scroll-view` |
| Estilos | API `StyleSheet` con paletas claro/oscuro |
| Lenguaje | JavaScript (JSX) · utilidades de tooling en TypeScript |
| Lint | `eslint-config-expo` |
| Builds | [EAS Build](https://docs.expo.dev/build/introduction/) |

---

## Arquitectura (resumen)

- **App de una sola ruta** (`src/app/`) con un `TabView` de 4 páginas deslizables:
  **Gastos**, **Agregar**, **Ingresos** y **Resumen**.
- **Estado central** en `src/store.jsx` (React Context + `AsyncStorage`): expone datos, acciones y
  la paleta del tema a todas las pantallas.
- **Lógica pura y constantes** en `src/constants.js` (categorías, tipos, temas, formateo de moneda
  y fechas, claves de almacenamiento).
- **Utilidades** en `src/exportar.js` (CSV) y `src/notificaciones.js` (envoltura de
  `expo-notifications` con import dinámico).
- **Componente** de gráfico en `src/components/GraficoPastel.jsx`.

Detalle completo en [`MANUAL_DESARROLLADOR.md`](MANUAL_DESARROLLADOR.md).

---

## Empezar (desarrollo)

### Requisitos

- [Node.js](https://nodejs.org) 20 o superior
- npm (incluido con Node)
- Para probar en el teléfono: la app **Expo Go** (o un development build)

### Instalación

```bash
npm install
```

### Ejecutar

```bash
npm start          # servidor de desarrollo (escanea el QR con Expo Go)
npm run android    # abre en un emulador/dispositivo Android
npm run ios        # abre en el simulador de iOS
npm run web        # versión web (limitada)
```

### Calidad

```bash
npm run lint                # ESLint (eslint-config-expo)
npx expo export -p android  # verifica que el bundle compile
npx expo-doctor             # diagnóstico de dependencias y configuración
```

---

## Compilar el APK (EAS)

El proyecto usa **EAS Build** (compilación en la nube, sin Android Studio ni Xcode locales).
El perfil `preview` de `eas.json` genera un **APK instalable**.

```bash
# 1. Iniciar sesión en Expo (una sola vez)
npx eas-cli@latest login

# 2. Compilar el APK
npx eas-cli@latest build -p android --profile preview

# 3. Instalar el APK que EAS entrega (enlace/QR)
```

Perfiles disponibles en `eas.json`:

| Perfil | Salida | Uso |
| --- | --- | --- |
| `development` | Development client | Desarrollo con módulos nativos |
| `preview` | **APK** | Probar en dispositivos reales / distribuir |
| `production` | AAB | Publicar en Google Play |

---

## Estructura del proyecto

```
mi-app-gastos/
├── src/
│   ├── app/
│   │   ├── _layout.jsx        # Provider + pantalla de bloqueo (biometría)
│   │   └── index.jsx          # Contenedor con el TabView de 4 páginas
│   ├── components/
│   │   └── GraficoPastel.jsx  # Dona interactiva en SVG
│   ├── screens/
│   │   ├── GastosScreen.jsx   # Balance, gráfico, progreso e historial
│   │   ├── AgregarScreen.jsx  # Alta/edición de gastos y fijos
│   │   ├── IngresosScreen.jsx # Ingreso base, extras e historial
│   │   └── ResumenScreen.jsx  # Evolución, topes, estadísticas y ajustes
│   ├── constants.js           # Categorías, tipos, temas, formateo y claves
│   ├── store.jsx              # Estado global y persistencia (Context + AsyncStorage)
│   ├── exportar.js            # CSV y compartir archivos
│   └── notificaciones.js      # Recordatorios y alertas (expo-notifications)
├── assets/                    # Iconos y splash
├── app.json                   # Configuración de Expo
├── eas.json                   # Perfiles de build
├── index.js                   # Entrada (expo-router/entry)
└── package.json
```

---

## Documentación

- [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md) — guía de uso para la persona final.
- [`MANUAL_DESARROLLADOR.md`](MANUAL_DESARROLLADOR.md) — arquitectura, convenciones y flujo.
- [`MEJORAS.md`](MEJORAS.md) — comparación con apps del mercado y hoja de ruta.

---

## Desarrollo asistido por IA

Este proyecto se construyó en colaboración con **inteligencia artificial** como copiloto de
desarrollo:

- **Agente de programación:** [OpenCode](https://opencode.ai) — un agente de código que lee el
  repositorio, propone cambios, los implementa y ejecuta las verificaciones.
- **Tipo de IA:** modelo de lenguaje de gran escala (LLM) orientado a código, sin entrenamiento
  específico sobre este proyecto: razona sobre el código fuente y la documentación en cada sesión.
- **Flujo de trabajo:** *proponer → revisar → implementar → verificar*. Cada cambio pasa por
  `expo lint` y por una compilación de bundle (`expo export`) antes de darse por terminado.
- **Metodología:** la IA no trabaja a ciegas; consulta la documentación oficial versionada de cada
  SDK antes de tocar APIs y mantiene una bitácora del proyecto.

La IA actúa como asistente: las decisiones de producto, el diseño del método de presupuesto y la
dirección general son humanas. El resultado es código revisado y verificable.

---

## Hoja de ruta

Consultar [`MEJORAS.md`](MEJORAS.md). Fuera de alcance por ahora (requieren backend o trabajo
nativo): sincronización en la nube, multiusuario, IA de categorización, widgets y multi-moneda.

---

## Licencia

Distribuido bajo la licencia **MIT**. Ver [`LICENSE`](LICENSE).

> `LICENSE` conserva el aviso original de la plantilla de Expo (MIT, 650 Industries); ajustar el
> titular si se desea.

---

## Autor

- Nombre: **Anderson Bustos**
- GitHub: [@AndriuNaus](https://github.com/AndriuNaus)
