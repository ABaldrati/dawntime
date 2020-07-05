import "./styles.scss"
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {
    AmbientLight,
    AxesHelper,
    LinearFilter,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    PointLight,
    RGBFormat,
    Scene,
    SphereBufferGeometry,
    Vector2,
    WebGLRenderer,
    WebGLRenderTarget
} from "three";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";

import volumetricLightScatteringShader from './FragmentVolumetricScattering.glsl'
import passThroughVertexShader from "./PassThroughVertexShader.glsl"
import blendingFragmentShader from "./BlendingFragmentShader.glsl"
import passThroughFragmentShader from "./PassThroughFragmentShader.glsl"

const occlusionShader = {
    uniforms: {
        tDiffuse: {value: null},
        lightPosition: {value: new Vector2(0.5, 0.5)},
        exposure: {value: 0.05},
        decay: {value: 0.99},
        density: {value: 0.8},
        weight: {value: 0.8},
        samples: {value: 200}
    },

    vertexShader: passThroughVertexShader,
    fragmentShader: volumetricLightScatteringShader
}

const blendingShader = {
    uniforms: {
        tDiffuse: {value: null},
        tOcclusion: {value: null}
    },

    vertexShader: passThroughVertexShader,
    fragmentShader: blendingFragmentShader
}

const passThroughShader = {
    uniforms: {
        tDiffuse: {value: null},
        tOcclusion: {value: null}
    },

    vertexShader: passThroughVertexShader,
    fragmentShader: passThroughFragmentShader
}

const DEFAULT_LAYER = 0;
const OCCLUSION_LAYER = 1;

const axesHelper = new AxesHelper(10);
const loader = new GLTFLoader();
const scene = new Scene();
let camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);


const renderer = new WebGLRenderer();
let controls = new OrbitControls(camera, renderer.domElement);

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

loader.load('scene.gltf', skull => {
    skull.scene.traverse(o => {
        if (o instanceof Mesh) {
            let material = new MeshBasicMaterial({color: "#000000"});
            let occlusionObject = new Mesh(o.geometry, material)

            o.add(axesHelper);

            occlusionObject.add(new AxesHelper(10));
            occlusionObject.layers.set(OCCLUSION_LAYER)
            o.parent?.add(occlusionObject)
        }
    })

    scene.add(skull.scene);
    skull.scene.position.z = 2;
}, undefined, error => {
    console.error(error);
});

let ambientLight = new AmbientLight("#2c3e50");
scene.add(ambientLight);

let pointLight = new PointLight("#ffffff");
scene.add(pointLight);

let geometry = new SphereBufferGeometry(0.5, 32, 32);
let material = new MeshBasicMaterial({color: 0xffffff});
let lightSphere = new Mesh(geometry, material);
lightSphere.layers.set(OCCLUSION_LAYER)
scene.add(lightSphere);

camera.position.z = 6;
controls.update();

function composeEffects(): [EffectComposer, EffectComposer] {
    const renderTargetParameters = {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        format: RGBFormat,
        stencilBuffer: false
    };
    let occlusionRenderTarget = new WebGLRenderTarget(window.innerWidth / 2, window.innerHeight / 2, renderTargetParameters)

    let occlusionComposer = new EffectComposer(renderer, occlusionRenderTarget);
    occlusionComposer.addPass(new RenderPass(scene, camera));

    let scatteringPass = new ShaderPass(occlusionShader);
    occlusionComposer.addPass(scatteringPass);

    let dummyPass = new ShaderPass(passThroughShader);
    occlusionComposer.addPass(dummyPass);

    let sceneComposer = new EffectComposer(renderer);
    sceneComposer.addPass(new RenderPass(scene, camera));

    let blendingPass = new ShaderPass(blendingShader);
    blendingPass.uniforms.tOcclusion.value = occlusionRenderTarget.texture;
    blendingPass.renderToScreen = true;
    sceneComposer.addPass(blendingPass);

    return [occlusionComposer, sceneComposer]
}

function update() {}

let [occlusionComposer, sceneComposer] = composeEffects();

function render() {
    camera.layers.set(OCCLUSION_LAYER);
    occlusionComposer.render();

    camera.layers.set(DEFAULT_LAYER);
    renderer.setClearColor("#030509");
    sceneComposer.render();
}

function onFrame() {
    requestAnimationFrame(onFrame);
    controls.update();
    update();
    render();
}

onFrame();
