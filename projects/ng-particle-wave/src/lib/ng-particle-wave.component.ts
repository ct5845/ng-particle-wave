import {AfterViewInit, Component, ElementRef, HostListener, Input} from '@angular/core';
import {Color, PerspectiveCamera, Scene, Sprite} from 'three';
import {CanvasRenderer} from '../core/canvas-renderer';
import {SpriteCanvasMaterial} from '../core/sprite-canvas-material';

@Component({
    selector: 'ng-particle-wave',
    template: ``,
    styles: [ `:host {
        display: block;
        overflow: hidden;
    }` ]
})
export class NgParticleWaveComponent implements AfterViewInit {
    @Input() public amountX: number = 30;
    @Input() public amountY: number = 30;
    @Input() public fov: number = 75;
    @Input() public far: number = 10000;
    @Input() public particleColor = '#B8F6FF';
    @Input() public backgroundColor = new Color(255,255,255);
    @Input() public backgroundColorAlpha = 1;

    @Input() public moveWithMouse = false;

    private separation = 100;

    private container: Element;
    private camera: any;
    private scene: any;
    private renderer: any;

    private particles: any[];

    private count = 0;

    private posX;
    private posY;

    private width: number;
    private height: number;
    private halfWidth: number;
    private halfHeight: number;
    private aspectRatio: number;

    constructor(private element: ElementRef) {
    }

    public ngAfterViewInit() {
        this.container = this.element.nativeElement;

        this.calculateMeasures();

        this.camera = new PerspectiveCamera(this.fov, this.aspectRatio, 1, this.far);
        this.camera.position.z = 1500;
        this.camera.position.x = this.posX = -1 * this.halfWidth;
        this.camera.position.y = this.posY = this.halfHeight;

        this.scene = new Scene();

        this.initParticles();

        this.renderer = new CanvasRenderer();
        this.renderer.setClearColor(this.backgroundColor, this.backgroundColorAlpha);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.container.appendChild(this.renderer.domElement);

        this.animate();

        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        setTimeout(() => {
            this.onWindowResize();
        }, 1000);
    }

    @HostListener('mousemove', [ '$event' ])
    public mouseMove($event) {
        if (this.moveWithMouse) {
            this.posY = $event.clientY - this.halfHeight;
            this.posX = $event.clientX - this.halfWidth;
        }
    }

    private calculateMeasures() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.halfHeight = this.height / 2;
        this.halfWidth = this.width / 2;

        this.aspectRatio = this.width / this.height;
    }

    private initParticles() {
        this.particles = [];

        let PI2 = Math.PI * 2;
        let material = new SpriteCanvasMaterial({
            color: this.particleColor,
            program: function (context) {
                context.beginPath();
                context.arc(0, 0, 0.5, 0, PI2, true);
                context.fill();
            }
        });

        let i = 0;

        for (let ix = 0; ix < this.amountX; ix++) {
            for (let iy = 0; iy < this.amountY; iy++) {
                let particle = this.particles[ i++ ] = new Sprite(material);
                particle.position.x = ix * this.separation - ((this.amountX * this.separation) / 2);
                particle.position.z = iy * this.separation - ((this.amountX * this.separation) / 2);
                this.scene.add(particle);
            }
        }
    }

    private animate() {
        requestAnimationFrame(this.animate.bind(this));

        this.render();
    }

    private render() {
        this.camera.position.x = this.posX;
        this.camera.position.y = this.posY;
        this.camera.lookAt(this.scene.position);

        let i = 0;

        for (let ix = 0; ix < this.amountX; ix++) {

            for (let iy = 0; iy < this.amountY; iy++) {

                let particle = this.particles[ i++ ];
                particle.position.y = (Math.sin((ix + this.count) * 0.3) * 50) +
                    (Math.sin((iy + this.count) * 0.5) * 50);
                particle.scale.x = particle.scale.y = (Math.sin((ix + this.count) * 0.3) + 1) * 4 +
                    (Math.sin((iy + this.count) * 0.5) + 1) * 4;

            }

        }

        this.renderer.render(this.scene, this.camera);

        this.count += 0.1;
    }

    private onWindowResize() {
        this.calculateMeasures();

        this.camera.aspect = this.aspectRatio;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
    }

}
