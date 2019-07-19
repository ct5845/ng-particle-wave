import {RenderList} from "./renderable-list";
import {
    BackSide,
    BufferGeometry, DoubleSide, FrontSide, Frustum, Geometry, Light, Line, LineSegments, Matrix3, Matrix4, Mesh, Points,
    Sprite, Vector3,
    Vector4, VertexColors
} from "three";
import {RenderableObject} from "./renderable-object";
import {RenderableSprite} from "./renderable-sprite";

function painterSort(a, b) {
    if (a.renderOrder !== b.renderOrder) {
        return a.renderOrder - b.renderOrder;
    } else if (a.z !== b.z) {
        return b.z - a.z;
    } else if (a.id !== b.id) {
        return a.id - b.id;
    } else {
        return 0;
    }
}

export class Projector {
    public renderList = new RenderList();

    private _object;
    private _objectCount;
    private _objectPool = [];
    private _objectPoolLength = 0;

    private _sprite;
    private _spriteCount;
    private _spritePool = [];
    private _spritePoolLength = 0;

    private _vector3 = new Vector3();
    private _vector4 = new Vector4();

    private _viewMatrix = new Matrix4();

    private _normalMatrix = new Matrix3();
    private _frustum: any = new Frustum();
    private _clippedVertex1PositionScreen = new Vector4();
    private _clippedVertex2PositionScreen = new Vector4();

    projectVector = function (vector, camera) {
        console.warn('THREE.Projector: .projectVector() is now vector.project().');
        vector.project(camera);
    };

    unprojectVector = function (vector, camera) {
        console.warn('THREE.Projector: .unprojectVector() is now vector.unproject().');
        vector.unproject(camera);
    };

    pickingRay = function () {
        console.error('THREE.Projector: .pickingRay() is now raycaster.setFromCamera().');
    };

    projectScene(scene, camera, sortObjects, sortElements) {
        this.renderList._faceCount = 0;
        this.renderList._lineCount = 0;
        this._spriteCount = 0;

        this.renderList._renderData.elements.length = 0;

        if (scene.autoUpdate === true) scene.updateMatrixWorld();
        if (camera.parent === null) camera.updateMatrixWorld();

        this._viewMatrix.copy(camera.matrixWorldInverse);
        this.renderList._viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, this._viewMatrix);

        this._frustum.setFromMatrix(this.renderList._viewProjectionMatrix);

        this._objectCount = 0;

        this.renderList._renderData.objects.length = 0;
        this.renderList._renderData.lights.length = 0;

        this.projectObject(scene);

        if (sortObjects === true) {
            this.renderList._renderData.objects.sort(painterSort);
        }

        let objects = this.renderList._renderData.objects;

