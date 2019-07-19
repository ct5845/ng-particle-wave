import {Color, Vector2, Vector3} from 'three';
import {RenderableVertex} from "./renderable-vertex";

export class RenderableFace {
    public id = 0;
    public v1 = new RenderableVertex();
    public v2 = new RenderableVertex();
    public v3 = new RenderableVertex();

    public normalModel: any = new Vector3();

    public vertexNormalsModel: any[] = [new Vector3(), new Vector3(), new Vector3()];
    public vertexNormalsLength = 0;

    public color: Color = new Color();
    public material = null;
    public uvs = [new Vector2(), new Vector2(), new Vector2()];

    public z = 0;
    public renderOrder = 0;
}
