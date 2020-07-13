import satelliteFile from "../models/satellite/scene.gltf";
import bgFile from "../models/satellite/bg_sky.jpg"
import {
    AmbientLight,
    BackSide,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    PointLight,
    SphereBufferGeometry,
    TextureLoader,
    Vector3
} from "three";
import {DEFAULT_LAYER, loader, LOADING_LAYER, OCCLUSION_LAYER, renderer, updateShaderLightPosition} from "./index";
import {AbstractScene} from "./AbstractScene";
import {GUI} from "dat.gui";
import {GLTF} from "three/examples/jsm/loaders/GLTFLoader";

export class SatelliteScene extends AbstractScene {
    private static instance: SatelliteScene;
    private pointLight: PointLight;
    private lightSphere: Mesh;
    private loadFinished: boolean = false;

    private constructor() {
        super(new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000))
        this.pointLight = undefined as any as PointLight;
        this.lightSphere = undefined as any as Mesh;
        this.cameraInitialPosition = new Vector3(-18.19, 3.22, 98.78)
        this.buildScene();
    }

    static getInstance(): SatelliteScene {
        if (!SatelliteScene.instance) {
            SatelliteScene.instance = new SatelliteScene();
        } else {
            SatelliteScene.instance.buildGUI();
            SatelliteScene.instance.resetScene()
        }
        return SatelliteScene.instance;
    }

    update(): void {
        if (!this.loadFinished) {
            this.loadingScreen.update();
        }
    }

    public render() {
        if (this.loadFinished) {
            this.controls.update();
            updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms)

            this.camera.layers.set(OCCLUSION_LAYER);
            renderer.setClearColor("#1a1a1a")

            this.occlusionComposer.render();
            this.camera.layers.set(DEFAULT_LAYER);
            //renderer.setClearColor("#015e78");

            this.sceneComposer.render();
        } else {
            this.camera.layers.set(LOADING_LAYER);
            renderer.setClearColor("#000000");

            this.sceneComposer.render();
        }
    }

    protected buildScene() {
        let satelliteModel = loader.loadAsync(satelliteFile);
        satelliteModel.then((satellite: GLTF) => {
            satellite.scene.traverse(o => {
                if (o instanceof Mesh) {
                    let material = new MeshBasicMaterial({color: "#010101"});
                    let occlusionObject = new Mesh(o.geometry, material)


                    occlusionObject.layers.set(OCCLUSION_LAYER)
                    o.parent?.add(occlusionObject)
                }
            })
            satellite.scene.scale.set(0.01, 0.01, 0.01);
            this.scene.add(satellite.scene);
            satellite.scene.position.z = 75;
            satellite.scene.position.y = 5;
        });

        satelliteModel.catch(console.error);

        this.controls.enabled = false;
        this.scene.add(this.loadingScreen.loadingPlane);
        this.loadingScreen.loadingPlane.position.z = 98;
        this.loadingScreen.loadingPlane.position.y = 3.3;
        this.loadingScreen.loadingPlane.position.x = -18;
        this.loadingScreen.loadingPlane.rotation.setFromVector3(new Vector3(0, 0, 0))
        this.loadingScreen.loadingPlane.rotateY(-Math.PI / 20);

        let ambientLight = new AmbientLight("#2c3e50", 1);
        this.scene.add(ambientLight);

        this.pointLight = new PointLight("#ffffff");
        this.scene.add(this.pointLight);

        let geometry = new SphereBufferGeometry(3, 32, 32);
        let material = new MeshBasicMaterial({color: 0xffffff});
        this.lightSphere = new Mesh(geometry, material);
        this.lightSphere.layers.set(OCCLUSION_LAYER)
        this.scene.add(this.lightSphere);


        let bgGeometry = new SphereBufferGeometry(2000, 150, 150);
        let texture = new TextureLoader().loadAsync(bgFile);

        texture.then(texture => {
            const bgMaterial = new MeshBasicMaterial({
                map: texture,
                side: BackSide,

            });
            let backgroundSphere = new Mesh(bgGeometry, bgMaterial);
            this.scene.add(backgroundSphere);
        });

        Promise.all([satelliteModel, texture]).then(() => {
            this.loadFinished = true;
            this.controls.enabled = true;
            this.buildGUI();
        });

        this.camera.position.copy(this.cameraInitialPosition)
        //this.controls.target.set(50, 50, -14)

        //this.controls.minAzimuthAngle = -0.25
        //this.controls.maxAzimuthAngle = 0.25;
        //this.controls.minPolarAngle = 1.2
        //this.controls.maxPolarAngle = 1.80
        this.controls.minDistance = 15;
        this.controls.maxDistance = 300

        this.controls.update();
    }

    protected buildGUI() {
        super.buildGUI();

        let lightPositionFolder = this.gui.addFolder("Light Position")
        let xController = lightPositionFolder.add(this.lightSphere.position, "x", -100, 100, 0.1);
        let yController = lightPositionFolder.add(this.lightSphere.position, "y", -100, 100, 0.1);
        let zController = lightPositionFolder.add(this.lightSphere.position, "z", -100, 100, 0.1);
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
