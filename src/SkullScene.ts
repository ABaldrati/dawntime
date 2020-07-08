import skullFile from "../models/skull/scene.gltf";
import {
    AmbientLight,
    AxesHelper,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    PointLight,
    SphereBufferGeometry
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {DEFAULT_LAYER, loader, OCCLUSION_LAYER, renderer, updateShaderLightPosition} from "./index";
import {AbstractScene} from "./AbstractScene";
import {GUI} from "dat.gui";

export class SkullScene extends AbstractScene {
    private controls: OrbitControls;
    private pointLight: PointLight;
    private lightSphere: Mesh;

    constructor() {
        super(new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 35))
        this.controls = new OrbitControls(this.camera, renderer.domElement);
        this.pointLight = undefined as any as PointLight;
        this.lightSphere = undefined as any as Mesh;
        this.buildScene();
        this.buildGUI();
    }

    public render() {
        this.controls.update();
        updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms)

        this.camera.layers.set(OCCLUSION_LAYER);
        renderer.setClearColor("#111111")

        this.occlusionComposer.render();
        this.camera.layers.set(DEFAULT_LAYER);
        renderer.setClearColor("#030509");

        this.sceneComposer.render();
    }

    protected buildScene() {
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

    protected buildGUI() {
        let lightPositionFolder = this.gui.addFolder("Light Position")
        lightPositionFolder.add(this.lightSphere.position, "x", -10, 10, 0.01);
        lightPositionFolder.add(this.lightSphere.position, "y", -10, 10, 0.01);
        lightPositionFolder.add(this.lightSphere.position, "z", -20, 20, 0.01);
        lightPositionFolder.open()

        let scatteringFolder = this.gui.addFolder("Volumetric scattering parameters");
        Object.keys(this.shaderUniforms).forEach((k: string) => {
            if (k != "tDiffuse" && k != "lightPosition") {
                let prop = this.shaderUniforms[k]
                switch (k) {
                    case "weight":
                        scatteringFolder.add(prop, "value", 0, 1, 0.01).name(k);
                        break;
                    case "exposure":
                        scatteringFolder.add(prop, "value", 0, 1, 0.01).name(k);
                        break;
                    case "decay":
                        scatteringFolder.add(prop, "value", 0.8, 1, 0.001).name(k);
                        break;
                    case "density":
                        scatteringFolder.add(prop, "value", 0, 1, 0.01).name(k);
                        break;
                    case "samples":
                        scatteringFolder.add(prop, "value", 0, 200, 1).name(k);
                        break;
                }
            }
        })
        scatteringFolder.open();

        let tempgui = new GUI(this.gui)
        tempgui.domElement.style.display = "none";

        let resetScene = () => {
            this.gui.revert(tempgui);
            this.camera.position.set(0,0,6);
            this.controls.update();
        };

        let resetSliders = () => {
            this.gui.revert(tempgui);
        };

        let resetPosition = () => {
            this.camera.position.set(0,0,6);
            this.controls.update();
        };
        let resetFolder = this.gui.addFolder("Scene management")
        resetFolder.add({resetSliders}, 'resetSliders')
        resetFolder.add({resetPosition}, 'resetPosition')
        resetFolder.add({resetScene}, 'resetScene')

        resetFolder.open()
    }
}
