import * as THREE from 'three';

export type PieceKind =
  | 'pawn'
  | 'knight'
  | 'bishop'
  | 'rook'
  | 'queen'
  | 'king';

const KIND_BY_SYMBOL: Record<string, PieceKind> = {
  '♙': 'pawn',
  '♟': 'pawn',
  '♘': 'knight',
  '♞': 'knight',
  '♗': 'bishop',
  '♝': 'bishop',
  '♖': 'rook',
  '♜': 'rook',
  '♕': 'queen',
  '♛': 'queen',
  '♔': 'king',
  '♚': 'king',
};

export const kindOf = (symbol: string): PieceKind => KIND_BY_SYMBOL[symbol];
export const isWhite = (symbol: string): boolean => '♔♕♖♗♘♙'.includes(symbol);

// One square is 1 unit wide; pieces are scaled to stand comfortably inside it.
const PIECE_SCALE = 0.9;
// Pieces are drawn taller and slimmer than the measurements below, like
// tournament pieces, so they don't look squat when seen from above.
const TALL = 1.38;
const SLIM = 0.9;

const LATHE_SEGMENTS = 64;
const PROFILE_POINTS = 60;

type Profile = [number, number][]; // radius/height pairs from the bottom up

// A turned part with a smooth curved side, such as a piece's body or head.
const smoothPart = (points: Profile) => {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([r, y]) => new THREE.Vector3(r * SLIM, y * TALL, 0)),
    false,
    'centripetal',
  );
  const profile = curve
    .getSpacedPoints(PROFILE_POINTS)
    .map(p => new THREE.Vector2(Math.max(p.x, 0), p.y));
  return new THREE.LatheGeometry(profile, LATHE_SEGMENTS);
};

// A turned part with crisp edges, such as a collar or the rim of the base.
const sharpPart = (points: Profile) =>
  new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r * SLIM, y * TALL)),
    LATHE_SEGMENTS,
  );

// A rounded bead ring, which catches a bright line of light.
const bead = (radius: number, thickness: number) => {
  const geometry = new THREE.TorusGeometry(
    radius * SLIM,
    thickness,
    16,
    LATHE_SEGMENTS,
  );
  geometry.rotateX(Math.PI / 2);
  return geometry;
};

// Separate parts meet at clean edges, which is what makes turned pieces look
// crisp; one continuous smooth outline looks soft and blurry when small.
const add = (
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  y = 0,
) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y * TALL;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
};

// A thin inlaid line around a piece at radius r and height y, like the fine
// pinstripe on a turned wooden piece. Drawn in the accent colour.
const TRIM_THICKNESS = 0.009;
const addTrim = (
  group: THREE.Group,
  accent: THREE.Material,
  r: number,
  y: number,
) => add(group, bead(r + TRIM_THICKNESS * 0.5, TRIM_THICKNESS), accent, y);

// Every piece stands on the same kind of base: a bevelled foot with a bead.
const addBase = (
  group: THREE.Group,
  material: THREE.Material,
  accent: THREE.Material,
  r: number,
) => {
  const foot = add(
    group,
    sharpPart([
      [0, 0],
      [r, 0],
      [r + 0.012, 0.02],
      [r + 0.012, 0.05],
      [r, 0.07],
      [r - 0.04, 0.085],
      [0, 0.085],
    ]),
    material,
  );
  foot.userData.isBase = true;
  add(group, bead(r - 0.05, 0.03), material, 0.1);
  addTrim(group, accent, r - 0.05 + 0.03, 0.1);
  add(
    group,
    sharpPart([
      [0, 0.1],
      [r - 0.08, 0.1],
      [r - 0.1, 0.13],
      [r - 0.13, 0.15],
      [0, 0.15],
    ]),
    material,
  );
};

// Real proportions from FIDE's equipment standards: heights of King 9.5 cm,
// Queen 8.5, Bishop 7, Knight 6, Rook 5.5 and Pawn 5, with the base 40-50% of
// the height. The pieces keep those ratios but are drawn 25% bigger than on a
// FIDE board (as if each square were 4.8 cm), so they're easy to see on a phone.
// That makes the king's base about 87% of a square; much more and neighbouring
// pieces would touch.
const SQUARE_CM = 4.8;
const FIDE_SIZE: Record<PieceKind, { heightCm: number; baseRatio: number }> = {
  king: { heightCm: 9.5, baseRatio: 0.44 },
  queen: { heightCm: 8.5, baseRatio: 0.45 },
  bishop: { heightCm: 7, baseRatio: 0.47 },
  knight: { heightCm: 6, baseRatio: 0.5 },
  rook: { heightCm: 5.5, baseRatio: 0.5 },
  pawn: { heightCm: 5, baseRatio: 0.5 },
};

