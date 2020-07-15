import shipFile from "../models/sailing_ship/scene.gltf";
import seaFile from "../models/sea_wave/scene.gltf";
import backgroundFile from "../models/sailing_ship/background.png";
import {
    AmbientLight,
    BackSide,
    Box3,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    PerspectiveCamera,
    PointLight,
    SphereBufferGeometry,
    TextureLoader,
    Vector3
} from "three";
import {DEFAULT_LAYER, OCCLUSION_LAYER, renderer, updateShaderLightPosition} from "./index";
import {AbstractScene} from "./AbstractScene";
import {GUI} from "dat.gui";
import {loadModel} from "./utils";

export class ShipScene extends AbstractScene {
    private static instance: Promise<ShipScene>;

    private pointLight: PointLight;
    private lightSphere: Mesh;
    private animationEnabled = true;
    private angle: number = 0;
    private sea: Object3D;

    private constructor() {
        super(new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 2000))
        this.pointLight = undefined as any as PointLight;
        this.lightSphere = undefined as any as Mesh;
        this.sea = undefined as any as Object3D;
        this.animationEnabled = true;
        this.cameraInitialPosition = new Vector3(10, -4, 20)
    }

    static async getInstance(): Promise<ShipScene> {
        if (!ShipScene.instance) {
            let s = new ShipScene();
            ShipScene.instance = s.buildScene();
        } else {
            let s = await ShipScene.instance;
            s.buildGUI();
            s.resetScene()
        }

        return ShipScene.instance;
    }

    public render() {
        this.controls.update();
        updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms)

        this.camera.layers.set(OCCLUSION_LAYER);
        renderer.setClearColor("hsl(200,33%,7%)")

        this.occlusionComposer.render();
        this.camera.layers.set(DEFAULT_LAYER);

        this.sceneComposer.render();
    }

    update(): void {
        if (!this.animationEnabled) {
            return super.update();
        }

        const y = Math.sin(this.angle);
        this.sea.position.setY(-7 + y)
        this.angle += 0.01;
    }

    protected async buildScene(): Promise<ShipScene> {
        let bgGeometry = new SphereBufferGeometry(2000, 150, 150);

        let texture = new TextureLoader().loadAsync(backgroundFile);
        texture.then(texture => {

            const bgMaterial = new MeshBasicMaterial({
                map: texture,
                side: BackSide,
            });
            let backgroundSphere = new Mesh(bgGeometry, bgMaterial);
            backgroundSphere.position.z = 35;
            this.scene.add(backgroundSphere);
        });
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
        this.camera.position.copy(this.cameraInitialPosition)

        updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms);

        let ship = await loadModel(shipFile);
        this.sea = (await loadModel(seaFile)).scene
        ship.scene.traverse(o => {
            if (o instanceof Mesh) {
                let material = new MeshBasicMaterial({color: "hsl(20,100%,3%)"});
                let occlusionObject = new Mesh(o.geometry, material)

                occlusionObject.layers.set(OCCLUSION_LAYER)
                o.parent?.add(occlusionObject)
                o.geometry.center()
            }
        })

        this.scene.add(this.sea);
        const box = new Box3().setFromObject(ship.scene);

        const center = box.getCenter(new Vector3());
        ship.scene.translateOnAxis(ship.scene.position.clone().sub(center), 2)

        ship.scene.position.set(-12, -14, 12)

        this.sea.add(ship.scene);
        this.sea.position.setY(-7);

        this.buildGUI();

        this.controls.minDistance = 10;
        this.controls.maxDistance = 40;

        return Promise.resolve(this);
    }

    protected buildGUI() {
        super.buildGUI();

        let lightPositionFolder = this.gui.addFolder("Light Position")
        let xController = lightPositionFolder.add(this.lightSphere.position, "x", -10, 10, 0.01);
        let yController = lightPositionFolder.add(this.lightSphere.position, "y", -10, 10, 0.01);
        let zController = lightPositionFolder.add(this.lightSphere.position, "z", -25, 25, 0.01);
        lightPositionFolder.open();

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
        resetFolder.add(this, "animationEnabled").name("Animation enabled")
        resetFolder.open()
    }
}