        for (let o = 0, ol = objects.length; o < ol; o++) {

            let object = objects[o].object;
            let geometry = object.geometry;

            this.renderList.setObject(object);

            this.renderList._modelMatrix = object.matrixWorld;

            this.renderList._vertexCount = 0;

            if (object instanceof Mesh) {

                if (geometry instanceof BufferGeometry) {
                    let attributes: any = geometry.attributes;
                    let groups = geometry.groups;

                    if (attributes.position === undefined) continue;

                    let positions = attributes.position.array;

                    for (let i = 0, l = positions.length; i < l; i += 3) {

                        this.renderList.pushVertex(positions[i], positions[i + 1], positions[i + 2]);

                    }

                    if (attributes.normal !== undefined) {

                        let normals = attributes.normal.array;

                        for (let i = 0, l = normals.length; i < l; i += 3) {

                            this.renderList.pushNormal(normals[i], normals[i + 1], normals[i + 2]);

                        }

                    }

                    if (attributes.uv !== undefined) {

                        let uvs = attributes.uv.array;

                        for (let i = 0, l = uvs.length; i < l; i += 2) {

                            this.renderList.pushUv(uvs[i], uvs[i + 1]);

                        }

                    }

                    if (geometry.index !== null) {

                        let indices = geometry.index.array;

                        if (groups.length > 0) {

                            for (let g = 0; g < groups.length; g++) {
                                let group = groups[g];

                                for (let i = group.start, l = group.start + group.count; i < l; i += 3) {
                                    this.renderList.pushTriangle(indices[i], indices[i + 1], indices[i + 2]);
                                }
                            }
                        } else {
                            for (let i = 0, l = indices.length; i < l; i += 3) {
                                this.renderList.pushTriangle(indices[i], indices[i + 1], indices[i + 2]);

                            }
                        }

                    } else {
                        for (let i = 0, l = positions.length / 3; i < l; i += 3) {

                            this.renderList.pushTriangle(i, i + 1, i + 2);
                        }
                    }

                } else if (geometry instanceof Geometry) {

                    let vertices = geometry.vertices;
                    let faces = geometry.faces;
                    let faceVertexUvs = geometry.faceVertexUvs[0];

                    this._normalMatrix.getNormalMatrix(this.renderList._modelMatrix);

                    let material: any = object.material;

                    let isMultiMaterial = Array.isArray(material);

                    for (let v = 0, vl = vertices.length; v < vl; v++) {

                        let vertex = vertices[v];

                        this._vector3.copy(vertex);

                        if (material.morphTargets === true) {

                            let morphTargets = geometry.morphTargets;
                            let morphInfluences = object.morphTargetInfluences;

                            for (let t = 0, tl = morphTargets.length; t < tl; t++) {

                                let influence = morphInfluences[t];

                                if (influence === 0) continue;

                                let target = morphTargets[t];
                                let targetVertex = target.vertices[v];

                                this._vector3.x += (targetVertex.x - vertex.x) * influence;
                                this._vector3.y += (targetVertex.y - vertex.y) * influence;
                                this._vector3.z += (targetVertex.z - vertex.z) * influence;

                            }

                        }

                        this.renderList.pushVertex(this._vector3.x, this._vector3.y, this._vector3.z);

                    }

                    for (let f = 0, fl = faces.length; f < fl; f++) {

                        let face = faces[f];

                        material = isMultiMaterial === true
                            ? object.material[face.materialIndex]
                            : object.material;

                        if (material === undefined) continue;

                        let side = material.side;

                        let v1 = this.renderList._vertexPool[face.a];
                        let v2 = this.renderList._vertexPool[face.b];
                        let v3 = this.renderList._vertexPool[face.c];

                        if (this.renderList.checkTriangleVisibility(v1, v2, v3) === false) continue;

                        let visible = this.renderList.checkBackfaceCulling(v1, v2, v3);

                        if (side !== DoubleSide) {

                            if (side === FrontSide && visible === false) continue;
                            if (side === BackSide && visible === true) continue;

                        }

                        this.renderList._face = this.renderList.getNextVertexInPool();

                        this.renderList._face.id = object.id;
                        this.renderList._face.v1.copy(v1);
                        this.renderList._face.v2.copy(v2);
                        this.renderList._face.v3.copy(v3);

                        this.renderList._face.normalModel.copy(face.normal);

                        if (visible === false && (side === BackSide || side === DoubleSide)) {

                            this.renderList._face.normalModel.negate();

                        }

                        this.renderList._face.normalModel.applyMatrix3(this._normalMatrix).normalize();

                        let faceVertexNormals = face.vertexNormals;

                        for (let n = 0, nl = Math.min(faceVertexNormals.length, 3); n < nl; n++) {

                            let normalModel = this.renderList._face.vertexNormalsModel[n];
                            normalModel.copy(faceVertexNormals[n]);

                            if (visible === false && (side === BackSide || side === DoubleSide)) {

                                normalModel.negate();

                            }

                            normalModel.applyMatrix3(this._normalMatrix).normalize();

                        }

                        this.renderList._face.vertexNormalsLength = faceVertexNormals.length;

                        let vertexUvs = faceVertexUvs[f];

                        if (vertexUvs !== undefined) {

                            for (let u = 0; u < 3; u++) {

                                this.renderList._face.uvs[u].copy(vertexUvs[u]);

                            }

                        }

                        this.renderList._face.color = face.color;
                        this.renderList._face.material = material;

                        this.renderList._face.z = (v1.positionScreen.z + v2.positionScreen.z + v3.positionScreen.z) / 3;
                        this.renderList._face.renderOrder = object.renderOrder;

                        this.renderList._renderData.elements.push(this.renderList._face);

                    }

                }

            } else if (object instanceof Line) {

                this.renderList._modelViewProjectionMatrix.multiplyMatrices(this.renderList._viewProjectionMatrix,
                    this.renderList._modelMatrix);

                if (geometry instanceof BufferGeometry) {
                    let attributes: any = geometry.attributes;

                    if (attributes.position !== undefined) {
                        let positions = attributes.position.array;

                        for (let i = 0, l = positions.length; i < l; i += 3) {
                            this.renderList.pushVertex(positions[i], positions[i + 1], positions[i + 2]);
                        }

                        if (attributes.color !== undefined) {
                            let colors = attributes.color.array;

                            for (let i = 0, l = colors.length; i < l; i += 3) {
                                this.renderList.pushColor(colors[i], colors[i + 1], colors[i + 2]);
                            }

                        }

                        if (geometry.index !== null) {
                            let indices = geometry.index.array;

                            for (let i = 0, l = indices.length; i < l; i += 2) {
                                this.renderList.pushLine(indices[i], indices[i + 1]);
                            }

                        } else {
                            let step = object instanceof LineSegments ? 2 : 1;

                            for (let i = 0, l = (positions.length / 3) - 1; i < l; i += step) {
                                this.renderList.pushLine(i, i + 1);
                            }

                        }

                    }

                } else if (geometry instanceof Geometry) {

                    let vertices = geometry.vertices;

                    if (vertices.length === 0) continue;

                    let v1 = this.renderList.getNextVertexInPool();
                    v1.positionScreen.copy(vertices[0]).applyMatrix4(this.renderList._modelViewProjectionMatrix);

                    let step = object instanceof LineSegments ? 2 : 1;

                    for (let v = 1, vl = vertices.length; v < vl; v++) {

                        v1 = this.renderList.getNextVertexInPool();
                        v1.positionScreen.copy(vertices[v]).applyMatrix4(this.renderList._modelViewProjectionMatrix);

                        if ((v + 1) % step > 0) continue;

                        let v2 = this.renderList._vertexPool[this.renderList._vertexCount - 2];

                        this._clippedVertex1PositionScreen.copy(v1.positionScreen);
                        this._clippedVertex2PositionScreen.copy(v2.positionScreen);

                        if (this.renderList.clipLine(this._clippedVertex1PositionScreen, this._clippedVertex2PositionScreen) === true) {

                            // Perform the perspective divide
                            this._clippedVertex1PositionScreen.multiplyScalar(1 / this._clippedVertex1PositionScreen.w);
                            this._clippedVertex2PositionScreen.multiplyScalar(1 / this._clippedVertex2PositionScreen.w);

                            this.renderList._line = this.renderList.getNextLineInPool();

                            this.renderList._line.id = object.id;
                            this.renderList._line.v1.positionScreen.copy(this._clippedVertex1PositionScreen);
                            this.renderList._line.v2.positionScreen.copy(this._clippedVertex2PositionScreen);

                            this.renderList._line.z = Math.max(this._clippedVertex1PositionScreen.z, this._clippedVertex2PositionScreen.z);
                            this.renderList._line.renderOrder = object.renderOrder;

                            this.renderList._line.material = object.material;

                            if (object.material['vertexColors'] === VertexColors) {
                                this.renderList._line.vertexColors[0].copy(geometry.colors[v]);
                                this.renderList._line.vertexColors[1].copy(geometry.colors[v - 1]);

                            }

                            this.renderList._renderData.elements.push(this.renderList._line);
                        }

                    }

                }

            } else if (object instanceof Points) {

                this.renderList._modelViewProjectionMatrix.multiplyMatrices(this.renderList._viewProjectionMatrix,
                    this.renderList._modelMatrix);

                if (geometry instanceof Geometry) {

                    let vertices = geometry.vertices;

                    for (let v = 0, vl = vertices.length; v < vl; v++) {

                        let vertex = vertices[v];

                        this._vector4.set(vertex.x, vertex.y, vertex.z, 1);
                        this._vector4.applyMatrix4(this.renderList._modelViewProjectionMatrix);

                        this.pushPoint(this._vector4, object, camera);
                    }

                } else if (geometry instanceof BufferGeometry) {

                    let attributes: any = geometry.attributes;

                    if (attributes.position !== undefined) {

                        let positions = attributes.position.array;

                        for (let i = 0, l = positions.length; i < l; i += 3) {

                            this._vector4.set(positions[i], positions[i + 1], positions[i + 2], 1);
                            this._vector4.applyMatrix4(this.renderList._modelViewProjectionMatrix);

                            this.pushPoint(this._vector4, object, camera);

                        }

                    }

                }

            } else if (object instanceof Sprite) {

                this._vector4.set(this.renderList._modelMatrix.elements[12],
                    this.renderList._modelMatrix.elements[13],
                    this.renderList._modelMatrix.elements[14], 1);
                this._vector4.applyMatrix4(this.renderList._viewProjectionMatrix);

                this.pushPoint(this._vector4, object, camera);

            }

        }

