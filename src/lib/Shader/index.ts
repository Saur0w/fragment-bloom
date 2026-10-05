export const vertexShader = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // 3D displacement ripple active only during fullscreen transition
    float ripple = sin(pos.x * 3.5 + uTime * 2.0) * cos(pos.y * 3.5 + uTime * 2.0);
    pos.z += ripple * 0.12 * sin(uProgress * 3.14159265);

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

  // Preserve video aspect ratio (cover mode)
  vec2 getCoverUv(vec2 uv, vec2 resolution, vec2 texRes) {
    float screenAspect = resolution.x / resolution.y;
    float texAspect = texRes.x / texRes.y;
    vec2 st = uv;
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

    // Distortion and chromatic aberration only during expansion transition
    float transitionFactor = sin(uProgress * 3.14159265);

    vec2 distortedUv = uv;
    distortedUv.x += sin(uv.y * 14.0 + uTime * 3.0) * 0.012 * transitionFactor;
    distortedUv.y += cos(uv.x * 14.0 + uTime * 3.0) * 0.012 * transitionFactor;

    // Pure video sampling with chromatic aberration during transition only
    float aberration = 0.012 * transitionFactor;
    float r = texture2D(uTexture, distortedUv + vec2(aberration, 0.0)).r;
    float g = texture2D(uTexture, distortedUv).g;
    float b = texture2D(uTexture, distortedUv - vec2(aberration, 0.0)).b;

    vec3 color = vec3(r, g, b);

    gl_FragColor = vec4(color, 1.0);
  }
`;
