// Utilidades para exportar datos (CSV) y compartir archivos (JSON de respaldo).
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CATEGORIAS, etiquetaSubtipo } from './constants';

// Escapa un campo para CSV (comillas dobles si trae coma, comilla o salto).
const campoCsv = (valor) => {
  const texto = valor == null ? '' : String(valor);
  return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

const filaCsv = (columnas) => columnas.map(campoCsv).join(',');

// CSV de gastos. Lleva BOM para que Excel respete los acentos (UTF-8).
export const construirCsvGastos = (gastos) => {
  const filas = [filaCsv(['Fecha', 'Descripcion', 'Monto', 'Categoria', 'Tipo', 'Fijo'])];
  (gastos || []).forEach((g) => {
    filas.push(
      filaCsv([
        (g.fecha || '').slice(0, 10),
        g.descripcion || '',
        Number(g.monto) || 0,
        CATEGORIAS[g.categoria]?.etiqueta ?? g.categoria ?? '',
        etiquetaSubtipo(g),
        g.fijoId ? 'Si' : 'No',
      ])
    );
  });
  return '\uFEFF' + filas.join('\n');
};

// Escribe el texto en la caché y abre el menú para compartir.
// Devuelve false si el dispositivo no puede compartir archivos.
export const compartirTexto = async (
  nombreArchivo,
  contenido,
  { mimeType = 'text/plain', uti = 'public.plain-text' } = {}
) => {
  if (!(await Sharing.isAvailableAsync())) return false;
  const archivo = new File(Paths.cache, nombreArchivo);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(contenido);
  await Sharing.shareAsync(archivo.uri, {
    mimeType,
    UTI: uti,
    dialogTitle: 'Compartir datos',
  });
  return true;
};
