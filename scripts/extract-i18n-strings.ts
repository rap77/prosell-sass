#!/usr/bin/env npx tsx
/**
 * Extract Spanish strings from TSX files for i18n migration.
 * Outputs JSON ready for translation.
 *
 * Usage: npx tsx scripts/extract-i18n-strings.ts > strings.json
 *
 * ponytail: regex extraction, good enough for 80% of cases.
 * Manual review needed for dynamic strings.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const SRC_DIR = "apps/web/src";

// Spanish patterns (common words that indicate Spanish text)
const SPANISH_PATTERNS = [
  /["'`]([^"'`]*(?:ción|ñ|á|é|í|ó|ú|Á|É|Í|Ó|Ú)[^"'`]*)["'`]/g,
  /["'`](Guardar|Cancelar|Eliminar|Editar|Crear|Agregar|Buscar|Filtrar|Ver|Cerrar|Aceptar|Confirmar|Enviar|Cargar|Descargar|Subir|Actualizar|Configurar|Salir)["'`]/gi,
  /["'`](Catálogo|Publicaciones|Configuración|Inventario|Vendedor|Cliente|Producto|Vehículo|Precio|Descripción|Título|Nombre|Correo|Teléfono|Dirección|Ciudad|País|Estado)["'`]/gi,
  /["'`](Pendiente|Publicado|Publicando|Activo|Inactivo|Borrador|Error|Éxito|Cargando|Procesando)["'`]/gi,
  /["'`](mínimo|máximo|requerido|válido|inválido|caracteres|campo|obligatorio)["'`]/gi,
];

interface ExtractedString {
  file: string;
  line: number;
  original: string;
  key: string; // suggested i18n key
}

function walkDir(dir: string, files: string[] = []): string[] {
  for (const file of readdirSync(dir)) {
    const path = join(dir, file);
    if (statSync(path).isDirectory()) {
      if (!file.includes("node_modules") && !file.includes(".next")) {
        walkDir(path, files);
      }
    } else if (file.endsWith(".tsx") && !file.includes(".test.")) {
      files.push(path);
    }
  }
  return files;
}

function extractStrings(filePath: string): ExtractedString[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const results: ExtractedString[] = [];
  const seen = new Set<string>();

  lines.forEach((line, idx) => {
    for (const pattern of SPANISH_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(line)) !== null) {
        const str = match[1];
        if (str && str.length > 2 && !seen.has(str)) {
          seen.add(str);
          results.push({
            file: filePath.replace(SRC_DIR + "/", ""),
            line: idx + 1,
            original: str,
            key: toKey(str),
          });
        }
      }
    }
  });

  return results;
}

function toKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

// Main
const files = walkDir(SRC_DIR);
const allStrings: ExtractedString[] = [];

for (const file of files) {
  allStrings.push(...extractStrings(file));
}

// Group by suggested namespace (based on file path)
const grouped: Record<string, Record<string, string>> = {
  common: {},
  landing: {},
  forms: {},
  catalog: {},
  auth: {},
  admin: {},
  settings: {},
};

for (const s of allStrings) {
  let ns = "common";
  if (s.file.includes("landing")) ns = "landing";
  else if (s.file.includes("form") || s.file.includes("Form")) ns = "forms";
  else if (s.file.includes("catalog")) ns = "catalog";
  else if (s.file.includes("auth")) ns = "auth";
  else if (s.file.includes("admin")) ns = "admin";
  else if (s.file.includes("settings")) ns = "settings";

  grouped[ns][s.key] = s.original;
}

console.log(JSON.stringify(grouped, null, 2));

// Also output stats
console.error(`\n--- Stats ---`);
console.error(`Files scanned: ${files.length}`);
console.error(`Strings found: ${allStrings.length}`);
console.error(`By namespace:`);
for (const [ns, strings] of Object.entries(grouped)) {
  console.error(`  ${ns}: ${Object.keys(strings).length}`);
}
