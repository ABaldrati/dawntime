import skullFile from "../models/skull/scene.gltf";
import {
    AmbientLight,
    AxesHelper,
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

export class SkullScene extends AbstractScene {
    private static instance: SkullScene;
    private pointLight: PointLight;
    private lightSphere: Mesh;
    private loadFinished: boolean = false;

    private constructor() {
        super(new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 350))
        this.pointLight = undefined as any as PointLight;
        this.lightSphere = undefined as any as Mesh;
        this.cameraInitialPosition = new Vector3(-0.04, -0.68, 6.97);
        this.buildScene();
    }

    static getInstance(): SkullScene {
        if (!SkullScene.instance) {
            SkullScene.instance = new SkullScene();
        } else {
            SkullScene.instance.buildGUI();
            SkullScene.instance.resetScene();
        }
        return SkullScene.instance;
    }

    public render() {
        if (this.loadFinished) {
            this.controls.update();
            updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms)

            this.camera.layers.set(OCCLUSION_LAYER);
            renderer.setClearColor("#111111")

            this.occlusionComposer.render();
            this.camera.layers.set(DEFAULT_LAYER);
            renderer.setClearColor("#015e78");

            this.sceneComposer.render();
            //console.log(this.camera.position)
        } else {
            this.camera.layers.set(LOADING_LAYER);
            renderer.setClearColor("#000000");

            this.sceneComposer.render();
        }
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
            skull.scene.position.z = 3;

            this.loadFinished = true;
            this.controls.enabled = true;
            this.buildGUI();
        }, undefined, error => {
            console.error(error);
        });

        this.scene.add(new AxesHelper(10))

        let ambientLight = new AmbientLight("#2c3e50", 2);
        this.scene.add(ambientLight);

        this.pointLight = new PointLight("#ffffff");
        this.scene.add(this.pointLight);

        let geometry = new SphereBufferGeometry(0.8, 32, 32);
        let material = new MeshBasicMaterial({color: 0xffffff});
        this.lightSphere = new Mesh(geometry, material);
        this.lightSphere.layers.set(OCCLUSION_LAYER)
        this.scene.add(this.lightSphere);

        this.camera.position.copy(this.cameraInitialPosition);

        this.controls.enabled = false;
        this.scene.add(this.loadingScreen.loadingPlane);
        this.loadingScreen.loadingPlane.position.copy(this.cameraInitialPosition);
        this.loadingScreen.loadingPlane.position.z = 6;
        this.loadingScreen.loadingPlane.rotation.setFromVector3(new Vector3(0, 0, 0))
        this.loadingScreen.loadingPlane.rotateX(Math.PI / 20);

        this.controls.update();
    }

    protected buildGUI() {
        super.buildGUI();

        let lightPositionFolder = this.gui.addFolder("Light Position")
        let xController = lightPositionFolder.add(this.lightSphere.position, "x", -10, 10, 0.01);
        let yController = lightPositionFolder.add(this.lightSphere.position, "y", -10, 10, 0.01);
        let zController = lightPositionFolder.add(this.lightSphere.position, "z", -20, 20, 0.01);
        lightPositionFolder.open()

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
    }
}
