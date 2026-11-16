// Fonctions GLSL partagées (bruit, hash, tissage carbone).

export const GLSL_NOISE = /* glsl */ `
float gtHash13(vec3 p3) {
  p3 = fract(p3 * .1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 gtHash33(vec3 p3) {
  p3 = fract(p3 * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}
float gtNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gtHash13(i + vec3(0,0,0)), gtHash13(i + vec3(1,0,0)), f.x),
                 mix(gtHash13(i + vec3(0,1,0)), gtHash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(gtHash13(i + vec3(0,0,1)), gtHash13(i + vec3(1,0,1)), f.x),
                 mix(gtHash13(i + vec3(0,1,1)), gtHash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`

/**
 * Sergé 2x2 (twill) — l'armure du carbone apparent automobile.
 * Retourne : x = luminance du brin, y = orientation (0 chaîne / 1 trame), z = coordonnée transverse (−1..1)
 */
export const GLSL_CARBON = /* glsl */ `
vec3 gtTwill(vec2 uv) {
  vec2 cell = floor(uv);
  vec2 f = fract(uv);
  float k = mod(cell.x + cell.y, 4.0);
  float warp = step(k, 1.5);           // 2 cellules chaîne, 2 cellules trame
  float across = warp > 0.5 ? f.x : f.y; // section du toron
  float along  = warp > 0.5 ? f.y : f.x;
  float tube = sin(across * 3.14159);    // profil cylindrique du toron
  float ends = smoothstep(0.0, 0.12, along) * smoothstep(1.0, 0.88, along);
  float lum = tube * mix(0.55, 1.0, ends);
  return vec3(lum, warp, across * 2.0 - 1.0);
}
`
