import {
  Fn,
  float,
  vec2,
  vec3,
  mul,
  sub,
  add,
  uv as tslUv,
  texture as tslTexture,
  sin as tslSin,
  length as tslLength,
  exp as tslExp,
  abs as tslAbs,
  positionLocal,
} from "three/tsl";

/* =========================================================================
   GLSL Shaders: Water Droplet Radial Ripple Wave (Vertex & Fragment)
   ========================================================================= */

export const vertexShader = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying float vWaveEnvelope;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Transition factor: 0.0 at rest (card or fullscreen), 1.0 at peak expansion
    float transitionFactor = sin(uProgress * 3.14159265);

    // Distance from center of the mesh (origin of water droplet)
    float dist = length(pos.xy);

    // Water droplet wave propagation outward as uProgress expands
    float waveSpeed = 16.0;
    float waveFreq = 22.0;
    float waveSpread = uProgress * waveSpeed;
    float wave = sin(dist * waveFreq - waveSpread - uTime * 3.0);

    // Radial wave envelope centered around the expanding wavefront
    float waveFront = abs(dist - uProgress * 2.2);
    float envelope = exp(-waveFront * 3.5) * transitionFactor;
    vWaveEnvelope = envelope;

    // 3D physical water droplet displacement along Z axis
    pos.z += wave * envelope * 0.42;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uProgress;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uTextureResolution;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying float vWaveEnvelope;

  // Preserve video aspect ratio (cover mode)
  vec2 getCoverUv(vec2 uvCoord, vec2 resolution, vec2 texRes) {
    float screenAspect = resolution.x / resolution.y;
    float texAspect = texRes.x / texRes.y;
    vec2 st = uvCoord;
    if (screenAspect > texAspect) {
      float scale = screenAspect / texAspect;
      st.y = (st.y - 0.5) / scale + 0.5;
    } else {
      float scale = texAspect / screenAspect;
      st.x = (st.x - 0.5) / scale + 0.5;
    }
    return st;
  }

  void main() {
    vec2 uv = getCoverUv(vUv, uResolution, uTextureResolution);

    float transitionFactor = sin(uProgress * 3.14159265);

    // Radial direction vector from center (0.5, 0.5)
    vec2 center = vec2(0.5, 0.5);
    vec2 dir = uv - center;
    float dist = length(dir);
    vec2 normDir = dist > 0.001 ? normalize(dir) : vec2(0.0);

    // Water droplet concentric circular ripple wave
    float waveSpeed = 16.0;
    float waveFreq = 24.0;
    float waveSpread = uProgress * waveSpeed;
    float wave = sin(dist * waveFreq - waveSpread - uTime * 3.0);

    // Wave envelope concentrated around the expanding wavefront
    float waveFront = abs(dist - uProgress * 1.6);
    float envelope = exp(-waveFront * 4.5) * transitionFactor;

    // Water refraction displacement along radial direction
    float displacement = wave * envelope * 0.045;
    vec2 distortedUv = uv - normDir * displacement;

    // Chromatic aberration (RGB dispersion along water wave gradient)
    float dispersion = envelope * 0.016;
    float r = texture2D(uTexture, distortedUv + normDir * dispersion).r;
    float g = texture2D(uTexture, distortedUv).g;
    float b = texture2D(uTexture, distortedUv - normDir * dispersion).b;

    // Subtle water surface specular glint on the wave crest
    float glint = max(0.0, wave) * envelope * 0.12;

    vec3 color = vec3(r, g, b) + vec3(glint);

    gl_FragColor = vec4(color, 1.0);
  }
`;

/* =========================================================================
   Three.js Shading Language (TSL) Nodes
   ========================================================================= */

export const createWaterDropTSL = (uProgress: any, uTime: any) => {
  // TSL Vertex Position Node: 3D Water Droplet Ripple
  const waterPositionNode = Fn(() => {
    const pos = positionLocal as any;
    const transitionFactor = tslSin(mul(uProgress, Math.PI));
    const dist = tslLength(pos.xy);

    const waveSpeed = float(16.0);
    const waveFreq = float(22.0);
    const waveSpread = mul(uProgress, waveSpeed);
    const wave = tslSin(sub(sub(mul(dist, waveFreq), waveSpread), mul(uTime, 3.0)));

    const waveFront = tslAbs(sub(dist, mul(uProgress, 2.2)));
    const envelope = mul(tslExp(mul(waveFront, -3.5)), transitionFactor);

    const rippleZ = mul(mul(wave, envelope), float(0.42));
    return vec3(pos.x, pos.y, add(pos.z, rippleZ));
  });

  // TSL Fragment Color Node: Water Refraction & Chromatic Dispersion
  const waterColorNode = Fn(({ textureNode }: { textureNode: any }) => {
    const uvCoord = tslUv() as any;
    const transitionFactor = tslSin(mul(uProgress, Math.PI));
    const center = vec2(0.5, 0.5);
    const dir = sub(uvCoord, center);
    const dist = tslLength(dir);

    const waveSpeed = float(16.0);
    const waveFreq = float(24.0);
    const waveSpread = mul(uProgress, waveSpeed);
    const wave = tslSin(sub(sub(mul(dist, waveFreq), waveSpread), mul(uTime, 3.0)));

    const waveFront = tslAbs(sub(dist, mul(uProgress, 1.6)));
    const envelope = mul(tslExp(mul(waveFront, -4.5)), transitionFactor);

    const displacement = mul(mul(wave, envelope), float(0.045));
    const distortedUv = sub(uvCoord, mul(dir, displacement));

    return tslTexture(textureNode, distortedUv);
  });

  return { waterPositionNode, waterColorNode };
};
