import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { BoardEvent, BoardMoveHint, BoardState } from '../protocol';
import { assignPieces } from './assign';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createPiece, isWhite, kindOf } from './pieces';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
    board3d?: {
      receive: (state: BoardState) => void;
      // Page position of a square's centre, for debugging taps.
      squareToPage: (
        row: number,
        col: number,
        height?: number,
      ) => { x: number; y: number };
    };
  }
}

const send = (event: BoardEvent) =>
  window.ReactNativeWebView?.postMessage(JSON.stringify(event));

const COLORS = {
  whitePiece: 0xf1ebe0, // clean ivory, brighter than the light squares
  // Deep charcoal-brown rather than pure black, so the light and dark sides of
  // each curve still show and the black pieces' shapes stay sharp.
  blackPiece: 0x3b3430,
  // Thin warm-grey lines on the black pieces, matching how the grooves on the
  // white pieces read as darker lines.
  blackLine: 0x8f8374,
  // The white knight's eyes and mouth.
  whiteDetail: 0x5c4630,
  selected: 0xffd700,
  move: 0x2e7d32,
  capture: 0xdc1e3c,
  check: 0xff1a1a,
};

const BASE_MOVE_MS = 300;
const MOVE_MS_PER_SQUARE = 35;
const MAX_MOVE_MS = 520;
const REMOVE_MS = 520;
const ADD_MS = 320;
const PIECE_SIZE = 0.9;
// Shadows are switched off; set to true to bring back the cast shadows and
// the soft shadow under each piece.
const SHADOWS = false;

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

// Seeded random numbers, so the wood grain looks the same every time.
const random = (() => {
  let seed = 7;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
})();

// Draws a wood-grain texture: a base colour with wavy darker grain lines.
const woodTexture = (base: string, grain: string, size = 256) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = grain;
  for (let i = 0; i < 70; i++) {
    const y0 = random() * size;
    const amplitude = 2 + random() * 6;
    const wavelength = 40 + random() * 120;
    const phase = random() * Math.PI * 2;
    ctx.globalAlpha = 0.08 + random() * 0.22;
    ctx.lineWidth = 0.6 + random() * 2.2;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 4) {
      const y = y0 + Math.sin(x / wavelength + phase) * amplitude;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

// A faint sheen where a dark piece's surface curves away from the viewer, so
// its outline separates from the board without a drawn line.
const addEdgeSheen = (material: THREE.MeshStandardMaterial) => {
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float facing = abs(dot(normalize(vViewPosition), normal));
      totalEmissiveRadiance += vec3(0.22, 0.21, 0.2) * pow(1.0 - facing, 3.0);`,
    );
  };
};

// The opposite for light pieces: the surface darkens where it curves away from
// the viewer, giving each white piece a soft darker edge so it doesn't blend
// into the light squares, even seen from straight above.
const addEdgeShade = (material: THREE.MeshStandardMaterial) => {
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float facing = abs(dot(normalize(vViewPosition), normal));
      outgoingLight *= 1.0 - 0.55 * pow(1.0 - facing, 2.0);
      #include <opaque_fragment>`,
    );
  };
};

// A soft round shadow that sits under each piece.
const blobTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
  gradient.addColorStop(0.55, 'rgba(0,0,0,0.25)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
};

