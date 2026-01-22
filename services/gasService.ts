
import { Socio, Envase, AppStatus } from '../types';

// El ID proporcionado por el usuario parece ser un Script ID (AKfyc...)
// Lo usaremos para el registro y mantendremos la capacidad de lectura de la hoja.
const SCRIPT_ID = 'AKfycbwhqcPFwqbdk0qVsONs-vntxqSyDZ2VqYIW-rZL5Ws8B-RnLar4icTNfcA5fp0Yt2XF';
const SPREADSHEET_ID = '1dBicB5b8YgI6kQPxwHnA3r5plBhPvYD09wJoi6KW194'; // ID base para gviz

const fetchSheetWithFallback = async (names: string[], range: string) => {
  for (const name of names) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx:out:json&sheet=${encodeURIComponent(name)}&range=${range}`;
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonStr);
        if (data.table && data.table.rows) {
          return data;
        }
      }
    } catch (e) {
      console.warn(`Error en hoja "${name}":`, e);
    }
  }
  return { table: { rows: [] } };
};

const getCellValue = (row: any, index: number): string => {
  if (!row || !row.c || !row.c[index]) return '';
  const cell = row.c[index];
  const val = cell.v !== null && cell.v !== undefined ? cell.v : (cell.f || '');
  return String(val).trim();
};

export const gasService = {
  async getAppStatus(): Promise<AppStatus> {
    try {
      const json = await fetchSheetWithFallback(['Hoja 4', 'Config'], 'A1:B2');
      const rows = json.table.rows;
      if (!rows.length) return AppStatus.ABIERTO;
      const statusRow = rows.find((r: any) => getCellValue(r, 0).toUpperCase() === 'ESTADO');
      const value = getCellValue(statusRow, 1).toUpperCase();
      return value === 'CERRADO' ? AppStatus.CERRADO : AppStatus.ABIERTO;
    } catch (e) {
      return AppStatus.ABIERTO;
    }
  },

  async getSocios(): Promise<Socio[]> {
    try {
      const json = await fetchSheetWithFallback(['Hoja 3', 'Socios'], 'A3:F');
      return json.table.rows.map((r: any) => ({
        codigo: getCellValue(r, 0),
        nombre: getCellValue(r, 1),
        movil: getCellValue(r, 2),
        direccion: getCellValue(r, 3),
        poblacion: getCellValue(r, 4),
        provincia: getCellValue(r, 5)
      })).filter((s: Socio) => s.codigo !== '');
    } catch (e) {
      return [];
    }
  },

  async getInventario(): Promise<Envase[]> {
    try {
      // Leemos Hoja 1, columnas A a F (Código, Nombre, Familia, Características, Almacén, Imagen)
      const json = await fetchSheetWithFallback(['Hoja 1', 'Inventario'], 'A3:F');
      return json.table.rows.map((r: any) => {
        const rawAlmacen = getCellValue(r, 4);
        const fam = getCellValue(r, 2);
        return {
          codigo: getCellValue(r, 0),
          nombre: getCellValue(r, 1),
          familia: fam !== '' ? fam : 'GENERAL',
          caracteristicas: getCellValue(r, 3),
          almacen: rawAlmacen !== '' ? rawAlmacen.toUpperCase() : 'GENERAL',
          imagen: getCellValue(r, 5)
        };
      }).filter((e: Envase) => e.codigo !== '' && e.nombre !== '');
    } catch (e) {
      console.error("Error al cargar Hoja 1:", e);
      return [];
    }
  },

  async registerReturn(rows: any[]) {
    const url = `https://script.google.com/macros/s/${SCRIPT_ID}/exec`;
    try {
      // Usamos mode: 'no-cors' para evitar problemas de CORS con Google Apps Script en solicitudes simples
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          data: rows
        })
      });
      return true;
    } catch (e) {
      console.error("Error en el registro del Script:", e);
      throw new Error("No se pudo conectar con el servidor de registro.");
    }
  }
};
