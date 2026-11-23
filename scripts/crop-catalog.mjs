// Herramienta de una sola vez: recorta las fotos del catálogo PDF (páginas exportadas como imagen).
// Coordenadas en una página de referencia de 827 px de ancho.
// Uso: node scripts/crop-catalog.mjs <carpeta-con-p-000.png...> <carpeta-salida>
import sharp from "sharp";
import path from "node:path";

const [src, out] = process.argv.slice(2);
const C = {
  "mila-1": [2, 110, 255, 410, 620], "mila-2": [2, 550, 400, 827, 1170],
  "essential-cafe": [3, 555, 474, 815, 690],
  "totebag-grande-1": [4, 75, 255, 720, 820],
  "totebag-mini-1": [5, 95, 245, 745, 866],
  "siena-1": [6, 18, 175, 425, 745], "siena-2": [6, 462, 525, 827, 1060],
  "victoria-cafe": [7, 55, 150, 335, 445], "victoria-nude": [7, 95, 370, 390, 680], "victoria-negro": [7, 100, 630, 395, 935], "victoria-2": [7, 360, 800, 827, 1170],
  "premium-blanco": [8, 55, 130, 445, 565], "premium-negro": [8, 55, 570, 445, 1035],
  "premium-ii-blanco": [9, 55, 135, 445, 560], "premium-ii-2": [9, 55, 570, 445, 1025],
  "aura-negro": [10, 50, 140, 455, 555], "aura-2": [10, 50, 640, 455, 1035],
  "nova-negro": [11, 200, 150, 700, 715],
  "roma-1": [12, 200, 185, 695, 720],
  "neceser-cafe": [13, 0, 15, 385, 385], "neceser-rosado": [13, 0, 380, 385, 745], "neceser-azul": [13, 0, 755, 385, 1160],
  "italy-vino": [14, 165, 215, 665, 885],
  "ejecutiva-negro": [15, 195, 225, 675, 856],
  "toalla-blanco": [16, 165, 195, 705, 705],
  "baul-vino": [17, 18, 222, 282, 488], "baul-negro": [17, 285, 222, 549, 488], "baul-3": [17, 551, 222, 815, 488],
  "baul-4": [17, 18, 490, 282, 756], "baul-rojo": [17, 285, 490, 549, 756], "baul-6": [17, 551, 490, 815, 756],
  "tote-neceser-1": [18, 45, 160, 445, 565], "tote-neceser-2": [18, 0, 735, 445, 1065],
  "combo-blanco": [19, 15, 210, 280, 476], "combo-cafe": [19, 282, 210, 546, 476], "combo-durazno": [19, 548, 210, 812, 476],
  "combo-terracota": [19, 15, 488, 280, 754], "combo-dorado": [19, 282, 488, 546, 754], "combo-negro": [19, 548, 488, 812, 754],
  "tarjetero-dorado": [20, 15, 208, 280, 474], "tarjetero-rosado": [20, 284, 208, 548, 474], "tarjetero-blanco": [20, 550, 208, 815, 474],
  "tarjetero-turquesa": [20, 15, 488, 280, 754], "tarjetero-vino": [20, 284, 488, 548, 754], "tarjetero-negro": [20, 550, 488, 815, 754],
  "tarjetero-perla": [20, 15, 787, 282, 1053], "tarjetero-cafe": [20, 548, 787, 815, 1057],
};
for (const [name, [page, x0, y0, x1, y1]] of Object.entries(C)) {
  const file = path.join(src, `p-${String(page - 1).padStart(3, "0")}.png`);
  const meta = await sharp(file).metadata();
  const r = meta.width / 827;
  const left = Math.round(x0 * r), top = Math.round(y0 * r);
  const width = Math.min(Math.round((x1 - x0) * r), meta.width - left);
  const height = Math.min(Math.round((y1 - y0) * r), meta.height - top);
  await sharp(file).extract({ left, top, width, height }).webp({ quality: 88 }).toFile(path.join(out, `${name}.webp`));
}
console.log(`✔ ${Object.keys(C).length} recortes`);
