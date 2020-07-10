import shipFile from "../models/sailing_ship/scene.gltf";
import seaFile from "../models/sea_wave/scene.gltf";
import {
    AmbientLight,
    Box3, Clock,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    PerspectiveCamera,
    PointLight,
    SphereBufferGeometry,
    Vector3
} from "three";
import {DEFAULT_LAYER, loader, LOADING_LAYER, OCCLUSION_LAYER, renderer, updateShaderLightPosition} from "./index";
import {AbstractScene} from "./AbstractScene";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {GLTF} from "three/examples/jsm/loaders/GLTFLoader";
import {GUI} from "dat.gui";
import {loadModel} from "./utils";

export class ShipScene extends AbstractScene {
    private static instance: ShipScene;

    private controls: OrbitControls;
    private pointLight: PointLight;
    private lightSphere: Mesh;
    private animationEnabled = true;
    private angle: number = 0;
    private sea: Promise<Object3D>;
    private loadFinished: boolean;

    private constructor() {
        super(new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000))
        this.controls = new OrbitControls(this.camera, renderer.domElement)
        this.pointLight = undefined as any as PointLight;
        this.lightSphere = undefined as any as Mesh;
        this.sea = undefined as any as Promise<Object3D>;
        this.animationEnabled = true;
        this.loadFinished = false;
        this.buildScene();
        this.buildGUI();
    }

    static getInstance(): ShipScene {
        if (!ShipScene.instance) {
            ShipScene.instance = new ShipScene();
        } else {
            ShipScene.instance.buildGUI();
        }

        return ShipScene.instance;
    }

    public render() {
        if (this.loadFinished) {
            this.controls.update();
            updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms)

            this.camera.layers.set(OCCLUSION_LAYER);
            renderer.setClearColor("hsl(200,33%,7%)")

            this.occlusionComposer.render();
            this.camera.layers.set(DEFAULT_LAYER);

            this.sceneComposer.render();
        } else {
            this.camera.layers.set(LOADING_LAYER);
            renderer.setClearColor("#000000");

            this.sceneComposer.render();
        }
    }

    update(): void {
        if (!this.loadFinished) {
            this.loadingScreen.update();
        } else {
            if (!this.animationEnabled) {
                return super.update();
            }

            const y = Math.sin(this.angle);
            this.sea.then(s => s.position.setY(-7 + y));
            this.angle += 0.01;
        }
    }

    protected buildScene() {
        this.sea = Promise.all([loadModel(shipFile), loadModel(seaFile)])
            .then(([ship, sea]: [GLTF, GLTF]) => {
                ship.scene.traverse(o => {
                    if (o instanceof Mesh) {
                        let material = new MeshBasicMaterial({color: "hsl(20,100%,3%)"});
                        let occlusionObject = new Mesh(o.geometry, material)

                        occlusionObject.layers.set(OCCLUSION_LAYER)
                        o.parent?.add(occlusionObject)
                        o.geometry.center()
                    }
                })

                this.scene.add(sea.scene);
                const box = new Box3().setFromObject(ship.scene);

                const center = box.getCenter(new Vector3());
                ship.scene.translateOnAxis(ship.scene.position.clone().sub(center), 2)

                ship.scene.position.set(-12, -14, 12)

                sea.scene.add(ship.scene);
                sea.scene.position.setY(-7);

                this.controls.enabled = true;
                this.loadFinished = true;

                this.controls.minDistance = 10;
                this.controls.maxDistance = 40;

                return sea.scene;
            });

        this.controls.enabled = false;
        this.scene.add(this.loadingScreen.loadingPlane);
        this.loadingScreen.loadingPlane.position.z = 24;

        let ambientLight = new AmbientLight("#4a5289", 1.2);
        this.scene.add(ambientLight);

        this.pointLight = new PointLight("hsl(17,94%,14%)");
        this.scene.add(this.pointLight);

        let geometry = new SphereBufferGeometry(4, 32, 32);
        let material = new MeshBasicMaterial({color: "hsl(38,100%,20%)"});
        this.lightSphere = new Mesh(geometry, material);
        this.lightSphere.layers.set(OCCLUSION_LAYER)
        this.scene.add(this.lightSphere);

        this.lightSphere.position.setZ(-22);
        this.pointLight.position.setZ(-22);

        this.lightSphere.position.setX(-1.8);
        this.pointLight.position.setX(-1.8);

        this.camera.position.z = 25;

        updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms)
    }

    protected buildGUI() {
        super.buildGUI();

        let positionFolder = this.gui.addFolder("Light Position")
        let xController = positionFolder.add(this.lightSphere.position, "x", -10, 10, 0.01);
        let yController = positionFolder.add(this.lightSphere.position, "y", -10, 10, 0.01);
        let zController = positionFolder.add(this.lightSphere.position, "z", -25, 25, 0.01);
        positionFolder.open();

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

        let volumetricFolder = this.gui.addFolder("Volumetric scattering parameters");
        Object.keys(this.shaderUniforms).forEach((k: string) => {
            if (k != "tDiffuse" && k != "lightPosition") {
                let prop = this.shaderUniforms[k]
                switch (k) {
                    case "weight":
                        volumetricFolder.add(prop, "value", 0, 1, 0.01).name(k);
                        break;
                    case "exposure":
                        volumetricFolder.add(prop, "value", 0, 1, 0.01).name(k);
                        break;
                    case "decay":
                        volumetricFolder.add(prop, "value", 0.8, 1, 0.001).name(k);
                        break;
                    case "density":
                        volumetricFolder.add(prop, "value", 0, 1, 0.01).name(k);
                        break;
                    case "samples":
                        volumetricFolder.add(prop, "value", 0, 200, 1).name(k);
                        break;
                }
            }
        })
        volumetricFolder.open();

        let tempgui = new GUI(this.gui)
        tempgui.domElement.style.display = "none";

        let resetScene = () => {
            this.gui.revert(tempgui);
            this.camera.position.set(0, 0, 25);
            this.sea.then(s => s.position.setY(-7));
            this.angle = 0;
            this.controls.update();
        };

        let resetSliders = () => {
            this.gui.revert(tempgui);
        };

        let resetPosition = () => {
            this.camera.position.set(0, 0, 25);
            this.sea.then(s => s.position.setY(-7));
            this.angle = 0;
            this.controls.update();
        };
        let resetFolder = this.gui.addFolder("Scene management")

        resetFolder.add({resetSliders}, 'resetSliders').name("Reset sliders")
        resetFolder.add({resetPosition}, 'resetPosition').name("Reset position")
        resetFolder.add({resetScene}, 'resetScene').name("Reset scene")
        resetFolder.add(this, "animationEnabled").name("Animation enabled")
        resetFolder.open()
    }
}
