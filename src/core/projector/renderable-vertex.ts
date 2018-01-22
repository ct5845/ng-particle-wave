import {Vector3, Vector4} from 'three';

export class RenderableVertex {
    private position = new Vector3();
    private positionWorld = new Vector3();
    private positionScreen = new Vector4();

    private visible = true;

    public copy ( vertex ) {
        this.positionWorld.copy( vertex.positionWorld );
        this.positionScreen.copy( vertex.positionScreen );
    }
}
