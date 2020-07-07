import {Camera, LinearFilter, RGBFormat, Scene, WebGLRenderTarget} from "three";
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
    protected gui: GUI;
    protected shaderUniforms: any = {}

    constructor(protected camera: Camera) {
        this.scene = new Scene();
        this.gui = new GUI();
    }

    public abstract render(): void;

    public destroyGUI() {
        this.gui.destroy();
    }

    protected abstract buildScene(): void;

    protected buildGUI() {}

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