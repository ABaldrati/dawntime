import icosahedronFile from "../models/icosahedron/scene.gltf";
import {
    AmbientLight,
    AxesHelper, DoubleSide, FontLoader, Group,
    Mesh,
    MeshBasicMaterial, MeshPhysicalMaterial, Object3D, OrthographicCamera,
    PerspectiveCamera, Plane, PlaneGeometry,
    PointLight, Scene,
    SphereBufferGeometry, TextGeometry, Vector3, WebGLRenderTarget
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {DEFAULT_LAYER, loader, LOADING_LAYER, OCCLUSION_LAYER, renderer, updateShaderLightPosition} from "./index";
import {AbstractScene} from "./AbstractScene";
import {GUI} from "dat.gui";
import {loadModel} from "./utils";

export class IcosahedronScene extends AbstractScene {
    private static instance: IcosahedronScene;
    private controls: OrbitControls;
    private pointLight: PointLight;
    private lightSphere: Mesh;
    private icosahedronGroupScene: Promise<Group>;
    private angle: number;
    private animationEnabled: boolean;
    private loadFinished: boolean;


    private constructor() {
        super(new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 35))
        this.controls = new OrbitControls(this.camera, renderer.domElement);
        this.pointLight = undefined as any as PointLight;
        this.lightSphere = undefined as any as Mesh;
        this.icosahedronGroupScene = undefined as any as Promise<Group>;
        this.angle = 0;
        this.animationEnabled = true;
        this.loadFinished = false;
        this.buildScene();
        this.buildGUI();
    }

    static getInstance(): IcosahedronScene {
        if (!IcosahedronScene.instance) {
            IcosahedronScene.instance = new IcosahedronScene();
        }
        else {
            IcosahedronScene.instance.buildGUI();
        }
        return IcosahedronScene.instance;
    }

    public render() {
        if (this.loadFinished) {
            this.controls.update();
            updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms)

            this.camera.layers.set(OCCLUSION_LAYER);
            renderer.setClearColor("#080808")

            this.occlusionComposer.render();
            this.camera.layers.set(DEFAULT_LAYER);
            renderer.setClearColor("#000000");

            this.sceneComposer.render();
        } else {
            this.camera.layers.set(LOADING_LAYER);
            renderer.setClearColor("#000000");

            this.sceneComposer.render();
        }
    }

    protected buildScene() {
        let firstObject = true;
        let occlusionMaterial = new MeshBasicMaterial({color: "#000000"});
        let firstIcosahedronMaterial = new MeshPhysicalMaterial({color: "#ff0000"});
        let secondIcosahedronMaterial = new MeshPhysicalMaterial({color: "#0f45ec"});

        this.icosahedronGroupScene = loadModel(icosahedronFile).then(icosahedron => {
            icosahedron.scene.traverse(o => {
                if (o instanceof Mesh) {
                    if (firstObject) {
                        firstObject = false;
                        o.material = firstIcosahedronMaterial;
                    }
                    else{
                        o.material = secondIcosahedronMaterial;
                    }
                    console.log(o.material);
                    let occlusionObject = new Mesh(o.geometry, occlusionMaterial)

                    occlusionObject.layers.set(OCCLUSION_LAYER)
                    o.parent?.add(occlusionObject)
                }
            })

            this.scene.add(icosahedron.scene);
            icosahedron.scene.position.z = 4;

            this.controls.enabled = true;
            this.loadFinished = true;

            return icosahedron.scene;
        });

        this.controls.enabled = false;
        this.scene.add(this.loadingScreen.loadingPlane);
        this.loadingScreen.loadingPlane.position.z = this.camera.position.z + 7;

        let ambientLight = new AmbientLight("#2c3e50", 1);
        this.scene.add(ambientLight);

        this.pointLight = new PointLight("#ffffff");
        this.scene.add(this.pointLight);

        let geometry = new SphereBufferGeometry(1.5, 32, 32);
        let material = new MeshBasicMaterial({color: 0xffffff});
        this.lightSphere = new Mesh(geometry, material);
        this.lightSphere.layers.set(OCCLUSION_LAYER)
        this.scene.add(this.lightSphere);

        this.camera.position.z = 8;
        this.controls.update();

        this.shaderUniforms.exposure.value = 0.08;
        this.shaderUniforms.decay.value = 0.975;
        this.shaderUniforms.density.value = 0.8;
        this.shaderUniforms.weight.value = 0.6;
        this.shaderUniforms.samples.value = 140;

    }

    protected buildGUI() {
        super.buildGUI();

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

        let resetScene = async () => {
            let icosahedronGroupScene = await this.icosahedronGroupScene;

            this.gui.revert(tempgui);
            this.camera.position.set(0, 0, 8);
            icosahedronGroupScene.position.set(0,0,4)
            icosahedronGroupScene.rotation.x = 0;
            icosahedronGroupScene.rotation.z = 0;
            this.angle = 0;
            this.controls.update();
        };

        let resetSliders = () => {
            this.gui.revert(tempgui);
        };

        let resetPosition = async () => {
            let icosahedronGroupScene = await this.icosahedronGroupScene
            this.camera.position.set(0, 0, 8);
            icosahedronGroupScene.position.set(0,0,4)
            this.angle = 0;
            icosahedronGroupScene.rotation.x = 0;
            icosahedronGroupScene.rotation.z = 0;
            this.controls.update();
        };
        let resetFolder = this.gui.addFolder("Scene management")
        resetFolder.add({resetSliders}, 'resetSliders')
        resetFolder.add({resetPosition}, 'resetPosition')
        resetFolder.add({resetScene}, 'resetScene')
        resetFolder.add(this, "animationEnabled")
        resetFolder.open()

    }

    public update() {
        if (!this.loadFinished) {
            this.loadingScreen.update();
        } else {
            if (!this.animationEnabled) {
                return super.update();
            }
            var radius = 4,
                xpos = Math.sin(this.angle) * radius,
                zpos = Math.cos(this.angle) * radius;

            this.icosahedronGroupScene.then(icosahedronGroupScene => {
                icosahedronGroupScene.position.set(xpos, 0, zpos)
                icosahedronGroupScene.rotation.x += 0.01;
                icosahedronGroupScene.rotation.z += 0.005;
            });

            this.angle += 0.009;
        }
    }
}
