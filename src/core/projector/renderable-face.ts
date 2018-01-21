import {RenderableVertex} from "./renderable-vertex";
import * as THREE from "three";

export class RenderableFace {
    public id = 0;
    public v1 = new RenderableVertex();
    public v2 = new RenderableVertex();
    public v3 = new RenderableVertex();

    public normalModel = new THREE.Vector3();

    public vertexNormalsModel = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    public vertexNormalsLength = 0;

    public color = new THREE.Color();
    public material = null;
    public uvs = [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()];

    public z = 0;
    public renderOrder = 0;
}
