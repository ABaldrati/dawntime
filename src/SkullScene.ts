import skullFile from "../models/skull/scene.gltf";
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
    Scene, SphereBufferGeometry,
    WebGLRenderTarget
} from "three";
import {GUI} from "dat.gui";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";
import {HorizontalBlurShader} from "three/examples/jsm/shaders/HorizontalBlurShader";
import {VerticalBlurShader} from "three/examples/jsm/shaders/VerticalBlurShader";
import {CopyShader} from "three/examples/jsm/shaders/CopyShader";
import {
    blendingShader, DEFAULT_LAYER,
    loader,
    OCCLUSION_LAYER,
    occlusionShader,
    renderer,
    updateShaderLightPosition
} from "./index";

export class SkullScene {
    private scene: Scene;
    private gui: GUI;
    private occlusionComposer: EffectComposer;
    private sceneComposer: EffectComposer;
    private camera: Camera;
    private controls: OrbitControls;
    private pointLight: PointLight;
    private lightSphere: Mesh;
    private shaderUniforms: any = {}

    constructor() {
        this.scene = new Scene();
        this.gui = new GUI();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.controls = new OrbitControls(this.camera, renderer.domElement);
        this.pointLight = undefined as any as PointLight;
        this.lightSphere = undefined as any as Mesh;
        this.buildScene();
        [this.occlusionComposer, this.sceneComposer] = this.composeEffects()
        this.buildGUI();
    }

    composeEffects() {
        const renderTargetParameters = {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            format: RGBFormat,
            stencilBuffer: false
        };
        let occlusionRenderTarget = new WebGLRenderTarget(window.innerWidth / 2, window.innerHeight / 2, renderTargetParameters)

        let occlusionComposer = new EffectComposer(renderer, occlusionRenderTarget);
        occlusionComposer.addPass(new RenderPass(this.scene, this.camera));

        let scatteringPass = new ShaderPass(occlusionShader);
        this.shaderUniforms = scatteringPass.uniforms;
        occlusionComposer.addPass(scatteringPass);

        let horizontalBlurPass = new ShaderPass(HorizontalBlurShader);
        horizontalBlurPass.uniforms.h.value = 0.4 / occlusionRenderTarget.height;
        // occlusionComposer.addPass(horizontalBlurPass);

        let verticalBlurPass = new ShaderPass(VerticalBlurShader);
        verticalBlurPass.uniforms.v.value = 0.4 / occlusionRenderTarget.width;
        // occlusionComposer.addPass(verticalBlurPass);

        let finalPass = new ShaderPass(CopyShader);
        occlusionComposer.addPass(finalPass);

        let sceneComposer = new EffectComposer(renderer);
        sceneComposer.addPass(new RenderPass(this.scene, this.camera));

        let blendingPass = new ShaderPass(blendingShader);
        blendingPass.uniforms.tOcclusion.value = occlusionRenderTarget.texture;
        blendingPass.renderToScreen = true;
        sceneComposer.addPass(blendingPass);

        return [occlusionComposer, sceneComposer]
    }

    buildScene() {
        loader.load(skullFile, skull => {
            skull.scene.traverse(o => {
                if (o instanceof Mesh) {
                    let material = new MeshBasicMaterial({color: "#000000"});
                    let occlusionObject = new Mesh(o.geometry, material)

                    o.add(new AxesHelper(10));

                    occlusionObject.add(new AxesHelper(10));
                    occlusionObject.layers.set(OCCLUSION_LAYER)
                    o.parent?.add(occlusionObject)
                }
            })

            this.scene.add(skull.scene);
            skull.scene.position.z = 2;
        }, undefined, error => {
            console.error(error);
        });

        this.scene.add(new AxesHelper(10))

        let ambientLight = new AmbientLight("#2c3e50", 1.2);
        this.scene.add(ambientLight);

        this.pointLight = new PointLight("#ffffff");
        this.scene.add(this.pointLight);

        let geometry = new SphereBufferGeometry(0.5, 32, 32);
        let material = new MeshBasicMaterial({color: 0xffffff});
        this.lightSphere = new Mesh(geometry, material);
        this.lightSphere.layers.set(OCCLUSION_LAYER)
        this.scene.add(this.lightSphere);

        this.camera.position.z = 6;
        this.controls.update();
    }

    private buildGUI() {
        this.gui.addFolder("Light Position")
        let xController = this.gui.add(this.lightSphere.position, "x", -10, 10, 0.01);
        let yController = this.gui.add(this.lightSphere.position, "y", -10, 10, 0.01);
        let zController = this.gui.add(this.lightSphere.position, "z", -20, 20, 0.01);

        this.controls.addEventListener("change", () => updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms))

        xController.onChange(x => {
            this.pointLight.position.x = x;
            updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms);
        })
        yController.onChange(y => {
            this.pointLight.position.y = y;
            updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms);
        })
        zController.onChange(z => {
            this.pointLight.position.z = z;
            updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms);
        })

        this.gui.addFolder("Volumetric scattering parameters");
        Object.keys(this.shaderUniforms).forEach((k: string) => {
            if (k != "tDiffuse" && k != "lightPosition") {
                let prop = this.shaderUniforms[k]
                switch (k) {
                    case "weight":
                        this.gui.add(prop, "value", 0, 1, 0.01).name(k);
                        break;
                    case "exposure":
                        this.gui.add(prop, "value", 0, 1, 0.01).name(k);
                        break;
                    case "decay":
                        this.gui.add(prop, "value", 0.8, 1, 0.001).name(k);
                        break;
                    case "density":
                        this.gui.add(prop, "value", 0, 1, 0.01).name(k);
                        break;
                    case "samples":
                        this.gui.add(prop, "value", 0, 200, 1).name(k);
                        break;
                }
            }
        })
    }

    render() {
        this.controls.update();

        this.camera.layers.set(OCCLUSION_LAYER);
        renderer.setClearColor("#111111")

        this.occlusionComposer.render();
        this.camera.layers.set(DEFAULT_LAYER);
        renderer.setClearColor("#030509");

        this.sceneComposer.render();
    }

    destroyGUI() {
        this.gui.destroy();
    }
}
