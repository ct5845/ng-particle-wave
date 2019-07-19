import {RenderableLine} from "./renderable-line";
import {Box3, DoubleSide, Matrix3, Matrix4, Vector3, VertexColors} from "three";
import {RenderableFace} from "./renderable-face";
import {RenderableVertex} from "./renderable-vertex";

export class RenderList {
    public normals = [];
    public colors = [];
    public uvs = [];

    public object = null;
    public material = null;

    public normalMatrix = new Matrix3();

    public _vertexCount;
    private _vertexPoolLength = 0;
    public _modelMatrix;
    public _viewProjectionMatrix = new Matrix4();
    private _vertex;
    public _vertexPool = [];
    private _points3 = new Array(3);
    private _clipBox = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
    private _boundingBox = new Box3();
    public _modelViewProjectionMatrix = new Matrix4();
    public _line;
    public _lineCount;
    private _linePool = [];
    private _linePoolLength = 0;
    public _renderData = {objects: [], elements: [], lights: []};
    public _face;
    public _faceCount;
    private _facePool = [];
    private _facePoolLength = 0;

    public setObject(value) {
        this.object = value;
        this.material = value.material;

        this.normalMatrix.getNormalMatrix(value.matrixWorld);

        this.normals.length = 0;
        this.colors.length = 0;
        this.uvs.length = 0;
    }

    public projectVertex(vertex) {
        let position = vertex.position;
        let positionWorld = vertex.positionWorld;
        let positionScreen = vertex.positionScreen;

        positionWorld.copy(position).applyMatrix4(this._modelMatrix);
        positionScreen.copy(positionWorld).applyMatrix4(this._viewProjectionMatrix);

        let invW = 1 / positionScreen.w;

        positionScreen.x *= invW;
        positionScreen.y *= invW;
        positionScreen.z *= invW;

        vertex.visible = positionScreen.x >= -1 && positionScreen.x <= 1 &&
            positionScreen.y >= -1 && positionScreen.y <= 1 &&
            positionScreen.z >= -1 && positionScreen.z <= 1;

    }

    public pushVertex(x, y, z) {
        this._vertex = this.getNextVertexInPool();
        this._vertex.position.set(x, y, z);

        this.projectVertex(this._vertex);
    }

    public pushNormal(x, y, z) {
        this.normals.push(x, y, z);
    }

    public pushColor(r, g, b) {
        this.colors.push(r, g, b);
    }

    public pushUv(x, y) {
        this.uvs.push(x, y);
    }

    public checkTriangleVisibility(v1, v2, v3) {
        if (v1.visible === true || v2.visible === true || v3.visible === true) return true;

        this._points3[0] = v1.positionScreen;
        this._points3[1] = v2.positionScreen;
        this._points3[2] = v3.positionScreen;

        return this._clipBox.intersectsBox(this._boundingBox.setFromPoints(this._points3));

    }

    public checkBackfaceCulling(v1, v2, v3) {
        return ((v3.positionScreen.x - v1.positionScreen.x) *
            (v2.positionScreen.y - v1.positionScreen.y) -
            (v3.positionScreen.y - v1.positionScreen.y) *
            (v2.positionScreen.x - v1.positionScreen.x)) < 0;
    }

    public pushLine(a, b) {

        let v1 = this._vertexPool[a];
        let v2 = this._vertexPool[b];

        // Clip

        v1.positionScreen.copy(v1.position).applyMatrix4(this._modelViewProjectionMatrix);
        v2.positionScreen.copy(v2.position).applyMatrix4(this._modelViewProjectionMatrix);

        if (this.clipLine(v1.positionScreen, v2.positionScreen) === true) {

            // Perform the perspective divide
            v1.positionScreen.multiplyScalar(1 / v1.positionScreen.w);
            v2.positionScreen.multiplyScalar(1 / v2.positionScreen.w);

            this._line = this.getNextLineInPool();
            this._line.id = this.object.id;
            this._line.v1.copy(v1);
            this._line.v2.copy(v2);
            this._line.z = Math.max(v1.positionScreen.z, v2.positionScreen.z);
           this._line.renderOrder = this.object.renderOrder;

            this._line.material = this.object.material;

            if (this.object.material.vertexColors === VertexColors) {

                this._line.vertexColors[0].fromArray(this.colors, a * 3);
                this._line.vertexColors[1].fromArray(this.colors, b * 3);

            }

            this._renderData.elements.push(this._line);
        }

    }

