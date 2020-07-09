import {loader, LOADING_LAYER} from "./index";
import {GLTF} from "three/examples/jsm/loaders/GLTFLoader";
import {AxesHelper, DoubleSide, FontLoader, Mesh, MeshBasicMaterial, PlaneGeometry, TextGeometry} from "three";
import optimerRegular from "three/examples/fonts/optimer_regular.typeface.json";

export function loadModel(path: string, onProgress: (event: ProgressEvent) => void = () => {}): Promise<GLTF> {
    return new Promise(((resolve, reject) => {
        loader.load(path, gltf => {
            resolve(gltf);
        },
        onProgress,
        error => {
            reject(error);
        });
    }))
}

export function buildLoadingScreen(): Mesh {
    let loadingPlaneGeometry = new PlaneGeometry(10, 10);

    let loadingPlaneMaterial = new MeshBasicMaterial({color: "hsl(0,0%,0%)", side: DoubleSide});
    let loadingPlane = new Mesh(loadingPlaneGeometry, loadingPlaneMaterial);

    new FontLoader().load(optimerRegular, font => {
        let textGeometry = new TextGeometry('Loading...', {
            font,
            size: 0.1,
            height: 0.0001,
        });

        let textMesh = new Mesh(textGeometry, new MeshBasicMaterial({color: "#f5f5f5"}));
        textMesh.layers.set(LOADING_LAYER);
        loadingPlane.add(textMesh);
        textMesh.geometry.center();
    }, undefined, console.log);

    loadingPlane.add(new AxesHelper(10));
    loadingPlane.layers.set(LOADING_LAYER);

    return loadingPlane;
}
