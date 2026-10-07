import {
  Fn,
  float,
  vec2,
  vec3,
  vec4,
  add,
  sub,
  mul,
  div,
  sin,
  abs,
  exp,
  length,
  normalize,
  max,
  select,
  greaterThan,
  uv as tslUv,
  texture as tslTexture,
  positionLocal,
  PI,
} from "three/tsl";
import type { Node, TextureNode } from "three/webgpu";
import type * as THREE from "three/webgpu";

/**
 * In Three.js TSL, nodes use dynamic JavaScript Proxies for swizzling (.x, .y, .xy, .r, .g, .b, etc.).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TSLNode<T = unknown> = Node<T> & { [key: string]: any };

/* =========================================================================
   Three.js Shading Language (TSL) Water Droplet Ripple Shaders
   ========================================================================= */

/**
 * TSL Vertex Position Node:
 * Displaces mesh along the Z axis with expanding water ripple concentric waves.
 */
export const createWaterPositionNode = (
  uProgress: TSLNode<"float">,
  uTime: TSLNode<"float">
): Node<"vec3"> => {
  return Fn(() => {
    const pos = positionLocal as TSLNode<"vec3">;

    // Transition factor: 0.0 at rest (card or fullscreen), 1.0 at peak expansion
    const transitionFactor = sin(mul(uProgress, PI));

    // Distance from center of the mesh (origin of water droplet)
    const dist = length(pos.xy);

    // Water droplet wave propagation outward as uProgress expands
    const waveSpeed = float(16.0);
    const waveFreq = float(22.0);
    const waveSpread = mul(uProgress, waveSpeed);
    const wave = sin(sub(sub(mul(dist, waveFreq), waveSpread), mul(uTime, 3.0)));

    // Radial wave envelope centered around the expanding wavefront
    const waveFront = abs(sub(dist, mul(uProgress, 2.2)));
    const envelope = mul(exp(mul(waveFront, -3.5)), transitionFactor);

    // 3D physical water droplet displacement along Z axis
    const rippleZ = mul(mul(wave, envelope), float(0.42));

    return vec3(pos.x, pos.y, add(pos.z, rippleZ));
  })() as Node<"vec3">;
};

/**
 * TSL Color Node:
 * Applies aspect-ratio-corrected cover UV, concentric ripple refraction,
 * chromatic aberration (RGB dispersion), and water specular glint.
 */
export const createWaterColorNode = (
  uTexture: TextureNode | Node | THREE.Texture,
  uProgress: TSLNode<"float">,
  uTime: TSLNode<"float">,
  uResolution: TSLNode<"vec2">,
  uTextureResolution: TSLNode<"vec2">
): Node<"vec4"> => {
  return Fn(() => {
    const uvCoord = tslUv() as TSLNode<"vec2">;

    // Preserve video aspect ratio (cover mode)
    const screenAspect = div(uResolution.x, uResolution.y);
    const texAspect = div(uTextureResolution.x, uTextureResolution.y);

    const scaleY = div(screenAspect, texAspect);
    const scaleX = div(texAspect, screenAspect);

    const scaledY = add(div(sub(uvCoord.y, 0.5), scaleY), 0.5);
    const scaledX = add(div(sub(uvCoord.x, 0.5), scaleX), 0.5);

    const isWide = greaterThan(screenAspect, texAspect);
    const coverUv = select(
      isWide,
      vec2(uvCoord.x, scaledY),
      vec2(scaledX, uvCoord.y)
    ) as TSLNode<"vec2">;

    const transitionFactor = sin(mul(uProgress, PI));

    // Radial direction vector from center (0.5, 0.5)
    const center = vec2(0.5, 0.5);
    const dir = sub(coverUv, center) as TSLNode<"vec2">;
    const dist = length(dir);
    const normDir = select(
      greaterThan(dist, 0.001),
      normalize(dir),
      vec2(0.0, 0.0)
    ) as TSLNode<"vec2">;

    // Concentric circular ripple wave
    const waveSpeed = float(16.0);
    const waveFreq = float(24.0);
    const waveSpread = mul(uProgress, waveSpeed);
    const wave = sin(sub(sub(mul(dist, waveFreq), waveSpread), mul(uTime, 3.0)));

    // Wave envelope concentrated around the expanding wavefront
    const waveFront = abs(sub(dist, mul(uProgress, 1.6)));
    const envelope = mul(exp(mul(waveFront, -4.5)), transitionFactor);

    // Water refraction displacement along radial direction
    const displacement = mul(mul(wave, envelope), float(0.045));
    const distortedUv = sub(coverUv, mul(normDir, displacement)) as TSLNode<"vec2">;

    // Chromatic aberration (RGB dispersion along ripple gradient)
    const dispersion = mul(envelope, float(0.016));
    const uvR = add(distortedUv, mul(normDir, dispersion));
    const uvG = distortedUv;
    const uvB = sub(distortedUv, mul(normDir, dispersion));

    const r = (tslTexture(uTexture as THREE.Texture, uvR) as TSLNode).r;
    const g = (tslTexture(uTexture as THREE.Texture, uvG) as TSLNode).g;
    const b = (tslTexture(uTexture as THREE.Texture, uvB) as TSLNode).b;

    // Subtle water surface specular glint on the wave crest
    const glint = mul(mul(max(float(0.0), wave), envelope), float(0.12));
    const color = add(vec3(r, g, b), vec3(glint));

    return vec4(color, float(1.0));
  })() as Node<"vec4">;
};
