import { useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TabView } from 'react-native-tab-view';
import { useFinanzas } from '../store';
import GastosScreen from '../screens/GastosScreen';
import AgregarScreen from '../screens/AgregarScreen';
import IngresosScreen from '../screens/IngresosScreen';
import ResumenScreen from '../screens/ResumenScreen';

function BotonTema() {
  const { tema, alternarTema, paleta } = useFinanzas();
  return (
    <TouchableOpacity
      onPress={alternarTema}
      activeOpacity={0.7}
      style={[estilosBase.botonTema, { backgroundColor: paleta.primarioSuave }]}
    >
      <Text style={[estilosBase.textoBotonTema, { color: paleta.primario }]}>
        {tema === 'claro' ? 'Oscuro' : 'Claro'}
      </Text>
    </TouchableOpacity>
  );
}

function BarraNavegacion({ navigationState, position, onSelect, paleta }) {
  const { width } = useWindowDimensions();
  const anchoBarra = width - 32;
  const anchoPildora = anchoBarra / navigationState.routes.length;
  const desplazar = position.interpolate({
    inputRange: navigationState.routes.map((_, i) => i),
    outputRange: navigationState.routes.map((_, i) => i * anchoPildora),
  });
  return (
    <View style={[estilosBase.barra, { backgroundColor: paleta.tarjeta }]}>
      <Animated.View
        style={[
          estilosBase.pildora,
          {
            width: anchoPildora,
            backgroundColor: paleta.primarioSuave,
            transform: [{ translateX: desplazar }],
          },
        ]}
      />
      {navigationState.routes.map((ruta, i) => {
        const activa = navigationState.index === i;
        return (
          <TouchableOpacity
            key={ruta.key}
            style={estilosBase.opcion}
            onPress={() => onSelect(i)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                estilosBase.textoOpcion,
                { color: activa ? paleta.primario : paleta.textoSec },
                activa && estilosBase.textoOpcionActiva,
              ]}
            >
              {ruta.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Paginas() {
  const { paleta, pagina, setPagina } = useFinanzas();
  const diseno = useWindowDimensions();
  const [rutas] = useState([
    { key: 'gastos', title: 'Gastos' },
    { key: 'agregar', title: 'Agregar' },
    { key: 'ingresos', title: 'Ingresos' },
    { key: 'resumen', title: 'Resumen' },
  ]);

  const renderEscena = ({ route }) => {
    switch (route.key) {
      case 'agregar':
        return <AgregarScreen />;
      case 'ingresos':
        return <IngresosScreen />;
      case 'resumen':
        return <ResumenScreen />;
      default:
        return <GastosScreen />;
    }
  };

  return (
    <SafeAreaView
      style={[estilosBase.contenedor, { backgroundColor: paleta.fondo }]}
      edges={['top', 'bottom']}
    >
      <StatusBar style={paleta.barra} />
      <View style={estilosBase.encabezado}>
        <Text style={[estilosBase.nombreApp, { color: paleta.texto }]}>Salva el Mes</Text>
        <BotonTema />
      </View>
      <TabView
        navigationState={{ index: pagina, routes: rutas }}
        renderScene={renderEscena}
        onIndexChange={setPagina}
        initialLayout={{ width: diseno.width }}
        swipeEnabled
        animationEnabled
        renderTabBar={(props) => (
          <BarraNavegacion {...props} onSelect={setPagina} paleta={paleta} />
        )}
      />
    </SafeAreaView>
  );
}

export default function Indice() {
  return <Paginas />;
}

const estilosBase = StyleSheet.create({
  contenedor: { flex: 1 },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  nombreApp: { fontSize: 20, fontWeight: '800' },
  botonTema: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  textoBotonTema: { fontWeight: '700', fontSize: 13 },
  barra: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 18,
    padding: 4,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pildora: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 14 },
  opcion: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  textoOpcion: { fontSize: 13, fontWeight: '600' },
  textoOpcionActiva: { fontWeight: '800' },
});
