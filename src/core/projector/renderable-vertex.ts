import * as THREE from "three";

export class RenderableVertex {
    private position = new THREE.Vector3();
    private positionWorld = new THREE.Vector3();
    private positionScreen = new THREE.Vector4();

    private visible = true;

    public copy ( vertex ) {
        this.positionWorld.copy( vertex.positionWorld );
        this.positionScreen.copy( vertex.positionScreen );
    }
}
