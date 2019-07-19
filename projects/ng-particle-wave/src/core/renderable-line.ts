import {Color} from 'three';
import {RenderableVertex} from "./renderable-vertex";

export class RenderableLine {
    public id = 0;

    public v1 = new RenderableVertex();
    public v2 = new RenderableVertex();

    public vertexColors: any[] = [new Color(), new Color()];
    public material = null;

    public z = 0;
    public renderOrder = 0;

}
