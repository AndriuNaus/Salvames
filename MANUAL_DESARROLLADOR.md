# Manual del desarrollador — Salva el Mes

Documentación técnica del proyecto: arquitectura, modelo de datos, convenciones y flujo de trabajo.
Está escrita para que cualquier persona (o agente de IA) pueda retomar el código sin fricción.

---

## Índice

1. [Visión general](#1-visión-general)
2. [Requisitos y comandos](#2-requisitos-y-comandos)
3. [Estructura del proyecto](#3-estructura-del-proyecto)
4. [Arquitectura y flujo de datos](#4-arquitectura-y-flujo-de-datos)
5. [Modelo de datos](#5-modelo-de-datos)
6. [Persistencia](#6-persistencia)
7. [Navegación](#7-navegación)
8. [Convenciones de código](#8-convenciones-de-código)
9. [Módulos clave](#9-módulos-clave)
10. [Notificaciones](#10-notificaciones)
11. [Exportación y respaldo](#11-exportación-y-respaldo)
12. [Migraciones de datos](#12-migraciones-de-datos)
13. [Calidad y verificación](#13-calidad-y-verificación)
14. [Builds y publicación](#14-builds-y-publicación)
15. [Desarrollo asistido por IA](#15-desarrollo-asistido-por-ia)
16. [Cómo extender el proyecto](#16-cómo-extender-el-proyecto)
17. [Problemas conocidos](#17-problemas-conocidos)
18. [Hoja de ruta técnica](#18-hoja-de-ruta-técnica)

---

## 1. Visión general

**Salva el Mes** es una app de finanzas personales **offline-first**: sin backend, sin cuentas y
sin dependencia de red. Todos los datos se guardan en el dispositivo con `AsyncStorage`.

El núcleo del producto es un **método de reparto del ingreso** en cuatro categorías (Fijos,
Variables, Ahorro y Deudas) con porcentajes configurables. A partir de ahí, la app calcula límites,
progreso y alertas.

- **Framework:** Expo SDK 57 (React Native 0.86, React 19).
- **Lenguaje:** JavaScript (JSX). No es un proyecto TypeScript, aunque hay tooling relacionado.
- **Navegación:** Expo Router (`src/app/`), con una sola ruta que monta un `TabView` de 4 páginas.
- **Estado:** React Context + hooks en un único store (`src/store.jsx`).
- **Persistencia:** `@react-native-async-storage/async-storage`.

---

## 2. Requisitos y comandos

- **Node.js** 20 o superior.
- **npm** (o `bun` si algún día se añade `bun.lock`; entonces usar `bunx`).

> Regla del proyecto: **nunca** instalar paquetes con `npm install <pkg>`. Usar siempre
> `npx expo install <pkg>`, que resuelve la versión compatible con el SDK.

```bash
npm install                 # instalar dependencias
npm start                   # servidor de desarrollo (Expo Go)
npm run android             # Android (emulador/dispositivo)
npm run ios                 # iOS (simulador)
npm run web                 # web (limitada)

npm run lint                # ESLint (eslint-config-expo)
npx expo export -p android  # verificar que el bundle compila
npx expo-doctor             # diagnóstico de dependencias/config
npx expo install --fix      # corregir versiones incompatibles
```

---

## 3. Estructura del proyecto

```
mi-app-gastos/
├── src/
│   ├── app/
│   │   ├── _layout.jsx        # FinanzasProvider + pantalla de bloqueo biométrico
│   │   └── index.jsx          # TabView con las 4 páginas
│   ├── components/
│   │   └── GraficoPastel.jsx  # Dona interactiva dibujada con react-native-svg
│   ├── screens/
│   │   ├── GastosScreen.jsx   # Tablero: balance, dona, progreso e historial
│   │   ├── AgregarScreen.jsx  # Alta/edición de gastos y gastos fijos
│   │   ├── IngresosScreen.jsx # Ingreso base, extras e historial de ingresos
│   │   └── ResumenScreen.jsx  # Análisis, ajustes, exportar/respaldar
│   ├── constants.js           # Constantes, categorías, temas, formateo, claves
│   ├── store.jsx              # Estado global y persistencia
│   ├── exportar.js            # Generación de CSV y compartir
│   └── notificaciones.js      # Recordatorios y alertas locales
├── assets/                    # Iconos, splash, favicon
├── app.json                   # Configuración de Expo
├── eas.json                   # Perfiles de build (EAS)
├── eslint.config.js           # Config de ESLint (flat config)
├── index.js                   # Entrada → expo-router/entry
└── package.json
```

> Convención de Expo Router: **solo** `src/app/` contiene rutas. Componentes, hooks y utilidades
> viven fuera de `src/app/` (aquí en `src/components`, `src/constants.js`, etc.).

---

## 4. Arquitectura y flujo de datos

```
                 ┌────────────────────────────────────────────┐
                 │            src/app/_layout.jsx             │
                 │   FinanzasProvider  +  Bloqueo biométrico  │
                 └───────────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────▼────────────────────┐
                 │             src/app/index.jsx              │
                 │        TabView (4 páginas deslizables)     │
                 └───┬──────────────┬──────────────┬──────────┘
                     │              │              │
             ┌───────▼──┐   ┌───────▼───┐  ┌───────▼────┐  ┌────────────┐
             │ Gastos   │   │ Agregar   │  │ Ingresos   │  │ Resumen    │
             └────┬─────┘   └─────┬─────┘  └─────┬──────┘  └─────┬──────┘
                  └───────────────┴──────────────┴───────────────┘
                                         │  useFinanzas()
                 ┌───────────────────────▼────────────────────┐
                 │              src/store.jsx                 │
                 │   estado  ·  acciones  ·  persistencia     │
                 └───────────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────▼────────────────────┐
                 │        AsyncStorage (datos locales)        │
                 └────────────────────────────────────────────┘
```

- **Única fuente de verdad:** el store. Las pantallas no leen `AsyncStorage` directamente; consumen
  el contexto con `useFinanzas()` y llaman a sus setters/acciones.
- **Persistencia reactiva:** cada bloque de estado tiene un `useEffect` que, cuando `cargado` es
  `true`, escribe en su clave de `AsyncStorage`. Así ninguna pantalla se preocupa por guardar.
- **Sin red:** no hay llamadas HTTP en el flujo de datos. Las únicas integraciones nativas son
  notificaciones, biometría, cámara/galería y compartir archivos.

---

## 5. Modelo de datos

Formas (shapes) principales que se manejan en memoria y se serializan a JSON.

### Gasto

```js
{
  id: 'l1x2...',            // identificador único (nuevoId())
  monto: 1250.5,            // número
  descripcion: 'Supermercado',
  categoria: 'variables',   // 'fijos' | 'variables' | 'ahorro' | 'deudas' | 'sinDetalle'
  subtipo: 'Comida',        // tipo dentro de la categoría
  subtipoLibre: '',         // texto libre si subtipo === 'Otro'
  fecha: '2026-10-14T...',  // ISO — el MES se deduce de aquí (claveMesDesdeFecha)
  foto: 'file://...',       // opcional (uri local)
  fijoId: 'fx1...',         // opcional: presente si proviene de un gasto fijo
  resumen: true,            // opcional: total de un mes cargado sin detalle
}
```

> No hay campo `mes`: el mes de un gasto se calcula con `claveMesDesdeFecha(gasto.fecha)`.

### Gasto de resumen (mes cargado sin detalle)

Cuando se usa **Cargar mes anterior**, se crea un gasto con `resumen: true`,
`categoria: 'sinDetalle'`, `subtipo: 'Total del mes'` y `descripcion: 'Gasto total del mes'`.
Suma al total y al balance del mes, se pinta gris en la dona, y **no** participa del reparto
(no está en `ORDEN_CATEGORIAS`) ni de los topes. Hay uno como máximo por mes; cargarlo de nuevo
lo actualiza.

### Gasto fijo (`fijos[]`)

```js
{
  id: 'fx1...',
  monto: 3000,
  descripcion: 'Renta',
  categoria: 'fijos',
  subtipo: 'Vivienda',
  subtipoLibre: '',
  ultimoMes: '2026-10',     // último mes en que se agregó automáticamente
}
```

### Ingreso extra (`extras[]`)

```js
{ id: 'ex1...', nombre: 'Freelance', monto: 2000 }
```

### Historial de ingresos (`historialIngresos[]`)

```js
{ id: 'hi1...', mes: '2026-10', monto: 10000, fecha: '2026-10-01T...' }
```

### Reparto (`porcentajes`)

```js
{ fijos: 50, variables: 30, ahorro: 10, deudas: 10 }   // deben sumar 100
```

### Topes (`topes`)

```js
{ Comida: 1500, Transporte: 800 }   // tope mensual por tipo
```

### Ajustes de notificaciones (`notif`)

```js
{
  activado: true, hora: 20, minuto: 0,
  fijosActivado: true, fijosDia: 1, fijosHora: 9,
  alertas: true,
}
```

### Respaldo (JSON completo)

```js
{
  app: 'mi-app-gastos',
  version: 1,
  exportadoEn: '2026-10-14T...',
  tema, moneda, sueldo, mesIngreso, repetirCadaMes,
  extras, historialIngresos, gastos, fijos,
  porcentajes, topes, metaAhorro, notif, bloqueo,
}
```

`obtenerRespaldo()` construye este objeto; `aplicarRespaldo(datos)` lo valida, normaliza y persiste.

---

## 6. Persistencia

Las claves viven en `src/constants.js` (prefijo `@mi-app-gastos/`):

| Constante | Clave | Contenido |
| --- | --- | --- |
| `STORAGE_SUELDO` | `@mi-app-gastos/sueldo` | Ingreso base (número como string) |
| `STORAGE_GASTOS` | `@mi-app-gastos/gastos` | Array de gastos |
| `STORAGE_REPETIR_MES` | `@mi-app-gastos/repetir-mes` | `'1'` / `'0'` |
| `STORAGE_MES_INGRESO` | `@mi-app-gastos/mes-ingreso` | `'YYYY-MM'` |
| `STORAGE_HISTORIAL_INGRESOS` | `@mi-app-gastos/historial-ingresos` | Array |
| `STORAGE_TEMA` | `@mi-app-gastos/tema` | `'claro'` / `'oscuro'` |
| `STORAGE_EXTRAS` | `@mi-app-gastos/extras` | Array |
| `STORAGE_PORCENTAJES` | `@mi-app-gastos/porcentajes` | Objeto |
| `STORAGE_TOPES` | `@mi-app-gastos/topes` | Objeto |
| `STORAGE_META` | `@mi-app-gastos/meta` | Meta de ahorro |
| `STORAGE_FIJOS` | `@mi-app-gastos/fijos` | Array de gastos fijos |
| `STORAGE_NOTIF` | `@mi-app-gastos/notif` | Objeto de ajustes |
| `STORAGE_BLOQUEO` | `@mi-app-gastos/bloqueo` | `'1'` / `'0'` |
| `STORAGE_MONEDA` | `@mi-app-gastos/moneda` | Código de moneda |

**Patrón:**

1. Al montar, el provider lee todas las claves con `AsyncStorage.getItem`/`multiGet`, hidrata el
   estado y marca `cargado = true`.
2. Cada `useEffect` de persistencia escribe **solo cuando** `cargado` es `true` (evita borrar datos
   antes de que termine la carga inicial).
3. La restauración usa `AsyncStorage.multiSet` para escribir todo de golpe.

---

## 7. Navegación

- `src/app/_layout.jsx`: envuelve todo en `FinanzasProvider` y decide si mostrar la **pantalla de
  bloqueo** (biometría) antes del contenido. También configura la `StatusBar`.
- `src/app/index.jsx`: la única ruta. Monta un `TabView` (de `react-native-tab-view`) con las cuatro
  páginas, sincronizado con `pagina` del store para poder saltar entre pestañas por código (por
  ejemplo, desde el aviso de "falta el ingreso" hacia Ingresos).
- No hay `Stack` ni rutas adicionales: la app es de una sola pantalla con pestañas deslizables.

---

## 8. Convenciones de código

- **Idioma:** identificadores de dominio y textos en **español** (`gastos`, `sueldo`, `topes`…).
  Comentarios también en español.
- **Sin emojis** en la interfaz: toda la iconografía es vectorial (`@expo/vector-icons` / Ionicons).
- **Moneda:** se usa `formatoMoneda()` de `constants.js` en todos los sitios. El símbolo es global
  a nivel de módulo (`definirSimboloMoneda`), de modo que las ~22 llamadas existentes no cambian al
  elegir otra moneda desde Resumen.
- **Temas:** cada pantalla lee `paleta` del store (`TEMAS[tema]`) y aplica colores y estilos en
  línea; los `StyleSheet` guardan solo lo estructural. No hay colores "hardcodeados" fuera de las
  paletas.
- **Animaciones de layout:** `LayoutAnimation.configureNext(...)` mediante el helper `animar()`.
- **Módulos nativos delicados:** se importan de forma **dinámica** (`await import('...')`) dentro de
  las funciones para que la app no falle en entornos que no los soportan (por ejemplo,
  `expo-notifications` en Expo Go).
- **Carpetas nativas:** `android/` e `ios/` están en `.gitignore`; se generan con Continuous Native
  Generation (CNG). **Nunca** editarlas a mano: se configura en `app.json` y config plugins.
- **Dependencias:** instalar siempre con `npx expo install` para respetar el SDK.

---

## 9. Módulos clave

### `src/store.jsx`

Contexto global. Expone (vía `useFinanzas()`):

- **Tema:** `tema`, `paleta`, `alternarTema`.
- **Ingreso:** `sueldoTexto`, `setSueldoTexto`, `sueldo`, `setSueldo`, `extras`, `setExtras`,
  `totalIngreso` (derivado), `repetirCadaMes`, `cambiarRepetir`, `mesIngreso`, `setMesIngreso`,
  `historialIngresos`, `setHistorialIngresos`.
- **Gastos:** `gastos`, `setGastos`, `gastoEnEdicion`, `setGastoEnEdicion`.
- **Presupuesto:** `porcentajes`, `setPorcentajes`, `topes`, `setTopes`, `metaAhorro`,
  `setMetaAhorro`.
- **Fijos:** `fijos`, `setFijos`.
- **Moneda:** `moneda`, `cambiarMoneda`.
- **Respaldo:** `obtenerRespaldo()`, `aplicarRespaldo(datos)`.
- **Ajustes:** `notif`, `setNotif`, `bloqueo`, `setBloqueo`.
- **UI:** `pagina`, `setPagina`, `cargado`.

Constantes internas: `PORCENTAJES_BASE`, `NOTIF_BASE`, helper `porcentajesValidos()`.

### `src/constants.js`

- **Categorías:** `CATEGORIAS` (colores, gradientes, etiquetas), `ORDEN_CATEGORIAS` (las 4 del
  reparto) y `SIN_DETALLE` (categoría especial para totales de meses cargados sin detalle).
- **Tipos:** catálogo de tipos por categoría e `ICONOS_SUBTIPO`.
- **Fechas:** `claveMesActual()`, `claveMesDesdeFecha()`, `etiquetaDeClaveMes()`,
  `formatoFechaCorta()` y `fechaEnMes(clave)` (fecha dentro de un mes, para cargar meses pasados).
- **Ingreso por mes:** `ingresoDeMes(mes, mesActual, totalIngreso, historial)`: el mes en curso usa
  base + extras; los pasados, lo registrado en el historial. Lo usan Gastos, Agregar y Resumen.
- **Moneda:** `MONEDAS`, `MONEDA_POR_DEFECTO`, `definirSimboloMoneda()`, `formatoMoneda()`.
- **Temas:** `TEMAS` (paletas claro/oscuro).
- **Migración:** `migrarCategoria()` (ver sección 12).
- **Claves de almacenamiento:** todas las `STORAGE_*`.

### `src/exportar.js`

- `construirCsvGastos(gastos, moneda)`: genera el CSV (Fecha, Descripción, Monto, Categoría, Tipo,
  Fijo).
- `compartirTexto(...)` / helpers de exportación con `expo-file-system` + `expo-sharing`.

### `src/notificaciones.js`

Envoltura de `expo-notifications`. Notificaciones **locales** (no hay servidor push):

- Recordatorio diario para registrar gastos.
- Recordatorio **mensual** de gastos fijos (`MONTHLY` con `day`).
- `avisarPresupuesto(...)`: alerta al 90 % / 100 % de un tope.

### `src/components/GraficoPastel.jsx`

Dona interactiva en `react-native-svg`. La animación hace un **barrido global en sentido horario**
(no todas las porciones crecen a la vez) con `Easing.inOut(Easing.quad)` y ~1600 ms. El caso de una
sola categoría usa `strokeDasharray`/`strokeDashoffset` con `transform="rotate(-90 cx cy)"`.

---

## 10. Notificaciones

- `expo-notifications` se importa de forma **dinámica**. En **Expo Go** las notificaciones locales
  están limitadas: el recordatorio se degrada a un **aviso dentro de la app**; las alertas de
  presupuesto funcionan como `Alert` normal.
- Las notificaciones reales (recordatorios y push del sistema) requieren un **build instalado**
  (development build o APK).
- Trigger mensual: `{ type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day, hour, minute }`.
  Notificación inmediata: `trigger: null`.
- Requiere el plugin/configuración en `app.json` (canal de Android). Verificar con `npx expo-doctor`.

---

## 11. Exportación y respaldo

- **CSV (`exportar.js`):** texto plano con separador y encabezados; se comparte con la hoja de
  compartir del sistema. Pensado para abrir en Excel/Google Sheets.
- **Respaldo JSON (`store.obtenerRespaldo` + `expo-sharing`):** objeto completo con `version: 1`.
- **Restauración (`store.aplicarRespaldo`):** valida el objeto, normaliza con valores por defecto,
  aplica `migrarCategoria` a categorías antiguas y persiste con `multiSet`.
- **Limitación deliberada:** restaurar **solo** acepta el JSON de la app, no CSV/Excel.

---

## 12. Migraciones de datos

Con el tiempo cambiaron los nombres de algunas categorías/tipos. Para no romper datos guardados,
`migrarCategoria(valor)` en `constants.js` convierte valores antiguos a los actuales. Se aplica:

- Al **restaurar** un respaldo (a `gastos` y `fijos`).
- En los puntos donde se normaliza el modelo.

Regla: al **renombrar** una categoría o tipo, actualizar `migrarCategoria` para no perder datos
históricos.

---

## 13. Calidad y verificación

Antes de dar por terminado **cualquier** cambio:

```bash
npm run lint                # debe salir limpio
npx expo export -p android  # debe compilar el bundle
```

Notas:

- `npm run lint` usa caché. Si aparece un error fantasma de `import/namespace`, limpiar con
  `rm -rf .expo/cache/eslint` o ejecutar `npx expo lint --no-cache`.
- `npx expo-doctor` es útil tras cambiar dependencias.
- No se ha configurado suite de tests automatizados todavía (ver hoja de ruta).

---

## 14. Builds y publicación

Perfiles en `eas.json`:

| Perfil | Salida | Uso |
| --- | --- | --- |
| `development` | Development client (`distribution: internal`) | Desarrollo con módulos nativos |
| `preview` | **APK** (`android.buildType: apk`) | Probar/distribuir en dispositivos |
| `production` | AAB (`autoIncrement: true`) | Publicar en Google Play |

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview   # APK
npx eas-cli@latest build -p android --profile production # AAB para la tienda
```

- La app está identificada como `com.miappgastos.app`, versión `1.0.0`, `versionCode 1`.
- **Nombre visible:** "Salva el Mes" (`app.json` → `name` y encabezado en `src/app/index.jsx`). El
  `slug`, el `scheme` y el paquete Android siguen como `mi-app-gastos` / `com.miappgastos.app` para
  no romper builds ni datos. El **paquete** no se puede cambiar después de publicar.
- **Ícono:** se define en `app.json` (`icon`, `android.adaptiveIcon.*`) y los PNG viven en `assets/`.
  El ícono se incrusta en el build: al cambiarlo hay que **recompilar**.
- Subir `version`/`versionCode` en `app.json` en cada release (o dejar que `autoIncrement` lo haga
  en `production`).

---

## 15. Desarrollo asistido por IA

El proyecto se desarrolló con un **agente de programación de IA** como copiloto:

- **Herramienta:** [OpenCode](https://opencode.ai), un agente de código que opera sobre el
  repositorio.
- **Modelo:** modelo de lenguaje de gran escala (LLM) orientado a código. No tiene entrenamiento
  específico sobre este proyecto: razona sobre el código y la documentación en cada sesión.
- **Flujo:** *proponer → revisar → implementar → verificar*. Cada entrega se valida con
  `expo lint` y `expo export` antes de considerarse terminada.
- **Disciplina anti-alucinación:** antes de tocar APIs de Expo/EAS/React Native, se consulta la
  documentación **versionada** del SDK (`https://docs.expo.dev/versions/v57.0.0/`), porque las APIs
  cambian en cada release y la memoria del modelo puede estar desactualizada.
- **Bitácora:** las decisiones se registran en la carpeta `agentes/` del espacio de trabajo (fuera
  del repositorio de la app).

Las decisiones de producto, el diseño del método de presupuesto y la dirección general son humanas;
la IA acelera la implementación y verificación.

---

## 16. Cómo extender el proyecto

### Añadir un dato persistente

1. Añade la clave `STORAGE_*` en `constants.js`.
2. Crea el `useState` y su `useEffect` de persistencia en `store.jsx` (con guarda `cargado`).
3. Súmalo a `obtenerRespaldo()` y a `aplicarRespaldo()` para que viaje en el respaldo.
4. Exponlo en el objeto `valor` del contexto.

### Añadir una pantalla/pestaña

1. Crea el componente en `src/screens/`.
2. Regístralo en el `TabView` de `src/app/index.jsx` (título + icono).
3. Si necesitas saltar a ella por código, mapea su índice en el store (`pagina`).

### Añadir una llamada nativa nueva

1. `npx expo install <paquete>`.
2. Impórtalo de forma dinámica si puede no existir en Expo Go.
3. Añade el plugin/permiso en `app.json` si aplica.
4. Verifica con `npx expo-doctor` y un build de desarrollo.

---

## 17. Problemas conocidos

- **Error fantasma de ESLint (`import/namespace`):** usar `--no-cache` o limpiar `.expo/cache`.
- **`ERESOLVE` al instalar:** usar `npx expo install` (no `npm install`); si persiste,
  `--legacy-peer-deps`.
- **Notificaciones en Expo Go:** no funcionan como notificación del sistema; probar en APK/build.
- **PDF/imágenes locales en iOS:** al imprimir HTML, iOS no resuelve `asset://` locales; usar SVG o
  base64 en línea.
- **Datos en `AsyncStorage`:** sobreviven a las actualizaciones, pero no hay sincronización entre
  dispositivos. Para migrar, usar respaldo JSON.

---

## 18. Hoja de ruta técnica

- Suite de tests (unitarios de `constants.js` y `store.jsx`; componentes con Testing Library).
- Reporte de exportación con **selector de mes**, resumen y gráfico.
- Migración opcional a TypeScript.
- CI (GitHub Actions) que corra `lint` + `expo export`.
- Fuera de alcance por ahora: backend/sincronización, multiusuario, widgets, multi-moneda.
