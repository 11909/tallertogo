// Los 10 colores de fábrica del Chevrolet Corvette Z06 2025 (nombre oficial y código de pintura GM).
// El hex es solo una aproximación para el circulito de muestra en pantalla.
export type ColorFabrica = { codigo: string; nombre: string; hex: string };

export const COLORES_Z06_2025: ColorFabrica[] = [
  { codigo: "G8G", nombre: "Arctic White", hex: "#F2F2EE" },
  { codigo: "GBA", nombre: "Black", hex: "#111214" },
  { codigo: "GBK", nombre: "Competition Yellow Tintcoat Metallic", hex: "#E8C21A" },
  { codigo: "GXL", nombre: "Hysteria Purple Metallic", hex: "#3B2A5C" },
  { codigo: "GMO", nombre: "Rapid Blue", hex: "#1E5FB8" },
  { codigo: "GPH", nombre: "Red Mist Metallic Tintcoat", hex: "#7A1F2B" },
  { codigo: "GJV", nombre: "Riptide Blue Metallic", hex: "#2E6F8E" },
  { codigo: "GXA", nombre: "Sea Wolf Gray Tricoat", hex: "#5E6266" },
  { codigo: "G26", nombre: "Sebring Orange Tintcoat", hex: "#D4531B" },
  { codigo: "GKZ", nombre: "Torch Red", hex: "#C8102E" },
];

export function buscarColor(codigo: string) {
  return COLORES_Z06_2025.find((c) => c.codigo === codigo);
}
