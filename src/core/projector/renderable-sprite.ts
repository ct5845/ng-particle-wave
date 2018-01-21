import * as THREE from "three";

export class RenderableSprite {

    public id = 0;

    public object = null;

    public x = 0;
    public y = 0;
    public z = 0;

    public rotation = 0;
    public scale = new THREE.Vector2();

    public material = null;
    public renderOrder = 0;

}
