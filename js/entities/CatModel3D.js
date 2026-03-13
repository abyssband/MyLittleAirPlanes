// ===== 3D Cat Airplane Model =====
// Supports loading GLB model from AI-generated 3D (primary)
// Falls back to procedural chibi cat if GLB not found
// Renders to offscreen canvas for 2D game compositing

export class CatModel3D {
    constructor(size = 256) {
        this.size = size;
        this.ready = false;
        this.time = 0;

        // Expression
        this.expression = 'idle';
        this.wingAngle = 0;

        // Blink
        this.blinkTimer = 0;
        this.blinkInterval = 3 + Math.random() * 2;
        this.isBlinking = false;
        this.blinkDuration = 0.13;

        // Eye textures (procedural)
        this.eyeCanvases = {};
        this.eyeMaterials = {};
        this.currentEyeType = '';

        // GLB model refs
        this.glbModel = null;
        this.mixer = null; // AnimationMixer if GLB has animations

        // Mode: 'glb' or 'procedural'
        this.mode = 'procedural';

        this._init();
    }

    _init() {
        const T = window.THREE;
        if (!T) { console.warn('Three.js not loaded'); return; }

        // Offscreen renderer
        this.renderer = new T.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: false });
        this.renderer.setSize(this.size, this.size);
        this.renderer.setClearColor(0x000000, 0);
        this.canvas = this.renderer.domElement;

        this.scene = new T.Scene();

        // Orthographic camera
        const frustum = 3.0;
        this.camera = new T.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.1, 100);
        this.camera.position.set(0, 0.2, 8);
        this.camera.lookAt(0, 0.1, 0);

        // Warm lighting
        this.scene.add(new T.AmbientLight(0xfff5ec, 0.85));
        const key = new T.DirectionalLight(0xfffaf0, 0.9);
        key.position.set(3, 4, 5);
        this.scene.add(key);
        const rim = new T.DirectionalLight(0xc0d8ff, 0.35);
        rim.position.set(-3, 2, -3);
        this.scene.add(rim);
        const fill = new T.DirectionalLight(0xffe8d8, 0.2);
        fill.position.set(0, -2, 3);
        this.scene.add(fill);

        // Try loading GLB model first
        this._tryLoadGLB(T);
    }

    // ========================
    // GLB MODEL LOADING
    // ========================
    _tryLoadGLB(T) {
        const GLTFLoader = T.GLTFLoader || (window.THREE && window.THREE.GLTFLoader);

        if (!GLTFLoader) {
            console.log('[CatModel3D] GLTFLoader not available, using procedural model');
            this._initProcedural(T);
            return;
        }

        const loader = new GLTFLoader();
        const modelPath = 'assets/models/cat_airplane.glb';

        loader.load(
            modelPath,
            (gltf) => {
                console.log('[CatModel3D] ✅ GLB model loaded!');
                this.mode = 'glb';
                this.glbModel = gltf.scene;

                // Auto-fit model to view
                this._fitModelToView(T, this.glbModel);

                // Apply toon-style materials to all meshes
                this.glbModel.traverse((child) => {
                    if (child.isMesh) {
                        // Keep original textures but enhance
                        if (child.material) {
                            child.material.side = T.DoubleSide;
                        }
                    }
                });

                this.catGroup = new T.Group();
                this.catGroup.add(this.glbModel);
                this.catGroup.rotation.y = -0.3;
                this.scene.add(this.catGroup);

                // Setup animations if available
                if (gltf.animations && gltf.animations.length > 0) {
                    this.mixer = new T.AnimationMixer(this.glbModel);
                    gltf.animations.forEach(clip => {
                        this.mixer.clipAction(clip).play();
                    });
                    console.log(`[CatModel3D] Playing ${gltf.animations.length} animation(s)`);
                }

                this.ready = true;
            },
            (progress) => {
                // Loading progress
            },
            (error) => {
                console.log('[CatModel3D] GLB not found, using procedural model');
                this._initProcedural(T);
            }
        );
    }

    _fitModelToView(T, model) {
        // Calculate bounding box and scale to fit camera
        const box = new T.Box3().setFromObject(model);
        const size = box.getSize(new T.Vector3());
        const center = box.getCenter(new T.Vector3());

        // Scale to fit ~4 units
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.5 / maxDim;
        model.scale.setScalar(scale);

        // Center
        model.position.sub(center.multiplyScalar(scale));
        model.position.y -= 0.2; // Slight offset down
    }

    // ========================
    // PROCEDURAL FALLBACK
    // ========================
    _initProcedural(T) {
        this.mode = 'procedural';
        this._generateEyeTextures(T);
        this.catGroup = new T.Group();
        this._buildCat(T);
        this.scene.add(this.catGroup);
        this.ready = true;
    }

    // ========================
    // PROCEDURAL EYE TEXTURES
    // ========================
    _generateEyeTextures(T) {
        const size = 256;
        ['idle', 'happy', 'excited', 'worried', 'blink'].forEach(name => {
            const canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            this._drawEye(canvas.getContext('2d'), size, name);
            const tex = new T.CanvasTexture(canvas);
            tex.needsUpdate = true;
            tex.minFilter = T.LinearFilter;
            tex.magFilter = T.LinearFilter;
            this.eyeCanvases[name] = canvas;
            this.eyeMaterials[name] = new T.MeshBasicMaterial({
                map: tex, transparent: true, side: T.DoubleSide,
                depthWrite: false, depthTest: false,
            });
        });
    }

    _drawEye(ctx, size, type) {
        const cx = size / 2, cy = size / 2, r = size * 0.42;
        ctx.clearRect(0, 0, size, size);

        if (type === 'blink') {
            ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = size * 0.06; ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.6, cy);
            ctx.quadraticCurveTo(cx, cy + r * 0.2, cx + r * 0.6, cy);
            ctx.stroke();
            return;
        }
        if (type === 'happy') {
            ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = size * 0.06; ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.55, cy + r * 0.15);
            ctx.quadraticCurveTo(cx, cy - r * 0.5, cx + r * 0.55, cy + r * 0.15);
            ctx.stroke();
            return;
        }

        const isBig = (type === 'excited');
        const eyeR = isBig ? r * 1.05 : r;

        // White sclera
        ctx.save();
        ctx.shadowColor = 'rgba(255,255,255,0.4)'; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(cx, cy, eyeR, eyeR * (type === 'worried' ? 0.85 : 1.0), 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.restore();

        // Iris gradient
        const irisR = eyeR * 0.72;
        const grad = ctx.createRadialGradient(cx, cy - irisR * 0.1, irisR * 0.15, cx, cy, irisR);
        if (type === 'worried') {
            grad.addColorStop(0, '#6b8cc7'); grad.addColorStop(0.6, '#3a5a8a'); grad.addColorStop(1, '#2a3a5a');
        } else if (type === 'excited') {
            grad.addColorStop(0, '#ffcc44'); grad.addColorStop(0.5, '#e88a20'); grad.addColorStop(1, '#a05010');
        } else {
            grad.addColorStop(0, '#e8a840'); grad.addColorStop(0.55, '#b87020'); grad.addColorStop(1, '#6a4010');
        }
        ctx.beginPath(); ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();

        // Pupil
        const pupilR = irisR * (isBig ? 0.55 : 0.5);
        ctx.beginPath(); ctx.arc(cx, cy + irisR * 0.05, pupilR, 0, Math.PI * 2);
        ctx.fillStyle = '#1a0a00'; ctx.fill();

        // Highlights
        ctx.beginPath(); ctx.arc(cx + eyeR * 0.22, cy - eyeR * 0.28, eyeR * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx - eyeR * 0.2, cy + eyeR * 0.18, eyeR * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();

        if (type === 'worried') {
            ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = size * 0.05; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(cx - eyeR * 0.6, cy - eyeR * 0.95);
            ctx.lineTo(cx + eyeR * 0.4, cy - eyeR * 1.15); ctx.stroke();
        }
        if (type === 'excited') {
            this._drawSparkle(ctx, cx + eyeR * 0.55, cy - eyeR * 0.55, eyeR * 0.18);
        }
    }

    _drawSparkle(ctx, x, y, r) {
        ctx.save(); ctx.fillStyle = '#fff'; ctx.translate(x, y);
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(0, -r); ctx.lineTo(r * 0.2, -r * 0.2);
            ctx.lineTo(r, 0); ctx.lineTo(r * 0.2, r * 0.2);
            ctx.lineTo(0, r); ctx.lineTo(-r * 0.2, r * 0.2);
            ctx.lineTo(-r, 0); ctx.lineTo(-r * 0.2, -r * 0.2);
            ctx.closePath(); ctx.fill(); ctx.rotate(Math.PI / 4);
        }
        ctx.restore();
    }

    // ========================
    // BUILD PROCEDURAL CAT
    // ========================
    _buildCat(T) {
        const toon = (color) => new T.MeshToonMaterial({ color });
        const basic = (color, opts = {}) => new T.MeshBasicMaterial({ color, ...opts });

        const COL = {
            body: 0xFA8D14, bodyDark: 0xD66C08, // Deeper, non-neon caramel orange
            belly: 0xFFF7EC, face: 0xFFF2E6,
            ear: 0xFA8D14, earInner: 0xFFB5C5,
            nose: 0xFF8FA0, blush: 0xFFB0C4, mouth: 0x5A3525,
            wing: 0xFFFFFF, wingTip: 0xFFF0F5,
            paw: 0xFA8D14, pad: 0xFFB7C5,
            tailTip: 0xD66C08, propeller: 0x6B4423, propSpin: 0xCDBA96
        };

        // Body (slight increase in size so it's not completely swallowed by the head)
        const bodyGeo = new T.SphereGeometry(0.95, 32, 24);
        bodyGeo.scale(1.0, 0.88, 0.82);
        this.body = new T.Mesh(bodyGeo, toon(COL.body));
        this.catGroup.add(this.body);

        // Belly
        const bellyGeo = new T.SphereGeometry(0.8, 24, 20);
        bellyGeo.scale(0.85, 0.85, 0.82); // Plump up the belly slightly so it sticks out
        this.belly = new T.Mesh(bellyGeo, toon(COL.belly));
        this.belly.position.set(0.18, -0.15, 0.25); // Move it further out along X/Y
        this.catGroup.add(this.belly);

        // Stripes
        for (let i = 0; i < 3; i++) {
            const s = new T.Mesh(new T.BoxGeometry(0.1, 0.04, 0.85), toon(COL.bodyDark));
            s.position.set(-0.1 + i * 0.18, 0.76 - i * 0.03, 0);
            s.rotation.z = 0.06 * (i - 1);
            this.catGroup.add(s);
        }

        // Head (slightly smaller to balance with the body, still Chibi)
        const headGeo = new T.SphereGeometry(1.15, 32, 24);
        headGeo.scale(1.0, 0.95, 0.90);
        this.head = new T.Mesh(headGeo, toon(COL.body));
        this.head.position.set(0.95, 0.55, 0);
        this.catGroup.add(this.head);

        // Face patch (Make sure it sits outside the head sphere!)
        const faceGeo = new T.SphereGeometry(0.85, 24, 20);
        faceGeo.scale(0.8, 0.85, 0.76);
        this.face = new T.Mesh(faceGeo, toon(COL.face));
        this.face.position.set(1.48, 0.35, 0); // Push it +X so it doesn't clip through the orange head
        this.catGroup.add(this.face);

        // Cheeks
        const cheekGeo = new T.SphereGeometry(0.38, 16, 12);
        const cL = new T.Mesh(cheekGeo, toon(0xF5B04A));
        cL.position.set(1.3, 0.15, -0.52); cL.scale.set(0.7, 0.6, 0.5);
        this.catGroup.add(cL);
        const cR = new T.Mesh(cheekGeo.clone(), toon(0xF5B04A));
        cR.position.set(1.3, 0.15, 0.52); cR.scale.set(0.7, 0.6, 0.5);
        this.catGroup.add(cR);

        // Ears
        const earGeo = new T.ConeGeometry(0.32, 0.65, 4);
        this.earL = new T.Mesh(earGeo, toon(COL.ear));
        this.earL.position.set(0.72, 1.55, -0.45); this.earL.rotation.z = 0.3;
        this.catGroup.add(this.earL);
        const eiL = new T.Mesh(new T.ConeGeometry(0.18, 0.42, 4), toon(COL.earInner));
        eiL.position.set(0.75, 1.52, -0.37); eiL.rotation.z = 0.3;
        this.catGroup.add(eiL);
        this.earR = new T.Mesh(earGeo.clone(), toon(COL.ear));
        this.earR.position.set(0.72, 1.55, 0.45); this.earR.rotation.z = 0.3;
        this.catGroup.add(this.earR);
        const eiR = new T.Mesh(new T.ConeGeometry(0.18, 0.42, 4), toon(COL.earInner));
        eiR.position.set(0.75, 1.52, 0.37); eiR.rotation.z = 0.3;
        this.catGroup.add(eiR);

        // Eyes (Fixed: smaller, rounder, tilted to follow face curvature)
        this.eyeGroup = new T.Group();
        const eyeSize = 0.85; // Reduced from 1.05
        const eyePlaneGeo = new T.PlaneGeometry(eyeSize, eyeSize);
        const defaultMat = this.eyeMaterials['idle'];

        this.eyeL = new T.Mesh(eyePlaneGeo, defaultMat.clone());
        this.eyeL.position.set(1.95, 0.55, -0.32);
        this.eyeL.rotation.y = Math.PI / 2 + 0.15; // Tilted inward
        this.eyeL.rotation.x = -0.05; // Tilted slightly down
        this.eyeL.renderOrder = 10; this.eyeL.material.depthTest = false;
        this.eyeGroup.add(this.eyeL);

        this.eyeR = new T.Mesh(eyePlaneGeo.clone(), defaultMat.clone());
        this.eyeR.position.set(1.95, 0.55, 0.32);
        this.eyeR.rotation.y = Math.PI / 2 - 0.15; // Tilted inward
        this.eyeR.rotation.x = 0.05; // Tilted slightly down
        this.eyeR.renderOrder = 10; this.eyeR.material.depthTest = false;
        this.eyeGroup.add(this.eyeR);
        this.catGroup.add(this.eyeGroup);

        // Nose
        const nGeo = new T.SphereGeometry(0.08, 12, 10);
        nGeo.scale(1.3, 0.9, 1.0);
        this.nose = new T.Mesh(nGeo, toon(COL.nose));
        this.nose.position.set(2.15, 0.32, 0);
        this.nose.renderOrder = 11; this.nose.material.depthTest = false;
        this.catGroup.add(this.nose);

        // Propeller
        this.propellerGroup = new T.Group();
        const spinner = new T.Mesh(new T.SphereGeometry(0.12, 12, 12), toon(0xFFFF00)); // Yellow spinner
        spinner.scale.set(1.2, 1.0, 1.0);
        this.propellerGroup.add(spinner);

        const propBladeGeo = new T.BoxGeometry(0.04, 0.8, 0.08);
        const bladeMat = toon(COL.propeller);
        this.propBlade1 = new T.Mesh(propBladeGeo, bladeMat);
        this.propBlade2 = new T.Mesh(propBladeGeo, bladeMat);
        this.propBlade2.rotation.x = Math.PI / 2;
        this.propellerGroup.add(this.propBlade1);
        this.propellerGroup.add(this.propBlade2);

        this.propellerGroup.position.set(2.25, 0.32, 0);
        this.catGroup.add(this.propellerGroup);

        // Blush
        const blGeo = new T.CircleGeometry(0.18, 16);
        const blMat = basic(COL.blush, { transparent: true, opacity: 0.45, depthTest: false });
        this.blushL = new T.Mesh(blGeo, blMat);
        this.blushL.position.set(2.0, 0.2, -0.46);
        this.blushL.rotation.y = Math.PI / 2; this.blushL.renderOrder = 11;
        this.catGroup.add(this.blushL);
        this.blushR = new T.Mesh(blGeo.clone(), blMat.clone());
        this.blushR.position.set(2.0, 0.2, 0.46);
        this.blushR.rotation.y = Math.PI / 2; this.blushR.renderOrder = 11;
        this.catGroup.add(this.blushR);

        // Whiskers
        const wMat = new T.LineBasicMaterial({ color: 0x8B7355, linewidth: 1.5 });
        this.whiskers = [];
        [{ z: -0.22, dy: -0.1 }, { z: -0.18, dy: 0.06 }, { z: 0.22, dy: -0.1 }, { z: 0.18, dy: 0.06 }]
            .forEach(w => {
                const line = new T.Line(
                    new T.BufferGeometry().setFromPoints([new T.Vector3(1.95, 0.28, w.z), new T.Vector3(2.5, 0.28 + w.dy, w.z * 2.5)]),
                    wMat
                );
                this.catGroup.add(line);
                this.whiskers.push(line);
            });

        // Mouth
        const mCurve = new T.QuadraticBezierCurve3(
            new T.Vector3(2.10, 0.18, -0.1), new T.Vector3(2.18, 0.12, 0), new T.Vector3(2.10, 0.18, 0.1)
        );
        this.mouth = new T.Mesh(new T.TubeGeometry(mCurve, 12, 0.016, 8), toon(COL.mouth));
        this.mouth.renderOrder = 11; this.mouth.material.depthTest = false;
        this.catGroup.add(this.mouth);

        const hCurve = new T.QuadraticBezierCurve3(
            new T.Vector3(2.08, 0.22, -0.15), new T.Vector3(2.20, 0.06, 0), new T.Vector3(2.08, 0.22, 0.15)
        );
        this.happyMouth = new T.Mesh(new T.TubeGeometry(hCurve, 12, 0.02, 8), toon(COL.mouth));
        this.happyMouth.visible = false;
        this.happyMouth.renderOrder = 11; this.happyMouth.material.depthTest = false;
        this.catGroup.add(this.happyMouth);

        // Wings
        this.wingGroupL = new T.Group();
        this.wingGroupR = new T.Group();
        this._buildAngelWing(T, this.wingGroupL, COL, 1);
        this._buildAngelWing(T, this.wingGroupR, COL, -1);
        this.wingGroupL.position.set(-0.08, 0.65, -0.65);
        this.wingGroupR.position.set(-0.08, 0.65, 0.65);
        this.catGroup.add(this.wingGroupL);
        this.catGroup.add(this.wingGroupR);

        // Tail (Smooth upward curled tube)
        this.tailGroup = new T.Group();
        this.tailSegments = []; // Keep array structure for the update loop to not crash, though we only use the group now

        // Create a CatmullRomCurve3 for a smooth, upward curving tail
        const tailCurve = new T.CatmullRomCurve3([
            new T.Vector3(0, 0, 0),
            new T.Vector3(-0.6, 0.4, 0),
            new T.Vector3(-1.2, 0.8, 0),
            new T.Vector3(-1.6, 0.5, 0),
            new T.Vector3(-1.7, 0.1, 0)
        ]);

        // Use TubeGeometry for a smooth mesh instead of disconnected spheres
        const tailGeo = new T.TubeGeometry(tailCurve, 20, 0.18, 12, false);
        this.tailMesh = new T.Mesh(tailGeo, toon(COL.bodyDark));

        // Add a fluffy tip
        const tailTip = new T.Mesh(new T.SphereGeometry(0.18, 12, 12), toon(COL.body));
        tailTip.position.set(-1.7, 0.1, 0); // End of curve

        // Base joint sphere
        const tailBase = new T.Mesh(new T.SphereGeometry(0.2, 12, 12), toon(COL.body));

        this.tailGroup.add(this.tailMesh);
        this.tailGroup.add(tailTip);
        this.tailGroup.add(tailBase);

        this.tailGroup.position.set(-0.75, 0.25, 0);
        this.catGroup.add(this.tailGroup);

        // Paws
        this.paws = [];
        [{ x: 0.4, y: -0.65, z: -0.28 }, { x: 0.4, y: -0.65, z: 0.28 },
        { x: -0.28, y: -0.6, z: -0.28 }, { x: -0.28, y: -0.6, z: 0.28 }]
            .forEach(pos => {
                const p = new T.Mesh(new T.SphereGeometry(0.17, 10, 8), toon(COL.paw));
                p.position.set(pos.x, pos.y, pos.z); p.scale.y = 0.6;
                this.catGroup.add(p);
                const pad = new T.Mesh(new T.CircleGeometry(0.085, 10), toon(COL.pad));
                pad.position.set(pos.x, pos.y - 0.1, pos.z); pad.rotation.x = -Math.PI / 2;
                this.catGroup.add(pad);
                for (let t = 0; t < 3; t++) {
                    const bean = new T.Mesh(new T.CircleGeometry(0.03, 8), toon(COL.pad));
                    const ang = (t - 1) * 0.35;
                    bean.position.set(pos.x + Math.sin(ang) * 0.06, pos.y - 0.1, pos.z + Math.cos(ang) * 0.05 - 0.01);
                    bean.rotation.x = -Math.PI / 2;
                    this.catGroup.add(bean);
                }
                this.paws.push(p);
            });

        this.catGroup.rotation.y = -0.3;
    }

    _buildAngelWing(T, group, COL, dir) {
        const toon = (c) => new T.MeshToonMaterial({ color: c });
        [{ s: 1.0, c: COL.wing, d: 0.04, y: 0 }, { s: 0.9, c: COL.wingTip, d: 0.03, y: -0.05 }, { s: 0.75, c: COL.wing, d: 0.03, y: -0.08 }]
            .forEach((l, i) => {
                const shape = new T.Shape();
                shape.moveTo(0, 0);
                shape.bezierCurveTo(0.25 * l.s, 0.2 * l.s, 0.45 * l.s, 0.8 * l.s, 0.2 * l.s, 1.3 * l.s);
                shape.bezierCurveTo(0.1 * l.s, 1.15 * l.s, -0.05 * l.s, 0.85 * l.s, -0.08 * l.s, 0.6 * l.s);
                shape.bezierCurveTo(-0.1 * l.s, 0.3 * l.s, -0.05 * l.s, 0.1 * l.s, 0, 0);
                const mesh = new T.Mesh(
                    new T.ExtrudeGeometry(shape, { depth: l.d, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 }),
                    toon(l.c)
                );
                mesh.rotation.x = -Math.PI / 2 * dir;
                mesh.position.y = l.y; mesh.position.z = i * 0.02 * -dir;
                group.add(mesh);
            });
        for (let i = 0; i < 4; i++) {
            const t = i / 3;
            const f = new T.Mesh(new T.BoxGeometry(0.04, 0.3 + t * 0.2, 0.02), toon(i % 2 === 0 ? COL.wing : COL.wingTip));
            f.position.set(0.08 - t * 0.05, -(0.3 + t * 0.35) * dir, -0.01);
            f.rotation.x = -Math.PI / 2 * dir; f.rotation.z = (i - 1.5) * 0.08;
            group.add(f);
        }
    }

    // ========================
    // EYE TEXTURE SWITCHING
    // ========================
    _setEyeTexture(name) {
        if (name === this.currentEyeType) return;
        this.currentEyeType = name;
        const mat = this.eyeMaterials[name];
        if (!mat) return;
        const mL = mat.clone(); mL.depthTest = false;
        this.eyeL.material = mL; this.eyeL.renderOrder = 10;
        const mR = mat.clone(); mR.depthTest = false;
        this.eyeR.material = mR; this.eyeR.renderOrder = 10;
    }

    // ========================
    // UPDATE
    // ========================
    update(dt, state = {}) {
        if (!this.ready) return;
        this.time += dt;
        const { speed = 0, maxSpeed = 500, expression = 'idle', launched = false } = state;
        this.expression = expression;

        // GLB mode: just rotate/bob + play animations
        if (this.mode === 'glb') {
            const t = this.time;
            if (this.mixer) this.mixer.update(dt);

            // Gentle bobbing
            const bobAmt = launched ? 0.035 : 0.055;
            const bobSpd = launched ? 3.5 : 1.8;
            this.catGroup.position.y = Math.sin(t * bobSpd) * bobAmt;

            // Slight tilt based on speed
            if (launched) {
                const speedRatio = speed / maxSpeed;
                this.catGroup.rotation.z = Math.sin(t * 2) * 0.03 * speedRatio;
            }

            this.renderer.render(this.scene, this.camera);
            return;
        }

        // === PROCEDURAL MODE ===
        const speedRatio = launched ? speed / maxSpeed : 0.15;
        const t = this.time;

        // Blink
        this.blinkTimer += dt;
        if (this.blinkTimer >= this.blinkInterval && !this.isBlinking) {
            this.isBlinking = true; this.blinkTimer = 0;
            this.blinkInterval = 2.5 + Math.random() * 3;
        }
        if (this.isBlinking) {
            this.blinkTimer += dt;
            if (this.blinkTimer >= this.blinkDuration) { this.isBlinking = false; this.blinkTimer = 0; }
        }

        // Eye expression
        if (this.isBlinking) this._setEyeTexture('blink');
        else if (expression === 'excited') this._setEyeTexture('excited');
        else if (expression === 'happy') this._setEyeTexture('happy');
        else if (expression === 'worried') this._setEyeTexture('worried');
        else this._setEyeTexture('idle');

        // Eye pulse
        const eyePulse = expression === 'excited' ? 1.0 + Math.sin(t * 5) * 0.1 : 1.0;
        this.eyeL.scale.setScalar(eyePulse);
        this.eyeR.scale.setScalar(eyePulse);

        // Blush
        const isHappy = expression === 'happy' || expression === 'excited';
        const blOp = isHappy ? 0.55 + Math.sin(t * 3) * 0.15 : 0.3;
        if (this.blushL.material) this.blushL.material.opacity = blOp;
        if (this.blushR.material) this.blushR.material.opacity = blOp;

        // Mouth
        this.mouth.visible = !isHappy;
        this.happyMouth.visible = isHappy;

        // Wings
        const flapSpeed = 4.5 + speedRatio * 10; // Faster flap for small wings
        const flapAmt = 0.45 + speedRatio * 0.65;
        const wBase = Math.sin(t * flapSpeed) * flapAmt;
        const wSec = Math.sin(t * flapSpeed * 1.6) * 0.12;
        this.wingGroupL.rotation.x = -wBase - wSec - 0.25;
        this.wingGroupR.rotation.x = wBase + wSec + 0.25;
        this.wingGroupL.rotation.z = Math.sin(t * flapSpeed) * 0.15;
        this.wingGroupR.rotation.z = -Math.sin(t * flapSpeed) * 0.15;

        // Propeller spin
        const propSpeed = launched ? 25 + speedRatio * 30 : 5;
        this.propellerGroup.rotation.x += propSpeed * dt;

        // Tail wiggle
        const tailSpd = 3.0 + speedRatio * 5.0;
        const tailPhase = t * tailSpd;
        this.tailGroup.rotation.x = Math.sin(tailPhase) * 0.2;
        this.tailGroup.rotation.y = Math.cos(tailPhase * 0.8) * 0.15;
        this.tailGroup.rotation.z = Math.sin(tailPhase * 1.5) * 0.1;

        // Body squash/stretch
        if (launched) {
            const stretch = 1.0 + speedRatio * 0.18;
            const squash = 1.0 - speedRatio * 0.1;
            this.body.scale.set(1.0 * stretch, 0.88 * squash, 0.82 * squash);
        } else {
            const br = Math.sin(t * 1.8) * 0.02;
            this.body.scale.set(1.0 + br, 0.88 - br * 0.5, 0.82 + br * 0.3);
        }

        // Body bob
        this.catGroup.position.y = Math.sin(t * (launched ? 3.5 : 1.8)) * (launched ? 0.035 : 0.055);
        this.head.position.y = 0.55 + Math.sin(t * 2.8 + 0.5) * 0.025;
        this.head.rotation.z = Math.sin(t * 1.2) * 0.02;

        // Ears
        const earW = isHappy ? Math.sin(t * 7) * 0.15 : Math.sin(t * 1.5) * 0.04;
        const earP = expression === 'worried' ? -0.18 : (expression === 'excited' ? 0.1 : 0);
        this.earL.rotation.x = earW + earP;
        this.earR.rotation.x = -earW + earP;

        // Paws
        if (launched) {
            this.paws.forEach((p, i) => {
                const ph = t * 4 + i * Math.PI / 2;
                p.position.y = -0.55 + Math.sin(ph) * 0.12;
                p.position.x = (i < 2 ? 0.4 : -0.28) + Math.cos(ph) * 0.05;
            });
        } else {
            this.paws.forEach((p, i) => {
                p.position.y = (i < 2 ? -0.65 : -0.6) + Math.sin(t * 1.3 + i * 0.7) * 0.02;
            });
        }

        // Whiskers
        this.whiskers.forEach((w, i) => { w.rotation.y = Math.sin(t * 4.5 + i * 1.3) * 0.035; });

        this.renderer.render(this.scene, this.camera);
    }

    getImage() { return this.canvas; }

    dispose() {
        if (this.renderer) this.renderer.dispose();
        Object.values(this.eyeCanvases).forEach(c => { c.width = 0; c.height = 0; });
    }
}
