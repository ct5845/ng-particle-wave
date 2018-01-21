import * as THREE from "three";
import {RenderableVertex} from "./renderable-vertex";

export class RenderableLine {
    public id = 0;

    public v1 = new RenderableVertex();
    public v2 = new RenderableVertex();

    public vertexColors = [new THREE.Color(), new THREE.Color()];
    public material = null;

    public z = 0;
    public renderOrder = 0;

}
