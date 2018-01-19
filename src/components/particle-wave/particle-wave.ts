import {Component, ElementRef, Input} from '@angular/core';

declare let THREE: any;

@Component({
    selector: 'particle-wave',
    templateUrl: 'particle-wave.html'
})
export class ParticleWaveComponent {
    @Input() public amountX: number = 30;
    @Input() public amountY: number = 30;
    @Input() public fov: number = 75;
    @Input() public far: number = 10000;
    @Input() public particleColor = 0xB8F6FF;
    @Input() public backgroundColor = 0xffffff;

    private separation = 100;

    private container: Element;
    private camera: any;
    private scene: any;
    private renderer: any;

    private particles: any[];

    private count = 0;

    private width: number;
    private height: number;
    private halfWidth: number;
    private halfHeight: number;
    private aspectRatio: number;

    constructor(private element: ElementRef) {
    }

    ngAfterViewInit() {
        this.container = this.element.nativeElement;

        this.calculateMeasures();

        this.camera = new THREE.PerspectiveCamera(this.fov, this.aspectRatio, 1, this.far);
        this.camera.position.z = 1500;
        this.camera.position.x = -15;
        this.camera.position.y = 500;

        this.scene = new THREE.Scene();
        this.camera.lookAt(this.scene.position);

        this.initParticles();

        this.renderer = new THREE.CanvasRenderer();
        this.renderer.setClearColor(this.backgroundColor, 1);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.container.appendChild(this.renderer.domElement);

        this.animate();

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
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
        let material = new THREE.SpriteCanvasMaterial({
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
                let particle = this.particles[ i++ ] = new THREE.Sprite(material);
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