// The file letters and rank numbers around the board, drawn on one transparent
// sheet the size of the frame (9.2 units), each facing the player on its side.
const labelSheet = () => {
  const size = 1024;
  const scale = size / 9.2; // pixels per unit
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e8d5b7';
  ctx.font = `bold ${Math.round(0.36 * scale * 0.62)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // x and z are board units; the sheet lies flat with -z at the top.
  const draw = (text: string, x: number, z: number, facingBlack: boolean) => {
    ctx.save();
    ctx.translate((x + 4.6) * scale, (z + 4.6) * scale);
    if (facingBlack) ctx.rotate(Math.PI);
    ctx.fillText(text, 0, 0.02 * scale);
    ctx.restore();
  };
  for (let i = 0; i < 8; i++) {
    draw('abcdefgh'[i], i - 3.5, 4.3, false);
    draw(String(8 - i), -4.3, i - 3.5, false);
    draw('abcdefgh'[i], i - 3.5, -4.3, true);
    draw(String(8 - i), 4.3, i - 3.5, true);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

// Board row 7 (white's back rank) is nearest the camera.
const squareX = (col: number) => col - 3.5;
const squareZ = (row: number) => row - 3.5;

interface PieceObject {
  id: number;
  symbol: string;
  row: number;
  col: number;
  group: THREE.Group;
  material: THREE.MeshMatcapMaterial;
  extras: THREE.MeshMatcapMaterial[]; // line and detail colours
  blob: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  moveStart: number;
  moveMs: number;
  arc: number;
  appearStart: number | null;
  removeStart: number | null;
  removeDelay: number;
}

function start() {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    send({ type: 'unsupported', reason: String(e) });
    return;
  }
  // Sharp enough for the pieces' details; drawing at the full 3x of some
  // phones costs over twice the work for no visible gain and makes moves stutter.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = SHADOWS;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', () =>
    send({ type: 'unsupported', reason: 'WebGL context lost' }),
  );

  const scene = new THREE.Scene();
  // The camera looks straight down on the middle of the board, so the view is
  // the same from both sides, like a real board on a table between two players.
  // A natural lens lets the pieces show their sides towards the edges.
  const camera = new THREE.PerspectiveCamera(34, 1, 1, 200);
  // Looking straight down, with black's side at the top of the screen. Only
  // the distance changes with the screen size (see resize).
  camera.up.set(0, 0, -1);
  camera.position.set(0, 20, 0);
  camera.lookAt(0, 0, 0);

  // Soft studio reflections on the pieces, plus one high light for short shadows.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x20180f, 0.2));
  // Lit from the a-file and h-file sides, never from one player's side, so both
  // players' pieces are lit the same way: a key light shapes the pieces and a
  // softer one from the other side outlines them.
  const rim = new THREE.DirectionalLight(0xffe8c8, 1.0);
  rim.position.set(8, 7, 0);
  scene.add(rim);
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.1);
  sun.position.set(-7, 11, 0.5);
  sun.castShadow = SHADOWS;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 4;
  sun.shadow.camera.left = -5.5;
  sun.shadow.camera.right = 5.5;
  sun.shadow.camera.top = 5.5;
  sun.shadow.camera.bottom = -5.5;
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 30;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  // Wooden frame with file and rank letters, and maple and walnut squares.
  const frameTexture = woodTexture('#4a2b17', '#24140a', 512);
  frameTexture.repeat.set(2, 2);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(9.2, 0.34, 9.2),
    new THREE.MeshStandardMaterial({ map: frameTexture, roughness: 0.45 }),
  );
  frame.position.y = -0.2;
  frame.receiveShadow = true;
  scene.add(frame);
  // Letters and numbers on both edges, like a real board, each set facing the
  // player sitting on that side. All are drawn on one sheet over the frame.
  const labels = new THREE.Mesh(
    new THREE.PlaneGeometry(9.2, 9.2),
    new THREE.MeshBasicMaterial({
      map: labelSheet(),
      transparent: true,
      opacity: 0.75,
    }),
  );
  labels.rotation.x = -Math.PI / 2;
  labels.position.y = -0.025;
  scene.add(labels);

  const squareGeometry = new THREE.BoxGeometry(1, 0.1, 1);
  const variants = (base: string, grain: string) => {
    const texture = woodTexture(base, grain);
    return Array.from({ length: 4 }, (_, i) => {
      const map = texture.clone();
      map.offset.set(i * 0.37, i * 0.21);
      map.rotation = i % 2 === 0 ? 0 : Math.PI / 2;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.5 });
    });
  };
  // Light squares are a warm maple, a little deeper than the ivory pieces so
  // white pieces stand out on them.
  const lightMaterials = variants('#cfae7c', '#a07a48');
  const darkMaterials = variants('#8b5a35', '#4f2f17');
  // Squares sharing a material are merged into one mesh, so the whole board
  // takes a handful of draw calls instead of 64.
  const squaresByMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const materials = (row + col) % 2 === 0 ? lightMaterials : darkMaterials;
      const material = materials[(row * 3 + col) % 4];
      const square = squareGeometry.clone();
      square.translate(squareX(col), -0.05, squareZ(row));
      if (!squaresByMaterial.has(material)) squaresByMaterial.set(material, []);
      squaresByMaterial.get(material)!.push(square);
    }
  }
  squaresByMaterial.forEach((list, material) => {
    const mesh = new THREE.Mesh(mergeGeometries(list)!, material);
    mesh.receiveShadow = true;
    scene.add(mesh);
    list.forEach(square => square.dispose());
  });
  squareGeometry.dispose();
  const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  // The square at a point on the board, if any.
  const squareAt = (point: THREE.Vector3) => {
    const col = Math.floor(point.x + 4);
    const row = Math.floor(point.z + 4);
    return row >= 0 && row < 8 && col >= 0 && col < 8 ? { row, col } : null;
  };
  const blobMap = blobTexture();
  const blobGeometry = new THREE.PlaneGeometry(0.95, 0.95);

  // One highlight of each kind per square, shown and hidden as needed.
  const makeOverlay = (
    geometry: THREE.BufferGeometry,
    color: number,
    opacity: number,
  ) => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  };
  const tile = new THREE.PlaneGeometry(0.98, 0.98);
  const dot = new THREE.CircleGeometry(0.15, 32);
  const ring = new THREE.RingGeometry(0.36, 0.46, 40);
  const overlays = Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    const place = (mesh: THREE.Mesh, y: number) => {
      mesh.position.set(squareX(col), y, squareZ(row));
      return mesh;
    };
    return {
      selected: place(makeOverlay(tile, COLORS.selected, 0.55), 0.004),
      check: place(makeOverlay(tile, COLORS.check, 0.5), 0.005),
      move: place(makeOverlay(dot, COLORS.move, 0.75), 0.006),
      capture: place(makeOverlay(ring, COLORS.capture, 0.85), 0.006),
    };
  });

  let nextId = 1;
  let pieces: PieceObject[] = [];
  let checkedKingId: number | null = null;
  let lastMoveKey = '';
  let validTargets = new Set<number>(); // row * 8 + col of the selected piece's moves

  // The pieces' polished look (studio reflections, two lights, the edge sheen
  // and shade) is too slow to work out for every pixel on budget phones: it
  // halved the frame rate. The camera and lights never move, so each look
  // depends only on which way the surface faces. It is worked out once, on a
  // ball, into a small "matcap" picture that the pieces then simply look up.
  const bakeMatcap = (material: THREE.Material) => {
    const size = 256;
    const gl = renderer.getContext();
    // Half floats keep the brightest highlights for the tone mapping later.
    const floats =
      !!gl.getExtension('EXT_color_buffer_float') ||
      !!gl.getExtension('EXT_color_buffer_half_float');
    const target = new THREE.WebGLRenderTarget(size, size, {
      type: floats ? THREE.HalfFloatType : THREE.UnsignedByteType,
      depthBuffer: true,
    });
    // Matcap lookups reach 0.495 from the centre; the ball is drawn slightly
    // bigger so its very edge never samples the empty background.
    const extent = 1.0101 / 1.03;
    const view = new THREE.OrthographicCamera(
      -extent,
      extent,
      extent,
      -extent,
      1,
      200,
    );
    view.quaternion.copy(camera.quaternion);
    view.position.set(0, 0, 100).applyQuaternion(camera.quaternion);
    view.layers.set(1);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), material);
    ball.layers.set(1);
    scene.add(ball);
    scene.traverse(object => {
      if ((object as THREE.Light).isLight) object.layers.enable(1);
    });
    const clearColor = renderer.getClearColor(new THREE.Color());
    const clearAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, view);
    renderer.setRenderTarget(null);
    renderer.setClearColor(clearColor, clearAlpha);
    scene.remove(ball);
    ball.geometry.dispose();
    material.dispose();
    return target.texture;
  };

  const pieceLooks = (() => {
    const white = new THREE.MeshStandardMaterial({
      color: COLORS.whitePiece,
      roughness: 0.3,
      metalness: 0,
    });
    addEdgeShade(white);
    // Polished like ebony: crisp highlights along every ridge and rim show
    // the black pieces' shape, which their dark colour would otherwise hide.
    const black = new THREE.MeshStandardMaterial({
      color: COLORS.blackPiece,
      roughness: 0.16,
      metalness: 0,
      envMapIntensity: 1.6,
    });
    addEdgeSheen(black);
    const blackLine = new THREE.MeshStandardMaterial({
      color: COLORS.blackLine,
      roughness: 0.6,
      metalness: 0,
    });
    const whiteDetail = new THREE.MeshStandardMaterial({
      color: COLORS.whiteDetail,
      roughness: 0.5,
      metalness: 0,
    });
    const looks = { white, black, blackLine, whiteDetail };
    return Object.fromEntries(
      Object.entries(looks).map(([name, material]) => [
        name,
        bakeMatcap(material),
      ]),
    ) as Record<keyof typeof looks, THREE.Texture>;
  })();

  // A red glow added on top of a piece's look, for the king in check.
  const addGlow = (material: THREE.MeshMatcapMaterial) => {
    const glow = { value: new THREE.Color(0, 0, 0) };
    material.userData.glow = glow.value;
    material.onBeforeCompile = shader => {
      shader.uniforms.glow = glow;
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform vec3 glow;\nvoid main() {')
        .replace(
          '#include <opaque_fragment>',
          'outgoingLight += glow;\n#include <opaque_fragment>',
        );
    };
  };
  const glowOf = (piece: PieceObject) =>
    piece.material.userData.glow as THREE.Color;

  const createPieceObject = (
    symbol: string,
    row: number,
    col: number,
    appear: boolean,
  ) => {
    const look = (matcap: THREE.Texture) =>
      new THREE.MeshMatcapMaterial({ matcap, transparent: true });
    const material = look(
      isWhite(symbol) ? pieceLooks.white : pieceLooks.black,
    );
    addGlow(material);
    const accent = isWhite(symbol) ? material : look(pieceLooks.blackLine);
    const detail = isWhite(symbol) ? look(pieceLooks.whiteDetail) : accent;
    const group = createPiece(symbol, material, accent, detail);
    const blob = new THREE.Mesh(
      blobGeometry,
      new THREE.MeshBasicMaterial({
        map: blobMap,
        transparent: true,
        depthWrite: false,
      }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(squareX(col), 0.002, squareZ(row));
    blob.visible = SHADOWS;
    scene.add(blob);
    const position = new THREE.Vector3(squareX(col), 0, squareZ(row));
    group.position.copy(position);
    group.traverse(child => {
      child.userData.pieceId = nextId;
    });
    scene.add(group);
    const now = performance.now();
    const piece: PieceObject = {
      id: nextId++,
      symbol,
      row,
      col,
      group,
      material,
      extras: [...new Set([accent, detail])].filter(m => m !== material),
      blob,
      from: position.clone(),
      to: position.clone(),
      moveStart: now,
      moveMs: 0,
      arc: 0,
      appearStart: appear ? now : null,
      removeStart: null,
      removeDelay: 0,
    };
    if (appear) group.scale.multiplyScalar(0.001);
    pieces.push(piece);
    return piece;
  };

  const moveTo = (piece: PieceObject, row: number, col: number) => {
    if (piece.row === row && piece.col === col) return;
    const distance = Math.hypot(piece.row - row, piece.col - col);
    piece.row = row;
    piece.col = col;
    piece.from.copy(piece.group.position);
    piece.from.y = 0;
    piece.to.set(squareX(col), 0, squareZ(row));
    piece.moveStart = performance.now();
    piece.moveMs = Math.min(
      BASE_MOVE_MS + distance * MOVE_MS_PER_SQUARE,
      MAX_MOVE_MS,
    );
    // Pieces glide just above the board; knights hop, since they jump over pieces.
    piece.arc =
      kindOf(piece.symbol) === 'knight' ? 0.55 : 0.12 + distance * 0.02;
  };

  const startMoveHint = (moving: BoardMoveHint | null) => {
    const key = moving
      ? `${moving.fromRow},${moving.fromCol},${moving.toRow},${moving.toCol}`
      : '';
    if (key === lastMoveKey) return;
    lastMoveKey = key;
    if (!moving) return;
    const piece = pieces.find(
      p =>
        p.removeStart === null &&
        p.row === moving.fromRow &&
        p.col === moving.fromCol,
    );
    if (piece) moveTo(piece, moving.toRow, moving.toCol);
  };

  const syncBoard = (board: string[][]) => {
    const living = pieces.filter(p => p.removeStart === null);
    const { moves, removed, added } = assignPieces(living, board);
    const byId = new Map(living.map(p => [p.id, p]));
    moves.forEach(({ id, row, col }) => moveTo(byId.get(id)!, row, col));
    const now = performance.now();
    removed.forEach(id => {
      const piece = byId.get(id)!;
      piece.removeStart = now;
      // A captured piece falls just as the capturing piece lands on it.
      const attacker = moves
        .map(m => byId.get(m.id)!)
        .find(p => p.row === piece.row && p.col === piece.col);
      piece.removeDelay = attacker
        ? Math.max(0, attacker.moveStart + attacker.moveMs * 0.6 - now)
        : 0;
    });
    added.forEach(({ symbol, row, col }) =>
      createPieceObject(symbol, row, col, true),
    );
  };

  const receive = (state: BoardState) => {
    startMoveHint(state.moving);
    syncBoard(state.board);

    const living = pieces.filter(p => p.removeStart === null);

    const valid = new Set(state.validMoves.map(m => m.row * 8 + m.col));
    validTargets = valid;
    const occupied = new Set(living.map(p => p.row * 8 + p.col));
    overlays.forEach((overlay, index) => {
      const row = Math.floor(index / 8);
      const col = index % 8;
      overlay.selected.visible =
        !!state.selected &&
        state.selected.row === row &&
        state.selected.col === col;
      overlay.move.visible = valid.has(index) && !occupied.has(index);
      overlay.capture.visible = valid.has(index) && occupied.has(index);
      overlay.check.visible =
        !!state.checkedKing &&
        state.checkedKing.row === row &&
        state.checkedKing.col === col;
    });

    const king = state.checkedKing
      ? living.find(
          p =>
            p.row === state.checkedKing!.row &&
            p.col === state.checkedKing!.col,
        )
      : undefined;
    // Only the selected piece's square is highlighted; the piece keeps its colour.
    pieces.forEach(p => glowOf(p).setRGB(0, 0, 0));
    checkedKingId = king ? king.id : null;
    requestRender();
  };

  // Rendering only happens while something is moving, to save battery.
  let frameRequested = false;
  const requestRender = () => {
    if (!frameRequested) {
      frameRequested = true;
      requestAnimationFrame(tick);
    }
  };

  const tick = (now: number) => {
    frameRequested = false;
    let busy = false;

    pieces = pieces.filter(piece => {
      const { group, blob } = piece;
      const blobMaterial = blob.material as THREE.MeshBasicMaterial;

      // Glide from square to square along a low arc.
      const t =
        piece.moveMs > 0
          ? Math.min((now - piece.moveStart) / piece.moveMs, 1)
          : 1;
      const eased = easeInOut(t);
      group.position.lerpVectors(piece.from, piece.to, eased);
      const hop = t < 1 ? Math.sin(Math.PI * eased) * piece.arc : 0;
      if (t < 1) busy = true;
      else piece.moveMs = 0;
      group.position.y = hop;
      blob.position.x = group.position.x;
      blob.position.z = group.position.z;
      // The shadow shrinks and fades a little while the piece is in the air.
      const air = piece.arc > 0 ? hop / piece.arc : 0;
      blob.scale.setScalar(1 - air * 0.25);
      blobMaterial.opacity = 1 - air * 0.4;

      // New pieces (undo, promotion) grow out of the board.
      if (piece.appearStart !== null) {
        const appearT = Math.min((now - piece.appearStart) / ADD_MS, 1);
        const size = Math.max(easeOut(appearT), 0.001);
        group.scale.setScalar(PIECE_SIZE * size);
        blob.scale.setScalar(size);
        if (appearT < 1) busy = true;
        else piece.appearStart = null;
      }

      // Captured pieces topple over and sink away.
      if (piece.removeStart !== null) {
        const elapsed = now - piece.removeStart - piece.removeDelay;
        busy = true;
        if (elapsed > 0) {
          const removeT = Math.min(elapsed / REMOVE_MS, 1);
          const fall = easeOut(removeT);
          group.rotation.z = fall * (isWhite(piece.symbol) ? -1.2 : 1.2);
          group.position.y = -fall * 0.5;
          piece.material.opacity = 1 - removeT;
          piece.extras.forEach(extra => (extra.opacity = 1 - removeT));
          blobMaterial.opacity = 1 - removeT;
          if (removeT >= 1) {
            // The piece's shapes are shared with other pieces, so they stay.
            scene.remove(group, blob);
            piece.material.dispose();
            piece.extras.forEach(extra => extra.dispose());
            blobMaterial.dispose();
            return false;
          }
        }
      }
      return true;
    });

    // The king in check glows red.
    if (checkedKingId !== null) {
      const king = pieces.find(p => p.id === checkedKingId);
      if (king) {
        busy = true;
        const glow = 0.35 + 0.25 * Math.sin(now / 180);
        glowOf(king).setRGB(glow, 0, 0);
      }
    }

    renderer.render(scene, camera);
    if (busy) requestRender();
  };

  // Fit the whole board, seen from straight above, in the view. White is at
  // the bottom of the screen and black at the top; the board never turns.
  const resize = () => {
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = document.documentElement.clientHeight || window.innerHeight;
    // The canvas is stretched to the page by CSS, so only the drawing size changes.
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const vertical = (camera.fov * Math.PI) / 180;
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    // Just past the squares and their letters, at board level.
    const halfBoard = 4.6;
    const distance = halfBoard / Math.tan(Math.min(horizontal, vertical) / 2);
    camera.position.set(0, distance, 0);
    camera.up.set(0, 0, -1); // black's side at the top of the screen
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    requestRender();
  };
  window.addEventListener('resize', resize);
  resize();

  // A tap goes to the square under the finger when that square is a move for
  // the selected piece, even if a piece standing in front covers it on screen.
  // Otherwise it goes to the piece touched, or else the square.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', event => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const boardPoint = raycaster.ray.intersectPlane(
      boardPlane,
      new THREE.Vector3(),
    );
    const square = boardPoint ? squareAt(boardPoint) : null;
    if (square && validTargets.has(square.row * 8 + square.col)) {
      send({ type: 'press', row: square.row, col: square.col });
      return;
    }
    const pieceGroups = pieces
      .filter(p => p.removeStart === null)
      .map(p => p.group);
    const pieceHit = raycaster.intersectObjects(pieceGroups, true)[0];
    const pieceId = pieceHit?.object.userData.pieceId as number | undefined;
    const piece =
      pieceId !== undefined ? pieces.find(p => p.id === pieceId) : undefined;
    const target = piece ? { row: piece.row, col: piece.col } : square;
    if (target) send({ type: 'press', row: target.row, col: target.col });
  });

  const squareToPage = (row: number, col: number, height = 0) => {
    const point = new THREE.Vector3(squareX(col), height, squareZ(row)).project(
      camera,
    );
    const rect = renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + ((point.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - point.y) / 2) * rect.height,
    };
  };

  window.board3d = { receive, squareToPage };
  renderer.render(scene, camera);
  send({ type: 'ready' });
}

start();
