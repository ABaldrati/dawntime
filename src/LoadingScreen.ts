import {
    AxesHelper,
    DoubleSide,
    FontLoader,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    TextGeometry,
    TextureLoader
} from "three";
import {LOADING_LAYER} from "./index";
import spinnerImage from "../images/circle-notch-solid.png";
import logoImage from "../images/logo.png";
import optimerRegular from "three/examples/fonts/optimer_regular.typeface.json";

export class LoadingScreen {
    private static instance?: LoadingScreen = undefined;

    public readonly loadingPlane: Mesh;
    private spinner: Promise<Mesh>;
    private angle: number = 0;

    public static getInstance(): LoadingScreen {
        if (!LoadingScreen.instance) {
            LoadingScreen.instance = new LoadingScreen();
        }

        return LoadingScreen.instance;
    }

    private constructor() {
        let loadingPlaneGeometry = new PlaneGeometry(10, 10);

        let loadingPlaneMaterial = new MeshBasicMaterial({color: "hsl(0,0%,0%)", side: DoubleSide});
        let loadingPlane = new Mesh(loadingPlaneGeometry, loadingPlaneMaterial);

        let textPromise = new FontLoader().loadAsync(optimerRegular).then(font => {
            let textGeometry = new TextGeometry('Loading...', {
                font,
                size: 0.1,
                height: 0.0001,
            });

            let textMesh = new Mesh(textGeometry, new MeshBasicMaterial({color: "#f5f5f5"}));
            textMesh.layers.set(LOADING_LAYER);
            loadingPlane.add(textMesh);
            textMesh.geometry.center();

            return textMesh;
        });
        textPromise.catch(console.error);

        this.spinner = new TextureLoader().loadAsync(spinnerImage).then(texture => {
            let spinnerPlaneGeometry = new PlaneGeometry(0.1, 0.1);
            let spinnerPlaneMaterial = new MeshBasicMaterial({
                map: texture,
            });

            let spinnerPlane = new Mesh(spinnerPlaneGeometry, spinnerPlaneMaterial);
            spinnerPlane.layers.set(LOADING_LAYER);
            loadingPlane.add(spinnerPlane);
            spinnerPlane.position.y = -0.5;
            spinnerPlaneGeometry.center();

            return spinnerPlane;
        })

        textPromise.then(textMesh => {
            new TextureLoader().load(logoImage, logoTexture => {
                let logoPlaneGeometry = new PlaneGeometry(1.07, 0.21);
                let logoPlaneMaterial = new MeshBasicMaterial({map: logoTexture, transparent: true});
                let logoPlane = new Mesh(logoPlaneGeometry, logoPlaneMaterial);
                logoPlane.layers.set(LOADING_LAYER);
                loadingPlane.add(logoPlane);
                logoPlane.position.copy(textMesh.position);
                logoPlane.position.y += 0.3;
            }, undefined, console.error);
        })

        loadingPlane.layers.set(LOADING_LAYER);

        this.loadingPlane = loadingPlane;
    }

    update(): void {
        this.angle += 0.01;
        this.spinner.then(s => s.rotateZ(this.angle));
    }
}