    public pushTriangle(a, b, c) {
        let v1 = this._vertexPool[a];
        let v2 = this._vertexPool[b];
        let v3 = this._vertexPool[c];

        if (this.checkTriangleVisibility(v1, v2, v3) === false) return;

        if (this.material.side === DoubleSide || this.checkBackfaceCulling(v1, v2, v3) === true) {

            this._face = this.getNextFaceInPool();
            this._face.id = this.object.id;
            this._face.v1.copy(v1);
            this._face.v2.copy(v2);
            this._face.v3.copy(v3);
            this._face.z = (v1.positionScreen.z + v2.positionScreen.z + v3.positionScreen.z) / 3;
            this._face.renderOrder = this.object.renderOrder;

            // use first vertex normal as face normal

            this._face.normalModel.fromArray(this.normals, a * 3);
            this._face.normalModel.applyMatrix3(this.normalMatrix).normalize();

            for (let i = 0; i < 3; i++) {

                let normal = this._face.vertexNormalsModel[i];
                normal.fromArray(this.normals, arguments[i] * 3);
                normal.applyMatrix3(this.normalMatrix).normalize();

                let uv = this._face.uvs[i];
                uv.fromArray(this.uvs, arguments[i] * 2);

            }

            this._face.vertexNormalsLength = 3;

            this._face.material = this.object.material;

            this._renderData.elements.push(this._face);
        }
    }

    public getNextVertexInPool() {
        if (this._vertexCount === this._vertexPoolLength) {

            let vertex = new RenderableVertex();
            this._vertexPool.push(vertex);
            this._vertexPoolLength++;
            this._vertexCount++;
            return vertex;

        }

        return this._vertexPool[this._vertexCount++];
    }

    public clipLine(s1, s2) {

        let alpha1 = 0, alpha2 = 1,

            // Calculate the boundary coordinate of each vertex for the near and far clip planes,
            // Z = -1 and Z = +1, respectively.

            bc1near = s1.z + s1.w,
            bc2near = s2.z + s2.w,
            bc1far = -s1.z + s1.w,
            bc2far = -s2.z + s2.w;

        if (bc1near >= 0 && bc2near >= 0 && bc1far >= 0 && bc2far >= 0) {

            // Both vertices lie entirely within all clip planes.
            return true;

        } else if ((bc1near < 0 && bc2near < 0) || (bc1far < 0 && bc2far < 0)) {

            // Both vertices lie entirely outside one of the clip planes.
            return false;

        } else {

            // The line segment spans at least one clip plane.

            if (bc1near < 0) {

                // v1 lies outside the near plane, v2 inside
                alpha1 = Math.max(alpha1, bc1near / (bc1near - bc2near));

            } else if (bc2near < 0) {

                // v2 lies outside the near plane, v1 inside
                alpha2 = Math.min(alpha2, bc1near / (bc1near - bc2near));

            }

            if (bc1far < 0) {

                // v1 lies outside the far plane, v2 inside
                alpha1 = Math.max(alpha1, bc1far / (bc1far - bc2far));

            } else if (bc2far < 0) {

                // v2 lies outside the far plane, v2 inside
                alpha2 = Math.min(alpha2, bc1far / (bc1far - bc2far));

            }

            if (alpha2 < alpha1) {

                // The line segment spans two boundaries, but is outside both of them.
                // (This can't happen when we're only clipping against just near/far but good
                //  to leave the check here for future usage if other clip planes are added.)
                return false;

            } else {

                // Update the s1 and s2 vertices to match the clipped line segment.
                s1.lerp(s2, alpha1);
                s2.lerp(s1, 1 - alpha2);

                return true;

            }

        }

    }

    public getNextLineInPool() {
        if (this._lineCount === this._linePoolLength) {

            let line = new RenderableLine();
            this._linePool.push(line);
            this._linePoolLength++;
            this._lineCount++;
            return line;

        }

        return this._linePool[this._lineCount++];
    }

    private getNextFaceInPool() {
        if (this._faceCount === this._facePoolLength) {

            let face = new RenderableFace();
            this._facePool.push(face);
            this._facePoolLength++;
            this._faceCount++;
            return face;

        }

        return this._facePool[this._faceCount++];
    }
}
