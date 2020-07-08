import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Camera, Mesh, Vector2, WebGLRenderer} from "three";

import volumetricLightScatteringShader from './FragmentVolumetricScattering.glsl'
import passThroughVertexShader from "./PassThroughVertexShader.glsl"
import blendingFragmentShader from "./BlendingFragmentShader.glsl"

import {GUI} from 'dat.gui';
import {SkullScene} from "./SkullScene";
import {AbstractScene} from "./AbstractScene";
import {WarehouseScene} from "./WarehouseScene";
import {IcosahedronScene} from "./IcosahedronScene";
import { ShipScene } from './ShipScene';

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

const DEFAULT_LAYER = 0;
const OCCLUSION_LAYER = 1;

const loader = new GLTFLoader();
const renderer = new WebGLRenderer();

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = "absolute";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
document.body.appendChild(renderer.domElement);

let scene: AbstractScene = SkullScene.getInstance();

export {renderer, occlusionShader, blendingShader, loader, OCCLUSION_LAYER, DEFAULT_LAYER, updateShaderLightPosition};

function onFrame() {
    requestAnimationFrame(onFrame);
    scene.update();
    scene.render();
}

function updateShaderLightPosition(lightSphere: Mesh, camera: Camera, shaderUniforms: any) {
    let screenPosition = lightSphere.position.clone().project(camera);
    let newX = 0.5 * (screenPosition.x + 1);
    let newY = 0.5 * (screenPosition.y + 1);
    shaderUniforms.lightPosition.value.set(newX, newY)
}

function setUpSceneSelection() {
    let gui = new GUI();
    gui.domElement.style.float = "left";
    gui.addFolder("Scene selection")

    let scenes: { [key: string]: () => AbstractScene } = {
        "Skull": () => SkullScene.getInstance(),
        "Warehouse": () => WarehouseScene.getInstance(),
        "Icosahedron": () => IcosahedronScene.getInstance(),
        "Ship": () => ShipScene.getInstance(),
    }

    let sceneSelector = gui.add({scene}, "scene", Object.keys(scenes));
    sceneSelector.onChange((selectedScene: string) => {
        let oldScene = scene;
        oldScene.destroyGUI();
        scene = scenes[selectedScene]();
    })
    sceneSelector.setValue("Skull");
}

window.addEventListener("resize", _ => {
    scene.updateSize(window.innerWidth, window.innerHeight);
    renderer.setSize(window.innerWidth, window.innerHeight);
})

setUpSceneSelection()
onFrame();
