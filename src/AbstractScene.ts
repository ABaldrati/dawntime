import {LinearFilter, PerspectiveCamera, RGBFormat, Scene, Vector3, WebGLRenderTarget} from "three";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {blendingShader, occlusionShader, renderer} from "./index";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";
import {HorizontalBlurShader} from "three/examples/jsm/shaders/HorizontalBlurShader";
import {VerticalBlurShader} from "three/examples/jsm/shaders/VerticalBlurShader";
import {CopyShader} from "three/examples/jsm/shaders/CopyShader";
import {GUI} from "dat.gui";
import {LoadingScreen} from "./LoadingScreen";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

export abstract class AbstractScene {
    protected scene: Scene;
    protected gui: GUI = undefined as any as GUI;
    protected shaderUniforms: any = {}
    protected occlusionComposer: EffectComposer;
    protected sceneComposer: EffectComposer;
    protected lightPassScale = 0.5;
    protected loadingScreen: LoadingScreen;
    protected cameraInitialPosition = new Vector3();
    protected initialGUI: GUI = undefined as any as GUI;
    protected controls: OrbitControls;

    protected constructor(protected camera: PerspectiveCamera) {
        this.scene = new Scene();
        this.controls = new OrbitControls(this.camera, renderer.domElement);
        [this.occlusionComposer, this.sceneComposer] = this.composeEffects();
        this.loadingScreen = LoadingScreen.getInstance();
    }

    public abstract render(): void;

    public update(): void {
    }

    public destroyGUI() {
        this.gui.destroy();
    }

    public updateSize(width: number, height: number) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.occlusionComposer.setSize(width * this.lightPassScale, height * this.lightPassScale);
        this.sceneComposer.setSize(width, height)
    }

    protected abstract buildScene(): void;

    protected buildGUI() {
        this.gui = new GUI();
        let lightPassFolder = this.gui.addFolder("Light Pass Render Image");
        let lightPassSlider = lightPassFolder.add(this, "lightPassScale", 0, 1, 0.01).name("Light pass scale")
        lightPassFolder.open();

        lightPassSlider.onChange(() => {
            this.occlusionComposer.setSize(window.innerWidth * this.lightPassScale, window.innerHeight * this.lightPassScale);
        })

    }

    protected composeEffects() {
        const renderTargetParameters = {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            format: RGBFormat,
            stencilBuffer: false
        };
        let occlusionRenderTarget = new WebGLRenderTarget(window.innerWidth * this.lightPassScale, window.innerHeight * this.lightPassScale, renderTargetParameters)

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

    protected resetScene() {
        this.resetSliders()
        this.resetPosition();
    }

    protected resetSliders() {
        this.gui.revert(this.initialGUI);
    }

    protected resetPosition() {
        this.camera.position.copy(this.cameraInitialPosition)
        this.controls.update();
    }
}
