//import warehouseFile from "../models/warehouse/scene.gltf"; TODO
import {
    AmbientLight,
    AxesHelper,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    PointLight,
    SphereBufferGeometry, Vector3
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {DEFAULT_LAYER, loader, OCCLUSION_LAYER, renderer, updateShaderLightPosition} from "./index";
import {AbstractScene} from "./AbstractScene";
import {GUI} from "dat.gui";

export class WarehouseScene extends AbstractScene {
    private static instance: WarehouseScene;
    private controls: OrbitControls;
    private pointLight: PointLight;
    private lightSphere: Mesh;

    private constructor() {
        super(new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200))
        this.controls = new OrbitControls(this.camera, renderer.domElement);
        this.pointLight = undefined as any as PointLight;
        this.lightSphere = undefined as any as Mesh;
        this.buildScene();
        this.buildGUI();
    }

    static getInstance(): WarehouseScene {
        if (!WarehouseScene.instance) {
            WarehouseScene.instance = new WarehouseScene();
        }
        else {
            WarehouseScene.instance.buildGUI();
        }
        return WarehouseScene.instance;
    }

    public render() {
        updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms); //TODO check position
        this.controls.update();

        this.camera.layers.set(OCCLUSION_LAYER);
        renderer.setClearColor("#111111")

        this.occlusionComposer.render();
        this.camera.layers.set(DEFAULT_LAYER);
        renderer.setClearColor("#030509");
        this.sceneComposer.render();
    }

    protected buildScene() {
        loader.load('warehouse/scene.gltf', skull => {
            skull.scene.scale.set(5, 5, 5);
            skull.scene.traverse(o => {
                if (o instanceof Mesh) {
                    let material = new MeshBasicMaterial({color: "#000000"});
                    let occlusionObject = new Mesh(o.geometry, material)

                    occlusionObject.layers.set(OCCLUSION_LAYER)
                    o.parent?.add(occlusionObject)
                }
            })

            this.scene.add(skull.scene);
            skull.scene.position.z = -7;
        }, undefined, error => {
            console.error(error);
        });


        let ambientLight = new AmbientLight("#2c3e50", 4);
        this.scene.add(ambientLight);

        this.pointLight = new PointLight("#ffffff");
        this.scene.add(this.pointLight);

        let geometry = new SphereBufferGeometry(0.5, 32, 32);
        let material = new MeshBasicMaterial({color: 0xffffff});
        this.lightSphere = new Mesh(geometry, material);
        this.lightSphere.layers.set(OCCLUSION_LAYER)
        //this.scene.add(this.lightSphere);

        this.camera.position.z = -20;
        this.camera.position.x = -14;

        this.controls.minAzimuthAngle = -Math.PI / 1.55;
        this.controls.maxAzimuthAngle = -Math.PI / 1.55 + Math.PI / 5.3;
        this.controls.minPolarAngle = Math.PI / 4 + Math.PI / 5;
        this.controls.maxPolarAngle = Math.PI / 3 + Math.PI / 5;
        this.controls.minDistance = 8;
        this.controls.maxDistance = 22
        this.controls.target.set(5, 0, -14)

        this.camera.updateProjectionMatrix();
        this.controls.update();

        this.shaderUniforms.exposure.value = 0.20;

    }

    protected buildGUI() {
        this.gui = new GUI()
        let lightPositionFolder = this.gui.addFolder("Light Position")
        let xController = lightPositionFolder.add(this.lightSphere.position, "x", -10, 10, 0.01);
        let yController = lightPositionFolder.add(this.lightSphere.position, "y", -10, 10, 0.01);
        let zController = lightPositionFolder.add(this.lightSphere.position, "z", -20, 20, 0.01);
        lightPositionFolder.open()

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
            this.camera.position.z = -20;
            this.camera.position.x = -14;
            this.controls.update();
        };

        let resetSliders = () => {
            this.gui.revert(tempgui);
        };

        let resetPosition = () => {
            this.camera.position.z = -20;
            this.camera.position.x = -14;
            this.controls.update();
        };
        let resetFolder = this.gui.addFolder("Scene management")
        resetFolder.add({resetSliders}, 'resetSliders')
        resetFolder.add({resetPosition}, 'resetPosition')
        resetFolder.add({resetScene}, 'resetScene')

        resetFolder.open()
    }
}
