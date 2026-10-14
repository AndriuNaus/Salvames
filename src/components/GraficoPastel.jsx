import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { Circle, G, Path, Svg } from 'react-native-svg';
import { CATEGORIAS, formatoMoneda } from '../constants';

const TAM_GRAFICO = 210;
const RADIO_EXT = 95;
const RADIO_INT = 62;
const CENTRO = TAM_GRAFICO / 2;

const polar = (cx, cy, radio, anguloDeg) => {
  const rad = ((anguloDeg - 90) * Math.PI) / 180;
  return { x: cx + radio * Math.cos(rad), y: cy + radio * Math.sin(rad) };
};

const rutaSegmento = (inicio, fin) => {
  const o1 = polar(CENTRO, CENTRO, RADIO_EXT, inicio);
  const o2 = polar(CENTRO, CENTRO, RADIO_EXT, fin);
  const i2 = polar(CENTRO, CENTRO, RADIO_INT, fin);
  const i1 = polar(CENTRO, CENTRO, RADIO_INT, inicio);
  const arcoGrande = fin - inicio > 180 ? 1 : 0;
  return (
    `M ${o1.x} ${o1.y} ` +
    `A ${RADIO_EXT} ${RADIO_EXT} 0 ${arcoGrande} 1 ${o2.x} ${o2.y} ` +
    `L ${i2.x} ${i2.y} ` +
    `A ${RADIO_INT} ${RADIO_INT} 0 ${arcoGrande} 0 ${i1.x} ${i1.y} Z`
  );
};

export default function GraficoPastel({ datos, total, seleccionado, onSeleccionar, estilos }) {
  const conValor = datos.filter((d) => d.valor > 0);
  // Firma de los datos: la animación se repite al entrar y cuando cambian los valores.
  const firma = `${total}|` + conValor.map((d) => `${d.cat}:${Math.round(d.valor * 100)}`).join(',');

  // Progreso de la animación de entrada (0 -> 1). Cada segmento crece con barrido animado.
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value }) => setProgreso(value));
    const tarea = Animated.timing(anim, {
      toValue: 1,
      // Bastante más lento y a velocidad pareja para que se VEA formarse y
      // colorearse el círculo (antes con 900 ms aparecía casi de golpe).
      duration: 1600,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    });
    tarea.start();
    return () => {
      anim.removeListener(id);
      tarea.stop();
    };
  }, [firma]);

  const centro = (monto, etiqueta) => (
    <View style={[estilos.centroGrafico, { opacity: progreso }]} pointerEvents="none">
      <Text style={estilos.centroMonto}>{formatoMoneda(monto)}</Text>
      <Text style={estilos.centroEtiqueta}>{etiqueta}</Text>
    </View>
  );

  if (total <= 0 || conValor.length === 0) {
    return (
      <View style={estilos.graficoVacio}>
        <Svg width={TAM_GRAFICO} height={TAM_GRAFICO}>
          <Circle
            cx={CENTRO}
            cy={CENTRO}
            r={(RADIO_EXT + RADIO_INT) / 2}
            stroke={estilos.colorGraficoVacio}
            strokeWidth={RADIO_EXT - RADIO_INT}
            fill="none"
          />
        </Svg>
        <View style={estilos.centroGrafico} pointerEvents="none">
          <Text style={estilos.centroMonto}>{formatoMoneda(0)}</Text>
          <Text style={estilos.centroEtiqueta}>Sin gastos aún</Text>
        </View>
      </View>
    );
  }

  // Un solo segmento: dona completa con Circle para evitar arcos degenerados.
  // Se traza con un barrido (strokeDashoffset) desde arriba y en sentido horario.
  if (conValor.length === 1) {
    const unico = conValor[0];
    const info = CATEGORIAS[unico.cat];
    const radioMedio = (RADIO_EXT + RADIO_INT) / 2;
    const circunferencia = 2 * Math.PI * radioMedio;
    return (
      <View>
        <Svg width={TAM_GRAFICO} height={TAM_GRAFICO}>
          <Circle
            cx={CENTRO}
            cy={CENTRO}
            r={radioMedio}
            stroke={info.color}
            strokeWidth={RADIO_EXT - RADIO_INT}
            fill="none"
            strokeDasharray={[circunferencia]}
            strokeDashoffset={circunferencia * (1 - progreso)}
            transform={`rotate(-90 ${CENTRO} ${CENTRO})`}
            onPress={() => onSeleccionar(seleccionado === unico.cat ? null : unico.cat)}
          />
        </Svg>
        {centro(total, `${info.etiqueta} · 100%`)}
      </View>
    );
  }

  // Barrido global: la dona se traza en sentido horario desde arriba, un segmento
  // detrás de otro. Antes todos crecían a la vez desde su propio ángulo y el
  // resultado se veía sucio.
  const anguloGlobal = 360 * progreso;
  const segmentos = conValor.map((d, i) => {
    const anguloPrevio = conValor
      .slice(0, i)
      .reduce((suma, x) => suma + (x.valor / total) * 360, 0);
    const barrido = (d.valor / total) * 360;
    const visible = Math.max(0, Math.min(barrido, anguloGlobal - anguloPrevio));
    // Pequeña separación visual entre segmentos.
    return { ...d, inicio: anguloPrevio + 1, fin: anguloPrevio + visible - 1 };
  });

  const selInfo = seleccionado ? CATEGORIAS[seleccionado] : null;
  const selValor = seleccionado
    ? conValor.find((d) => d.cat === seleccionado)?.valor ?? 0
    : 0;

  return (
    <View>
      <Svg width={TAM_GRAFICO} height={TAM_GRAFICO}>
        <G>
          {segmentos.map((s) => {
            // Aún no visible en los primeros cuadros de la animación.
            if (s.fin <= s.inicio + 0.5) return null;
            const info = CATEGORIAS[s.cat];
            const atenuado = seleccionado && seleccionado !== s.cat;
            return (
              <Path
                key={s.cat}
                d={rutaSegmento(s.inicio, s.fin)}
                fill={info.color}
                opacity={atenuado ? 0.3 : 1}
                stroke={seleccionado === s.cat ? estilos.colorBordeSeleccion : '#FFFFFF'}
                strokeWidth={seleccionado === s.cat ? 2.5 : 2}
                onPress={() => onSeleccionar(seleccionado === s.cat ? null : s.cat)}
              />
            );
          })}
        </G>
      </Svg>
      {centro(
        total,
        selInfo
          ? `${selInfo.etiqueta} · ${Math.round((selValor / total) * 100)}%`
          : 'Total gastado'
      )}
    </View>
  );
}