        if (sortElements === true) {
            this.renderList._renderData.elements.sort(painterSort);
        }

        return this.renderList._renderData;
    };

    private pushPoint(_vector4, object, camera) {

        let invW = 1 / _vector4.w;

        _vector4.z *= invW;

        if (_vector4.z >= -1 && _vector4.z <= 1) {

            this._sprite = this.getNextSpriteInPool();
            this._sprite.id = object.id;
            this._sprite.x = _vector4.x * invW;
            this._sprite.y = _vector4.y * invW;
            this._sprite.z = _vector4.z;
            this._sprite.renderOrder = object.renderOrder;
            this._sprite.object = object;

            this._sprite.rotation = object.rotation;

            this._sprite.scale.x = object.scale.x *
                Math.abs(this._sprite.x - (_vector4.x + camera.projectionMatrix.elements[0]) /
                    (_vector4.w + camera.projectionMatrix.elements[12]));
            this._sprite.scale.y = object.scale.y *
                Math.abs(this._sprite.y - (_vector4.y + camera.projectionMatrix.elements[5]) /
                    (_vector4.w + camera.projectionMatrix.elements[13]));

            this._sprite.material = object.material;

            this.renderList._renderData.elements.push(this._sprite);
        }
    }

    private getNextObjectInPool() {

        if (this._objectCount === this._objectPoolLength) {

            let object = new RenderableObject();
            this._objectPool.push(object);
            this._objectPoolLength++;
            this._objectCount++;
            return object;

        }

        return this._objectPool[this._objectCount++];

    }

    private getNextSpriteInPool() {

        if (this._spriteCount === this._spritePoolLength) {

            let sprite = new RenderableSprite();
            this._spritePool.push(sprite);
            this._spritePoolLength++;
            this._spriteCount++;
            return sprite;

        }

        return this._spritePool[this._spriteCount++];

    }

    private projectObject(object) {
        let material: any = object.material;

        if (object.visible === false) return;

        if (object instanceof Light) {

            this.renderList._renderData.lights.push(object);

        } else if (object instanceof Mesh || object instanceof Line || object instanceof Points) {

            if (material.visible === false) return;
            if (object.frustumCulled === true && this._frustum.intersectsObject(object) === false) return;

            this.addObject(object);

        }
        else if (object instanceof Sprite) {

            if (object.material.visible === false) return;
            if (object.frustumCulled === true && this._frustum.intersectsSprite(object) === false) return;

            this.addObject(object);

        }

        let children = object.children;

        for (let i = 0, l = children.length; i < l; i++) {

            this.projectObject(children[i]);

        }

    }

    private addObject(object) {

        this._object = this.getNextObjectInPool();
        this._object.id = object.id;
        this._object.object = object;

        this._vector3.setFromMatrixPosition(object.matrixWorld);
        this._vector3.applyMatrix4(this.renderList._viewProjectionMatrix);
        this._object.z = this._vector3.z;
        this._object.renderOrder = object.renderOrder;

        this.renderList._renderData.objects.push(this._object);
    }

}
