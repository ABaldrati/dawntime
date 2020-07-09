import satelliteFile from "../models/satellite/scene.gltf";
import bgFile from "../models/satellite/bg_sky.jpg"
import {
    AmbientLight,
    BackSide, CineonToneMapping, Group, LinearToneMapping,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    PointLight,
    SphereBufferGeometry, TextureLoader
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {DEFAULT_LAYER, loader, OCCLUSION_LAYER, renderer, updateShaderLightPosition} from "./index";
import {AbstractScene} from "./AbstractScene";
import {GUI} from "dat.gui";

export class SatelliteScene extends AbstractScene {
    private static instance: SatelliteScene;
    private controls: OrbitControls;
    private pointLight: PointLight;
    private lightSphere: Mesh;

    private constructor() {
        super(new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000))
        this.controls = new OrbitControls(this.camera, renderer.domElement);
        this.pointLight = undefined as any as PointLight;
        this.lightSphere = undefined as any as Mesh;
        this.buildScene();
        this.buildGUI();
    }

    static getInstance(): SatelliteScene {
        if (!SatelliteScene.instance) {
            SatelliteScene.instance = new SatelliteScene();
        } else {
            SatelliteScene.instance.buildGUI();
        }
        return SatelliteScene.instance;
    }

    public render() {
        this.controls.update();
        updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms)

        this.camera.layers.set(OCCLUSION_LAYER);
        renderer.setClearColor("#1a1a1a")

        this.occlusionComposer.render();
        this.camera.layers.set(DEFAULT_LAYER);
        //renderer.setClearColor("#015e78");

        this.sceneComposer.render();
        console.log('polar')
        console.log(this.controls.getPolarAngle());
        console.log('azimuth')
        console.log(this.controls.getAzimuthalAngle())
        console.log(' ')
    }

    protected buildScene() {
        loader.load(satelliteFile, satellite => {
            satellite.scene.traverse(o => {
                if (o instanceof Mesh) {
                    let material = new MeshBasicMaterial({color: "#010101"});
                    let occlusionObject = new Mesh(o.geometry, material)


                    occlusionObject.layers.set(OCCLUSION_LAYER)
                    o.parent?.add(occlusionObject)
                }
            })
            satellite.scene.scale.set(0.01,0.01,0.01);
            this.scene.add(satellite.scene);
            satellite.scene.position.z = 75;
            satellite.scene.position.y = 5;
        }, undefined, error => {
            console.error(error);
        });


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
        var texture = new TextureLoader().load( bgFile)
        const bgMaterial = new MeshBasicMaterial({
            map: texture,
            side: BackSide,

        });
        let backgroundSphere = new Mesh(bgGeometry, bgMaterial);
        this.scene.add(backgroundSphere)

       this.camera.position.set(-18.19, 3.22,98.78)
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
        lightPositionFolder.add(this.lightSphere.position, "x", -100, 100, 0.1);
        lightPositionFolder.add(this.lightSphere.position, "y", -100, 100, 0.1);
        lightPositionFolder.add(this.lightSphere.position, "z", -100, 100, 0.1);
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
            resetPosition();
        };

        let resetSliders = () => {
            this.gui.revert(tempgui);
        };

        let resetPosition = () => {
            this.camera.position.set(-18.19, 3.22,98.78)
            this.controls.update();
        };
        let resetFolder = this.gui.addFolder("Scene management")
        resetFolder.add({resetSliders}, 'resetSliders')
        resetFolder.add({resetPosition}, 'resetPosition')
        resetFolder.add({resetScene}, 'resetScene')

        resetFolder.open()
    }
}
