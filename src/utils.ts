import {loader} from "./index";
import {GLTF} from "three/examples/jsm/loaders/GLTFLoader";

export function loadModel(path: string): Promise<GLTF> {
    return new Promise(((resolve, reject) => {
        loader.load(path, gltf => {
            resolve(gltf);
        }, undefined, error => {
            reject(error);
        });
    }))
}
