import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

const shadowHost = document.querySelector("class-study-element");
const shadowRoot = shadowHost.shadowRoot;
var container = shadowRoot.getElementById("container");

// Scene, Camera, Renderer
const renderer = new THREE.WebGLRenderer({
  // canvas,
  antialias: true,
});
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1500);
const cameraAutoRotation = true;
const orbitControls = new OrbitControls(camera, renderer.domElement);

// Lights
const light = new THREE.SpotLight(0xffffff, 1, 100);
light.position.set(-5, 5, 10);

// Texture Loader
const textureLoader = new THREE.TextureLoader();

// Planet Proto
let planetProto = {
  sphere: function (size) {
    let sphere = new THREE.SphereGeometry(size, 32, 32);

    return sphere;
  },
  material: function (options) {
    let material = new THREE.MeshPhongMaterial();
    if (options) {
      for (var property in options) {
        material[property] = options[property];
      }
    }

    return material;
  },
  glowMaterial: function (intensity, fade, color) {
    let glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: {
          type: "f",
          value: intensity,
        },
        p: {
          type: "f",
          value: fade,
        },
        glowColor: {
          type: "c",
          value: new THREE.Color(color),
        },
        viewVector: {
          type: "v3",
          value: camera.position,
        },
      },
      vertexShader: `
              uniform vec3 viewVector;
              uniform float c;
              uniform float p;
              varying float intensity;
              void main() {
                vec3 vNormal = normalize( normalMatrix * normal );
                vec3 vNormel = normalize( normalMatrix * viewVector );
                intensity = pow( c - dot(vNormal, vNormel), p );
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
              }
            `,
      fragmentShader: `
              uniform vec3 glowColor;
              varying float intensity;
              void main() {
                vec3 glow = glowColor * intensity;
                gl_FragColor = vec4( glow, 1.0 );
              }
            `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });

    return glowMaterial;
  },
  texture: function (material, property, uri) {
    let textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = true;
    textureLoader.load(uri, function (texture) {
      material[property] = texture;
      material.needsUpdate = true;
    });
  },
};

let createPlanet = function (options) {
  // Create the planet's Surface
  let surfaceGeometry = planetProto.sphere(options.surface.size);
  let surfaceMaterial = planetProto.material(options.surface.material);
  let surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);

  // Create the planet's Atmosphere
  let atmosphereGeometry = planetProto.sphere(options.surface.size + options.atmosphere.size);
  let atmosphereMaterialDefaults = {
    side: THREE.DoubleSide,
    transparent: true,
  };
  let atmosphereMaterialOptions = Object.assign(atmosphereMaterialDefaults, options.atmosphere.material);
  let atmosphereMaterial = planetProto.material(atmosphereMaterialOptions);
  let atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);

  // Create the planet's Atmospheric glow
  let atmosphericGlowGeometry = planetProto.sphere(options.surface.size + options.atmosphere.size + options.atmosphere.glow.size);
  let atmosphericGlowMaterial = planetProto.glowMaterial(options.atmosphere.glow.intensity, options.atmosphere.glow.fade, options.atmosphere.glow.color);
  let atmosphericGlow = new THREE.Mesh(atmosphericGlowGeometry, atmosphericGlowMaterial);

  // Nest the planet's Surface and Atmosphere into a planet object
  let planet = new THREE.Object3D();
  surface.name = "surface";
  atmosphere.name = "atmosphere";
  atmosphericGlow.name = "atmosphericGlow";
  planet.add(surface);
  planet.add(atmosphere);
  planet.add(atmosphericGlow);

  // Load the Surface's textures
  for (let textureProperty in options.surface.textures) {
    planetProto.texture(surfaceMaterial, textureProperty, options.surface.textures[textureProperty]);
  }

  // Load the Atmosphere's texture
  for (let textureProperty in options.atmosphere.textures) {
    planetProto.texture(atmosphereMaterial, textureProperty, options.atmosphere.textures[textureProperty]);
  }

  return planet;
};

let earth = createPlanet({
  surface: {
    size: 0.5,
    material: {
      bumpScale: 0.05,
      specular: new THREE.Color("grey"),
      shininess: 10,
    },
    textures: {
      map: "map/1_earth_8k.jpg",
      bumpMap: "map/2_earth_8k.jpg",
      specularMap: "map/3_earth_8k.jpg",
    },
  },
  atmosphere: {
    size: 0.003,
    material: {
      opacity: 0.8,
    },
    textures: {
      map: "assets/earthcloudmap.jpg",
      alphaMap: "assets/earthcloudmaptrans.jpg",
    },
    glow: {
      size: 0.02,
      intensity: 0.7,
      fade: 7,
      color: 0x93cfef,
    },
  },
});

// Galaxy
let galaxyGeometry = new THREE.SphereGeometry(100, 32, 32);
let galaxyMaterial = new THREE.MeshBasicMaterial({
  side: THREE.BackSide,
});
let galaxy = new THREE.Mesh(galaxyGeometry, galaxyMaterial);

// Load Galaxy Textures
textureLoader.crossOrigin = true;
textureLoader.load("assets/starfield.png", function (texture) {
  galaxyMaterial.map = texture;
  scene.add(galaxy);
});

// Scene, Camera, Renderer Configuration
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

camera.position.set(1, 1, 1);
orbitControls.enabled = !cameraAutoRotation;

scene.add(camera);
camera.add(light);
scene.add(earth);

// Mesh Configurations
earth.receiveShadow = true;
earth.castShadow = true;
earth.getObjectByName("surface").geometry.center();

// On window resize, adjust camera aspect ratio and renderer size
window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.minPolarAngle = Math.PI * 0.5;
controls.maxPolarAngle = Math.PI * 0.5;
controls.minDistance = 0;
controls.maxDistance = 10;

// Main render function
let render = function () {
  earth.getObjectByName("surface").rotation.y += (1 / 16) * 0.01;
  earth.getObjectByName("atmosphere").rotation.y += (1 / 8) * 0.01;
  requestAnimationFrame(render);
  renderer.render(scene, camera);
  controls.update();
};

render();

var button = shadowRoot.querySelector("button");
button.addEventListener("click", function () {
  camera.position.set(1, 1, 1);
});
