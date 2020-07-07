import "./styles.scss"
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {
    AmbientLight,
    AxesHelper,
    Camera,
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

import skullFile from "../models/skull/scene.gltf";
import {CopyShader} from "three/examples/jsm/shaders/CopyShader";

import dat from 'dat.gui';

interface SceneComposers {
    occlusionComposer: EffectComposer,
    sceneComposer: EffectComposer
}

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

let shaderUniforms: any = {};

const DEFAULT_LAYER = 0;
const OCCLUSION_LAYER = 1;

const axesHelper = new AxesHelper(10);
const loader = new GLTFLoader();
const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);

const renderer = new WebGLRenderer();
const controls = new OrbitControls(camera, renderer.domElement);

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = "absolute";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
document.body.appendChild(renderer.domElement);

const effectComposers = composeEffects(renderer, scene, camera);

function buildScene() {
    loader.load(skullFile, skull => {
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

    scene.add(new AxesHelper(10))

    let ambientLight = new AmbientLight("#2c3e50",1.2);
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
    setUpGUI({lightSphere, pointLight})
}

function composeEffects(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): SceneComposers {
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
    shaderUniforms = scatteringPass.uniforms;
    occlusionComposer.addPass(scatteringPass);

    let finalPass = new ShaderPass(CopyShader);
    occlusionComposer.addPass(finalPass);

    let sceneComposer = new EffectComposer(renderer);
    sceneComposer.addPass(new RenderPass(scene, camera));

    let blendingPass = new ShaderPass(blendingShader);
    blendingPass.uniforms.tOcclusion.value = occlusionRenderTarget.texture;
    blendingPass.renderToScreen = true;
    sceneComposer.addPass(blendingPass);

    return {occlusionComposer, sceneComposer}
}

function update() {}

function render(camera: Camera, {occlusionComposer, sceneComposer}: SceneComposers) {
    camera.layers.set(OCCLUSION_LAYER);
    renderer.setClearColor("#111111")
    occlusionComposer.render();

    camera.layers.set(DEFAULT_LAYER);
    renderer.setClearColor("#030509");
    sceneComposer.render();
}

function onFrame(camera: Camera) {
    requestAnimationFrame(() => onFrame(camera));
    controls.update();
    update();
    render(camera, effectComposers);
}

function updateShaderLightPosition(lightSphere: Mesh) {
    let screenPosition = lightSphere.position.clone().project(camera);
    let newX = 0.5 * (screenPosition.x + 1);
    let newY = 0.5 * (screenPosition.y + 1);
    shaderUniforms.lightPosition.value.set(newX, newY)

}

function setUpGUI({ pointLight, lightSphere }: { pointLight: PointLight, lightSphere: Mesh}) {
    let gui = new dat.GUI();
    gui.addFolder("Light Position")
    let xController = gui.add(lightSphere.position, "x", -10, 10, 0.01);
    let yController = gui.add(lightSphere.position, "y", -10, 10, 0.01);
    let zController = gui.add(lightSphere.position, "z", -20, 20, 0.01);

    controls.addEventListener("change", () => updateShaderLightPosition(lightSphere))

    xController.onChange(x => {
        pointLight.position.x = x;
        updateShaderLightPosition(lightSphere);
    })
    yController.onChange(y => {
        pointLight.position.y = y;
        updateShaderLightPosition(lightSphere);
    })
    zController.onChange(z => {
        pointLight.position.z = z;
        updateShaderLightPosition(lightSphere);
    })

    gui.addFolder("Volumetric scattering parameters");
    Object.keys(shaderUniforms).forEach((k: string) => {
        if (k != "tDiffuse" && k != "lightPosition") {
            let prop = shaderUniforms[k]
            switch (k) {
                case "weight":
                    gui.add(prop, "value", 0, 1, 0.01).name(k);
                    break;
                case "exposure":
                    gui.add(prop, "value", 0, 1, 0.01).name(k);
                    break;
                case "decay":
                    gui.add(prop, "value", 0.8, 1, 0.001).name(k);
                    break;
                case "density":
                    gui.add(prop, "value", 0, 1, 0.01).name(k);
                    break;
                case "samples":
                    gui.add(prop, "value", 0, 200, 1).name(k);
                    break;
            }
        }
    })
}

buildScene();
onFrame(camera);
