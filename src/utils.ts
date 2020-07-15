import {loader} from "./index";
import {GLTF} from "three/examples/jsm/loaders/GLTFLoader";

export function loadModel(path: string, onProgress: (event: ProgressEvent) => void = () => {
}): Promise<GLTF> {
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
