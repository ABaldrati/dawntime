import icosahedronFile from "../models/icosahedron/scene.gltf";
import {
    AmbientLight,
    AxesHelper, Group,
    Mesh,
    MeshBasicMaterial, MeshPhysicalMaterial,
    PerspectiveCamera,
    PointLight, Scene,
    SphereBufferGeometry, Vector3
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {DEFAULT_LAYER, loader, OCCLUSION_LAYER, renderer, updateShaderLightPosition} from "./index";
import {AbstractScene} from "./AbstractScene";
import {GUI} from "dat.gui";

export class IcosahedronScene extends AbstractScene {
    private static instance: IcosahedronScene;
    private controls: OrbitControls;
    private pointLight: PointLight;
    private lightSphere: Mesh;
    private icosahedronGroupScene: Group;
    private angle: number;
    private animationEnabled: boolean;


    private constructor() {
        super(new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 35))
        this.controls = new OrbitControls(this.camera, renderer.domElement);
        this.pointLight = undefined as any as PointLight;
        this.lightSphere = undefined as any as Mesh;
        this.icosahedronGroupScene = undefined as any as Group;
        this.angle = 0;
        this.animationEnabled = true;
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
        this.controls.update();
        updateShaderLightPosition(this.lightSphere, this.camera, this.shaderUniforms)

        this.camera.layers.set(OCCLUSION_LAYER);
        renderer.setClearColor("#080808")

        this.occlusionComposer.render();
        this.camera.layers.set(DEFAULT_LAYER);
        renderer.setClearColor("#000000");

        this.sceneComposer.render();
    }

    protected buildScene() {
        let firstObject = true;
        let occlusionMaterial = new MeshBasicMaterial({color: "#000000"});
        let firstIcosahedronMaterial = new MeshPhysicalMaterial({color: "#ff0000"});
        let secondIcosahedronMaterial = new MeshPhysicalMaterial({color: "#0f45ec"});

        loader.load(icosahedronFile, icosahedron => {
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
            this.icosahedronGroupScene = icosahedron.scene
            icosahedron.scene.position.z = 4;
        }, undefined, error => {
            console.error(error);
        });


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
        this.gui = new GUI();
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
            this.camera.position.set(0, 0, 8);
            this.icosahedronGroupScene.position.set(0,0,4)
            this.icosahedronGroupScene.rotation.x = 0;
            this.icosahedronGroupScene.rotation.z = 0;
            this.angle = 0;
            this.controls.update();
        };

        let resetSliders = () => {
            this.gui.revert(tempgui);
        };

        let resetPosition = () => {
            this.camera.position.set(0, 0, 8);
            this.icosahedronGroupScene.position.set(0,0,4)
            this.angle = 0;
            this.icosahedronGroupScene.rotation.x = 0;
            this.icosahedronGroupScene.rotation.z = 0;
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
        if (!this.animationEnabled) {
            return super.update();
        }
        var radius = 4,
            xpos = Math.sin(this.angle) * radius,
            zpos = Math.cos(this.angle) * radius;

        this.icosahedronGroupScene.position.set(xpos, 0, zpos)
        this.icosahedronGroupScene.rotation.x += 0.01;
        this.icosahedronGroupScene.rotation.z += 0.005;
        this.angle += 0.009;
    }
}
