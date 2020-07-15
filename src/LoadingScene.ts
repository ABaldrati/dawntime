import {
    AmbientLight, Clock,
    DoubleSide,
    FontLoader,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    SphereBufferGeometry,
    TextGeometry,
    TextureLoader,
    Vector3
} from "three";
import {LOADING_LAYER, renderer} from "./index";
import {AbstractScene} from "./AbstractScene";
import spinnerImage from "../images/circle-notch-solid.png";
import logoImage from "../images/logo.png";
import optimerRegular from "three/examples/fonts/optimer_regular.typeface.json";

export class LoadingScene extends AbstractScene {
    private static instance: Promise<LoadingScene>;

    private spinner: Mesh = undefined as any as Mesh;
    private angle: number = 0;
    private clock: Clock;

    private constructor() {
        super(new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 350))
        this.camera.layers.set(LOADING_LAYER);
        this.cameraInitialPosition = new Vector3(0, 0, 1);
        this.controls.enabled = false;
        this.clock = new Clock();
    }

    static async getInstance(): Promise<LoadingScene> {
        if (!LoadingScene.instance) {
            let scene = new LoadingScene();
            LoadingScene.instance = scene.buildScene();
        } else {
            let loading = await LoadingScene.instance
            loading.buildGUI();
            loading.resetScene();
        }

        return LoadingScene.instance;
    }

    public render() {
        this.camera.layers.set(LOADING_LAYER);
        renderer.render(this.scene, this.camera)
    }

    protected async buildScene(): Promise<LoadingScene> {
        let loadingPlaneGeometry = new PlaneGeometry(10, 10);

        let loadingPlaneMaterial = new MeshBasicMaterial({color: "hsl(0,0%,0%)", side: DoubleSide});
        let loadingPlane = new Mesh(loadingPlaneGeometry, loadingPlaneMaterial);

        let font = await new FontLoader().loadAsync(optimerRegular);
        let textGeometry = new TextGeometry('Loading...', {
            font,
            size: 0.1,
            height: 0.0001,
        });

        let textMesh = new Mesh(textGeometry, new MeshBasicMaterial({color: "#f5f5f5"}));
        textMesh.layers.set(LOADING_LAYER);
        loadingPlane.add(textMesh);
        textMesh.geometry.center();

        let spinnerTexture = await new TextureLoader().loadAsync(spinnerImage);
        let spinnerPlaneGeometry = new PlaneGeometry(0.1, 0.1);
        let spinnerPlaneMaterial = new MeshBasicMaterial({
            map: spinnerTexture,
        });

        this.spinner = new Mesh(spinnerPlaneGeometry, spinnerPlaneMaterial);
        this.spinner.layers.set(LOADING_LAYER);
        loadingPlane.add(this.spinner);
        this.spinner.position.y = -0.5;
        spinnerPlaneGeometry.center();

        let logoTexture = await new TextureLoader().loadAsync(logoImage);
        let logoPlaneGeometry = new PlaneGeometry(1.07, 0.21);
        let logoPlaneMaterial = new MeshBasicMaterial({map: logoTexture, transparent: true});
        let logoPlane = new Mesh(logoPlaneGeometry, logoPlaneMaterial);
        logoPlane.layers.set(LOADING_LAYER);
        loadingPlane.add(logoPlane);
        logoPlane.position.copy(textMesh.position);
        logoPlane.position.y += 0.3;

        loadingPlane.layers.set(LOADING_LAYER);

        this.scene.add(new AmbientLight("#ffffff"));
        let sphere = new Mesh(new SphereBufferGeometry(4, 10, 10), new MeshBasicMaterial({color: "red"}));
        sphere.layers.set(LOADING_LAYER);
        this.scene.add(sphere)
        this.scene.add(loadingPlane);

        return Promise.resolve(this);
    }

    protected buildGUI() {
    }


    destroyGUI() {
    }

    protected resetSliders() {
    }

    update(): void {
        this.angle = (0.1 * Date.now() / 10**Math.floor(Math.log10(Date.now()))) % (2 * Math.PI);
        this.spinner.rotateZ(this.angle);
    }

}
