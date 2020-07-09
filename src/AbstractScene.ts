import {Camera, LinearFilter, PerspectiveCamera, RGBFormat, Scene, WebGLRenderTarget} from "three";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {blendingShader, occlusionShader, renderer} from "./index";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";
import {HorizontalBlurShader} from "three/examples/jsm/shaders/HorizontalBlurShader";
import {VerticalBlurShader} from "three/examples/jsm/shaders/VerticalBlurShader";
import {CopyShader} from "three/examples/jsm/shaders/CopyShader";
import {GUI} from "dat.gui";

export abstract class AbstractScene {
    protected scene: Scene;
    protected gui: GUI = undefined as any as GUI;
    protected shaderUniforms: any = {}
    protected occlusionComposer: EffectComposer;
    protected sceneComposer: EffectComposer;

    protected constructor(protected camera: PerspectiveCamera) {
        this.scene = new Scene();
        [this.occlusionComposer, this.sceneComposer] = this.composeEffects()
    }

    public abstract render(): void;

    public update(): void {}

    public destroyGUI() {
        this.gui.destroy();
    }

    public updateSize(width: number, height: number) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.occlusionComposer.setSize(width * 0.5, height * 0.5);
        this.sceneComposer.setSize(width, height)
    }

    protected abstract buildScene(): void;

    protected buildGUI() {
        this.gui = new GUI();
    }

    protected composeEffects() {
        const renderTargetParameters = {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            format: RGBFormat,
            stencilBuffer: false
        };
        let occlusionRenderTarget = new WebGLRenderTarget(window.innerWidth / 2, window.innerHeight / 2, renderTargetParameters)

        let occlusionComposer = new EffectComposer(renderer, occlusionRenderTarget);
        occlusionComposer.addPass(new RenderPass(this.scene, this.camera));

        let scatteringPass = new ShaderPass(occlusionShader);
        this.shaderUniforms = scatteringPass.uniforms;
        occlusionComposer.addPass(scatteringPass);

        let horizontalBlurPass = new ShaderPass(HorizontalBlurShader);
        horizontalBlurPass.uniforms.h.value = 0.4 / occlusionRenderTarget.height;
        // occlusionComposer.addPass(horizontalBlurPass);

        let verticalBlurPass = new ShaderPass(VerticalBlurShader);
        verticalBlurPass.uniforms.v.value = 0.4 / occlusionRenderTarget.width;
        // occlusionComposer.addPass(verticalBlurPass);

        let finalPass = new ShaderPass(CopyShader);
        occlusionComposer.addPass(finalPass);

        let sceneComposer = new EffectComposer(renderer);
        sceneComposer.addPass(new RenderPass(this.scene, this.camera));

        let blendingPass = new ShaderPass(blendingShader);
        blendingPass.uniforms.tOcclusion.value = occlusionRenderTarget.texture;
        blendingPass.renderToScreen = true;
        sceneComposer.addPass(blendingPass);

        return [occlusionComposer, sceneComposer]
    }
}
