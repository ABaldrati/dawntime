import shipFile from "../models/sailing_ship/scene.gltf";
import seaFile from "../models/sea_wave/scene.gltf";
import {
    AmbientLight,
    Box3,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    PerspectiveCamera,
    PointLight,
    SphereBufferGeometry,
    Vector3
} from "three";
import {DEFAULT_LAYER, loader, OCCLUSION_LAYER, renderer, updateShaderLightPosition} from "./index";
import {AbstractScene} from "./AbstractScene";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {GLTF} from "three/examples/jsm/loaders/GLTFLoader";

export class ShipScene extends AbstractScene {
    private controls: OrbitControls;
    private pointLight: PointLight;
    private lightSphere: Mesh;
    private sea: Promise<Object3D>;

    constructor() {
        super(new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000))
        this.controls = new OrbitControls(this.camera, renderer.domElement)
        this.pointLight = undefined as any as PointLight;
        this.lightSphere = undefined as any as Mesh;
        this.sea = undefined as any as Promise<Object3D>;
        this.buildScene();
        this.buildGUI();
    }

    public render() {
        this.camera.layers.set(OCCLUSION_LAYER);
        renderer.setClearColor("hsl(200,33%,7%)")

        this.occlusionComposer.render();
        this.camera.layers.set(DEFAULT_LAYER);

        this.sceneComposer.render();
    }

    update(): void {
        const now = Date.now();
        const y = Math.sin(now / 1500);
        this.sea.then(s => s.position.setY(-7 + y));

        updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms);
    }

    protected buildScene() {

        let loadModel: (_: string) => Promise<GLTF> = (path: string) => {
            return new Promise(((resolve, reject) => {
                loader.load(path, ship => {
                    resolve(ship);
                }, undefined, error => {
                    reject(error);
                });
            }))
        };
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
                return sea.scene;
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

        this.camera.position.z = 25;

        updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms)
    }

    protected buildGUI() {
        this.gui.addFolder("Light Position")
        let xController = this.gui.add(this.lightSphere.position, "x", -10, 10, 0.01);
        let yController = this.gui.add(this.lightSphere.position, "y", -10, 10, 0.01);
        let zController = this.gui.add(this.lightSphere.position, "z", -25, 25, 0.01);

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
}
