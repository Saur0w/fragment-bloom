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

export type TSLNode<T = unknown> = Node<T> & { [key: string]: any };

export const createWaterPositionNode = (
  uProgress: TSLNode<"float">,
  uTime: TSLNode<"float">
): Node<"vec3"> => {
  return Fn(() => {
    const pos = positionLocal as TSLNode<"vec3">;
    const transitionFactor = sin(mul(uProgress, PI));
    const dist = length(pos.xy);

    const waveSpeed = float(16.0);
    const waveFreq = float(22.0);
    const waveSpread = mul(uProgress, waveSpeed);
    const wave = sin(sub(sub(mul(dist, waveFreq), waveSpread), mul(uTime, 3.0)));
    const waveFront = abs(sub(dist, mul(uProgress, 2.2)));
    const envelope = mul(exp(mul(waveFront, -3.5)), transitionFactor);
    const rippleZ = mul(mul(wave, envelope), float(0.42));

    return vec3(pos.x, pos.y, add(pos.z, rippleZ));
  })() as Node<"vec3">;
};

export const createWaterColorNode = (
  uTexture: TextureNode | Node | THREE.Texture,
  uProgress: TSLNode<"float">,
  uTime: TSLNode<"float">,
  uResolution: TSLNode<"vec2">,
  uTextureResolution: TSLNode<"vec2">
): Node<"vec4"> => {
  return Fn(() => {
    const uvCoord = tslUv() as TSLNode<"vec2">;
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

    const center = vec2(0.5, 0.5);
    const dir = sub(coverUv, center) as TSLNode<"vec2">;
    const dist = length(dir);
    const normDir = select(
      greaterThan(dist, 0.001),
      normalize(dir),
      vec2(0.0, 0.0)
    ) as TSLNode<"vec2">;

    const waveSpeed = float(16.0);
    const waveFreq = float(24.0);
    const waveSpread = mul(uProgress, waveSpeed);
    const wave = sin(sub(sub(mul(dist, waveFreq), waveSpread), mul(uTime, 3.0)));
    const waveFront = abs(sub(dist, mul(uProgress, 1.6)));
    const envelope = mul(exp(mul(waveFront, -4.5)), transitionFactor);

    const displacement = mul(mul(wave, envelope), float(0.045));
    const distortedUv = sub(coverUv, mul(normDir, displacement)) as TSLNode<"vec2">;

    const dispersion = mul(envelope, float(0.016));
    const uvR = add(distortedUv, mul(normDir, dispersion));
    const uvG = distortedUv;
    const uvB = sub(distortedUv, mul(normDir, dispersion));

    const r = (tslTexture(uTexture as THREE.Texture, uvR) as TSLNode).r;
    const g = (tslTexture(uTexture as THREE.Texture, uvG) as TSLNode).g;
    const b = (tslTexture(uTexture as THREE.Texture, uvB) as TSLNode).b;

    const glint = mul(mul(max(float(0.0), wave), envelope), float(0.12));
    const color = add(vec3(r, g, b), vec3(glint));

    return vec4(color, float(1.0));
  })() as Node<"vec4">;
};
