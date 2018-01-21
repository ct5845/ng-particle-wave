import {Color, Material} from "three";

export class SpriteCanvasMaterial extends Material {
    public color;
    public program;

    public isSpriteCanvasMaterial = true;

    constructor(parameters?) {
        super();

        this.type = 'SpriteCanvasMaterial';
        this.color = new Color( 0xffffff );
        this.program = function () {};

        this.setValues( parameters );
    }

    public clone(): any {
        let material = new SpriteCanvasMaterial();

        material.copy(this);
        material.color.copy(this.color);
        material.program = this.program;

        return material;
    }
}