// Stretches a built piece so its height and base width match FIDE_SIZE.
const fitToSize = (group: THREE.Group, kind: PieceKind) => {
  const { heightCm, baseRatio } = FIDE_SIZE[kind];
  const height = heightCm / SQUARE_CM / PIECE_SCALE;
  const baseWidth = (heightCm * baseRatio) / SQUARE_CM / PIECE_SCALE;
  group.updateMatrixWorld(true);
  const all = new THREE.Box3().setFromObject(group);
  const base = new THREE.Box3();
  group.children.forEach(child => {
    if (child.userData.isBase) base.expandByObject(child);
  });
  const sideways = baseWidth / (base.max.x - base.min.x);
  group.scale.set(sideways, height / (all.max.y - all.min.y), sideways);
};

// A flat disc with a crisp edge, used for collars under the head.
const collar = (r: number, height: number): Profile => [
  [0, 0],
  [r - 0.02, 0],
  [r, height * 0.35],
  [r, height * 0.65],
  [r - 0.02, height],
  [0, height],
];

// Side view of the horse's head and neck, facing +x.
const KNIGHT_DEPTH = 0.26;
const knightHead = () => {
  const shape = new THREE.Shape();
  shape.moveTo(-0.23, 0.2);
  shape.lineTo(0.22, 0.2);
  shape.quadraticCurveTo(0.27, 0.4, 0.14, 0.5); // chest up to the throat
  shape.quadraticCurveTo(0.22, 0.56, 0.36, 0.59); // under the jaw
  shape.lineTo(0.43, 0.62); // lower lip
  shape.lineTo(0.37, 0.655); // into the mouth
  shape.lineTo(0.44, 0.68); // upper lip
  shape.quadraticCurveTo(0.45, 0.73, 0.39, 0.76); // nose
  shape.quadraticCurveTo(0.3, 0.84, 0.16, 0.9); // bridge of the nose
  shape.quadraticCurveTo(0.09, 0.97, 0.11, 1.1); // forehead to the ear tip
  shape.lineTo(0.0, 0.99); // back of the ear
  shape.quadraticCurveTo(-0.17, 0.99, -0.25, 0.8); // top of the mane
  shape.quadraticCurveTo(-0.32, 0.55, -0.23, 0.2); // back of the neck
  // A small bevel keeps the outline (lips, nose, ear) crisp.
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: KNIGHT_DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.022,
    bevelSegments: 3,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -KNIGHT_DEPTH / 2);
  geometry.scale(SLIM, TALL, SLIM);
  return geometry;
};

// Eyes and the line of the mouth, drawn in a contrasting colour on the head.
const addKnightFace = (head: THREE.Mesh, detail: THREE.Material) => {
  const side = (KNIGHT_DEPTH / 2 + 0.03) * SLIM;
  [-1, 1].forEach(direction => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), detail);
    eye.position.set(0.2 * SLIM, 0.86 * TALL, direction * side);
    eye.scale.set(1, 0.8, 0.5);
    head.add(eye);
  });
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.09 * SLIM,
      0.014 * TALL,
      (KNIGHT_DEPTH + 0.075) * SLIM,
    ),
    detail,
  );
  mouth.position.set(0.39 * SLIM, 0.655 * TALL, 0);
  head.add(mouth);
};

