import warehouseFile from "../models/warehouse/scene.gltf";
import {
    AmbientLight,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    PointLight,
    SphereBufferGeometry,
    Vector3
} from "three";
import {DEFAULT_LAYER, loader, LOADING_LAYER, OCCLUSION_LAYER, renderer, updateShaderLightPosition} from "./index";
import {AbstractScene} from "./AbstractScene";
import {GUI} from "dat.gui";
import {GLTF} from "three/examples/jsm/loaders/GLTFLoader";

export class WarehouseScene extends AbstractScene {
    private static instance: Promise<WarehouseScene>;
    private pointLight: PointLight;
    private lightSphere: Mesh;

    private constructor() {
        super(new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200))
        this.pointLight = undefined as any as PointLight;
        this.lightSphere = undefined as any as Mesh;
        this.cameraInitialPosition = new Vector3(-14, 0, -20)
    }

    static async getInstance(): Promise<WarehouseScene> {
        if (!WarehouseScene.instance) {
            let s = new WarehouseScene();
            WarehouseScene.instance = s.buildScene();
        } else {
            let s = await WarehouseScene.instance;
            s.buildGUI();
            s.resetScene()
        }

        return WarehouseScene.instance;
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

    protected async buildScene(): Promise<WarehouseScene> {
        let ambientLight = new AmbientLight("#2c3e50", 4);

        this.scene.add(ambientLight);
        this.pointLight = new PointLight("#ffffff");

        this.scene.add(this.pointLight);
        let geometry = new SphereBufferGeometry(0.5, 32, 32);

        let material = new MeshBasicMaterial({color: 0xffffff});
        this.lightSphere = new Mesh(geometry, material);
        this.lightSphere.layers.set(OCCLUSION_LAYER)
        this.controls.minAzimuthAngle = -Math.PI / 1.55;

        this.controls.maxAzimuthAngle = -Math.PI / 1.55 + Math.PI / 5.3;
        this.controls.minPolarAngle = Math.PI / 4 + Math.PI / 5;
        this.controls.maxPolarAngle = Math.PI / 3 + Math.PI / 5;
        this.controls.minDistance = 8;
        this.controls.maxDistance = 22
        this.controls.update();

        this.shaderUniforms.exposure.value = 0.20;

        let warehousePromise = loader.loadAsync(warehouseFile);
        warehousePromise.catch(console.log);

        let warehouse: GLTF = await warehousePromise;
        warehouse.scene.scale.set(5, 5, 5);
        warehouse.scene.traverse(o => {
            if (o instanceof Mesh) {
                let material = new MeshBasicMaterial({color: "#000000"});
                let occlusionObject = new Mesh(o.geometry, material)

                occlusionObject.layers.set(OCCLUSION_LAYER)
                o.parent?.add(occlusionObject)
            }
        })

        this.scene.add(warehouse.scene);
        warehouse.scene.position.z = -7;

        this.buildGUI();
        this.controls.target.set(5, 0, -14);
        this.camera.position.copy(this.cameraInitialPosition)


        return Promise.resolve(this);
    }

    protected buildGUI() {
        super.buildGUI();

        let lightPositionFolder = this.gui.addFolder("Light Position")
        let xController = lightPositionFolder.add(this.lightSphere.position, "x", -10, 10, 0.01);
        let yController = lightPositionFolder.add(this.lightSphere.position, "y", -10, 10, 0.01);
        let zController = lightPositionFolder.add(this.lightSphere.position, "z", -20, 20, 0.01);
        lightPositionFolder.open()

        this.controls.addEventListener("change", () => updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms))

        xController.onChange(x => {
            this.pointLight.position.x = x;
        })
        yController.onChange(y => {
            this.pointLight.position.y = y;
        })
        zController.onChange(z => {
            this.pointLight.position.z = z;
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

        this.initialGUI = new GUI(this.gui)
        this.initialGUI.domElement.style.display = "none";

        let resetFolder = this.gui.addFolder("Scene management")
        resetFolder.add(this, 'resetSliders').name("Reset sliders")
        resetFolder.add(this, 'resetPosition').name("Reset position")
        resetFolder.add(this, 'resetScene').name("Reset scene")
        resetFolder.open()

        resetFolder.open()
    }
}