// `accent` colours the thin lines around the base, collars and rook crown, and
// the details on top that identify a piece from above (queen's crown, rook's
// battlements, bishop's tip). For dark pieces it is lighter than
// the body so they show. `detail` colours the knight's eyes and mouth.
export function createPiece(
  symbol: string,
  material: THREE.Material,
  _col: number,
  accent: THREE.Material = material,
  detail: THREE.Material = accent,
): THREE.Group {
  const group = new THREE.Group();
  const kind = kindOf(symbol);

  switch (kind) {
    case 'pawn':
      addBase(group, material, accent, 0.36);
      add(
        group,
        smoothPart([
          [0.23, 0.15],
          [0.18, 0.22],
          [0.13, 0.33],
          [0.11, 0.42],
          [0.12, 0.45],
        ]),
        material,
      );
      add(group, sharpPart(collar(0.2, 0.05)), material, 0.44);
      addTrim(group, accent, 0.2, 0.44 + 0.05 / 2);
      add(group, new THREE.SphereGeometry(0.15, 40, 28), material, 0.6);
      break;

    case 'rook':
      addBase(group, material, accent, 0.39);
      add(
        group,
        smoothPart([
          [0.27, 0.15],
          [0.24, 0.25],
          [0.21, 0.5],
          [0.22, 0.6],
          [0.25, 0.63],
        ]),
        material,
      );
      add(group, sharpPart(collar(0.29, 0.05)), material, 0.62);
      addTrim(group, accent, 0.29, 0.62 + 0.05 / 2);
      add(
        group,
        sharpPart([
          [0, 0.67],
          [0.25, 0.67],
          [0.27, 0.86],
          [0.21, 0.86],
          [0.21, 0.81],
          [0, 0.81],
        ]),
        material,
      );
      addTrim(group, accent, 0.25, 0.67);
      addTrim(group, accent, 0.27, 0.86);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const merlon = add(
          group,
          new THREE.BoxGeometry(0.1, 0.09, 0.1),
          accent,
          0.9,
        );
        merlon.position.x = Math.cos(angle) * 0.24 * SLIM;
        merlon.position.z = Math.sin(angle) * 0.24 * SLIM;
        merlon.rotation.y = -angle;
      }
      break;

    case 'bishop':
      addBase(group, material, accent, 0.37);
      add(
        group,
        smoothPart([
          [0.23, 0.15],
          [0.17, 0.25],
          [0.12, 0.48],
          [0.11, 0.57],
          [0.13, 0.6],
        ]),
        material,
      );
      add(group, sharpPart(collar(0.2, 0.04)), material, 0.59);
      addTrim(group, accent, 0.2, 0.59 + 0.04 / 2);
      add(group, sharpPart(collar(0.16, 0.03)), material, 0.64);
      addTrim(group, accent, 0.16, 0.64 + 0.03 / 2);
      add(
        group,
        smoothPart([
          [0, 0.67],
          [0.12, 0.69],
          [0.17, 0.78],
          [0.15, 0.89],
          [0.08, 0.98],
          [0, 1.02],
        ]),
        material,
      );
      add(group, new THREE.SphereGeometry(0.045, 20, 14), accent, 1.05);
      break;

    case 'queen':
      addBase(group, material, accent, 0.4);
      add(
        group,
        smoothPart([
          [0.25, 0.15],
          [0.18, 0.3],
          [0.13, 0.62],
          [0.13, 0.72],
          [0.15, 0.75],
        ]),
        material,
      );
      add(group, sharpPart(collar(0.21, 0.04)), material, 0.74);
      addTrim(group, accent, 0.21, 0.74 + 0.04 / 2);
      add(group, sharpPart(collar(0.17, 0.03)), material, 0.79);
      addTrim(group, accent, 0.17, 0.79 + 0.03 / 2);
      add(
        group,
        smoothPart([
          [0.12, 0.82],
          [0.15, 0.88],
          [0.22, 0.97],
          [0.24, 1.0],
          [0.18, 1.0],
          [0, 0.97],
        ]),
        material,
      );
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2;
        const point = add(
          group,
          new THREE.SphereGeometry(0.035, 14, 10),
          accent,
          1.01,
        );
        point.position.x = Math.cos(angle) * 0.22 * SLIM;
        point.position.z = Math.sin(angle) * 0.22 * SLIM;
      }
      add(group, new THREE.SphereGeometry(0.075, 24, 16), accent, 1.04);
      break;

    case 'king':
      addBase(group, material, accent, 0.41);
      add(
        group,
        smoothPart([
          [0.26, 0.15],
          [0.19, 0.3],
          [0.14, 0.66],
          [0.14, 0.77],
          [0.16, 0.8],
        ]),
        material,
      );
      add(group, sharpPart(collar(0.22, 0.04)), material, 0.79);
      addTrim(group, accent, 0.22, 0.79 + 0.04 / 2);
      add(group, sharpPart(collar(0.18, 0.03)), material, 0.84);
      addTrim(group, accent, 0.18, 0.84 + 0.03 / 2);
      add(
        group,
        smoothPart([
          [0.13, 0.87],
          [0.16, 0.93],
          [0.22, 1.02],
          [0.22, 1.05],
          [0.12, 1.07],
          [0, 1.07],
        ]),
        material,
      );
      add(group, new THREE.BoxGeometry(0.07, 0.26, 0.07), material, 1.17);
      add(group, new THREE.BoxGeometry(0.19, 0.07, 0.07), material, 1.2);
      break;

    case 'knight': {
      addBase(group, material, accent, 0.39);
      add(group, sharpPart(collar(0.27, 0.06)), material, 0.15);
      addTrim(group, accent, 0.27, 0.15 + 0.06 / 2);
      const head = add(group, knightHead(), material);
      addKnightFace(head, detail);
      // Knights look straight ahead at the opponent, like on a real board:
      // white's towards black's side (-z), black's towards white's side (+z).
      head.rotation.y = isWhite(symbol) ? Math.PI / 2 : -Math.PI / 2;
      break;
    }
  }

  fitToSize(group, kind);
  const piece = new THREE.Group();
  piece.add(group);
  piece.scale.setScalar(PIECE_SCALE);
  return piece;
}
