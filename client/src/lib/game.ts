import * as THREE from 'three';

export function initializeGame(
  container: HTMLElement,
  onScoreUpdate: (score: number) => void,
  onGameOver: () => void
) {
  const counterDOM = document.createElement("div");
  counterDOM.id = "counter";
  counterDOM.style.display = "none";

  const endDOM = document.createElement("div");
  endDOM.id = "end";
  endDOM.style.visibility = "hidden";

  container.appendChild(counterDOM);
  container.appendChild(endDOM);

  if (!THREE) {
    console.error("Three.js not loaded");
    return null;
  }

  // Initialize audio
  const jumpAudio = new Audio("https://cdn.builder.io/o/assets%2F6ccb46757eb14f64852d56e691f250e2%2F7475201ea65542a18ce807cf0d4c5864?alt=media&token=58705ae3-5c1e-4f3e-ad41-9ea48df6ffb2&apiKey=6ccb46757eb14f64852d56e691f250e2");
  jumpAudio.volume = 0.5;
  const roadAudio = new Audio("https://cdn.builder.io/o/assets%2F6ccb46757eb14f64852d56e691f250e2%2Fb118fa664daf4256bbea53e0dee7dfd5?alt=media&token=a9fa320c-002d-4a8d-9159-c437fe52bee2&apiKey=6ccb46757eb14f64852d56e691f250e2");
  roadAudio.volume = 0.3;
  roadAudio.loop = true;
  const hitAudio = new Audio("https://cdn.builder.io/o/assets%2F6ccb46757eb14f64852d56e691f250e2%2Fca415679cca74802adb4fd119aef6278?alt=media&token=9244ec1b-e0d4-4ccc-ace7-5c6d01171376&apiKey=6ccb46757eb14f64852d56e691f250e2");
  hitAudio.volume = 0.7;
  let isRoadAudioPlaying = false;
  let lastVehicleCollisionTime = 0;
  let animationFrameId: number | null = null;
  let isGameRunning = true;

  const scene = new THREE.Scene();

  const distance = 500;
  const camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    0.1,
    10000
  );

  camera.rotation.x = (50 * Math.PI) / 180;
  camera.rotation.y = (20 * Math.PI) / 180;
  camera.rotation.z = (10 * Math.PI) / 180;

  const initialCameraPositionY = -Math.tan(camera.rotation.x) * distance;
  const initialCameraPositionX =
    Math.tan(camera.rotation.y) *
    Math.sqrt(distance ** 2 + initialCameraPositionY ** 2);
  camera.position.y = initialCameraPositionY;
  camera.position.x = initialCameraPositionX;
  camera.position.z = distance;

  const zoom = 2;
  const chickenSize = 15;
  const positionWidth = 42;
  const columns = 17;
  const boardWidth = positionWidth * columns;
  const stepTime = 200;

  let lanes: any[];
  let currentLane: number;
  let currentColumn: number;
  let previousTimestamp: number | null;
  let startMoving: boolean;
  let moves: string[];
  let stepStartTimestamp: number | null;

  const laneTypes = ["car", "truck", "forest"];
  const laneSpeeds = [2, 2.5, 3];
  const vechicleColors = [0xa52523, 0xbdb638, 0x78b14b];
  const threeHeights = [20, 45, 60];

  function Texture(width: number, height: number, rects: any[]) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(0,0,0,0.6)";
    rects.forEach((rect) => {
      context.fillRect(rect.x, rect.y, rect.w, rect.h);
    });
    return new THREE.CanvasTexture(canvas);
  }

  const carFrontTexture = Texture(40, 80, [{ x: 0, y: 10, w: 30, h: 60 }]);
  const carBackTexture = Texture(40, 80, [{ x: 10, y: 10, w: 30, h: 60 }]);
  const carRightSideTexture = Texture(110, 40, [
    { x: 10, y: 0, w: 50, h: 30 },
    { x: 70, y: 0, w: 30, h: 30 },
  ]);
  const carLeftSideTexture = Texture(110, 40, [
    { x: 10, y: 10, w: 50, h: 30 },
    { x: 70, y: 10, w: 30, h: 30 },
  ]);

  const truckFrontTexture = Texture(30, 30, [{ x: 15, y: 0, w: 10, h: 30 }]);
  const truckRightSideTexture = Texture(25, 30, [{ x: 0, y: 15, w: 10, h: 10 }]);
  const truckLeftSideTexture = Texture(25, 30, [{ x: 0, y: 5, w: 10, h: 10 }]);

  function Wheel() {
    const wheel = new THREE.Mesh(
      new THREE.BoxGeometry(12 * zoom, 33 * zoom, 12 * zoom),
      new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true })
    );
    wheel.position.z = 6 * zoom;
    return wheel;
  }

  function Car() {
    const car = new THREE.Group();
    const color = vechicleColors[Math.floor(Math.random() * vechicleColors.length)];

    const main = new THREE.Mesh(
      new THREE.BoxGeometry(60 * zoom, 30 * zoom, 15 * zoom),
      new THREE.MeshPhongMaterial({ color, flatShading: true })
    );
    main.position.z = 12 * zoom;
    main.castShadow = true;
    main.receiveShadow = true;
    car.add(main);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(33 * zoom, 24 * zoom, 12 * zoom),
      [
        new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carBackTexture }),
        new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carFrontTexture }),
        new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carRightSideTexture }),
        new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carLeftSideTexture }),
        new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
      ]
    );
    cabin.position.x = 6 * zoom;
    cabin.position.z = 25.5 * zoom;
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    car.add(cabin);

    const frontWheel = Wheel();
    frontWheel.position.x = -18 * zoom;
    car.add(frontWheel);

    const backWheel = Wheel();
    backWheel.position.x = 18 * zoom;
    car.add(backWheel);

    car.castShadow = true;
    car.receiveShadow = false;

    return car;
  }

  function Truck() {
    const truck = new THREE.Group();
    const color = vechicleColors[Math.floor(Math.random() * vechicleColors.length)];

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(100 * zoom, 25 * zoom, 5 * zoom),
      new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true })
    );
    base.position.z = 10 * zoom;
    truck.add(base);

    const cargo = new THREE.Mesh(
      new THREE.BoxGeometry(75 * zoom, 35 * zoom, 40 * zoom),
      new THREE.MeshPhongMaterial({ color: 0xb4c6fc, flatShading: true })
    );
    cargo.position.x = 15 * zoom;
    cargo.position.z = 30 * zoom;
    cargo.castShadow = true;
    cargo.receiveShadow = true;
    truck.add(cargo);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(25 * zoom, 30 * zoom, 30 * zoom),
      [
        new THREE.MeshPhongMaterial({ color, flatShading: true }),
        new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckFrontTexture }),
        new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckRightSideTexture }),
        new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckLeftSideTexture }),
        new THREE.MeshPhongMaterial({ color, flatShading: true }),
        new THREE.MeshPhongMaterial({ color, flatShading: true }),
      ]
    );
    cabin.position.x = -40 * zoom;
    cabin.position.z = 20 * zoom;
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    truck.add(cabin);

    const frontWheel = Wheel();
    frontWheel.position.x = -38 * zoom;
    truck.add(frontWheel);

    const middleWheel = Wheel();
    middleWheel.position.x = -10 * zoom;
    truck.add(middleWheel);

    const backWheel = Wheel();
    backWheel.position.x = 30 * zoom;
    truck.add(backWheel);

    return truck;
  }

  function Tree() {
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.BoxGeometry(15 * zoom, 15 * zoom, 20 * zoom),
      new THREE.MeshPhongMaterial({ color: 0x4d2926, flatShading: true })
    );
    trunk.position.z = 10 * zoom;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const height = threeHeights[Math.floor(Math.random() * threeHeights.length)];

    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(30 * zoom, 30 * zoom, height * zoom),
      new THREE.MeshLambertMaterial({ color: 0x7aa21d, flatShading: true })
    );
    crown.position.z = (height / 2 + 20) * zoom;
    crown.castShadow = true;
    crown.receiveShadow = false;
    tree.add(crown);

    return tree;
  }

  function Chicken() {
    const chicken = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(chickenSize * zoom, chickenSize * zoom, 20 * zoom),
      new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true })
    );
    body.position.z = 10 * zoom;
    body.castShadow = true;
    body.receiveShadow = true;
    chicken.add(body);

    const rowel = new THREE.Mesh(
      new THREE.BoxGeometry(2 * zoom, 4 * zoom, 2 * zoom),
      new THREE.MeshLambertMaterial({ color: 0xf0619a, flatShading: true })
    );
    rowel.position.z = 21 * zoom;
    rowel.castShadow = true;
    rowel.receiveShadow = false;
    chicken.add(rowel);

    return chicken;
  }

  function Road() {
    const road = new THREE.Group();

    const createSection = (color: number) =>
      new THREE.Mesh(
        new THREE.PlaneGeometry(boardWidth * zoom, positionWidth * zoom),
        new THREE.MeshPhongMaterial({ color })
      );

    const middle = createSection(0x454a59);
    middle.receiveShadow = true;
    road.add(middle);

    const left = createSection(0x393d49);
    left.position.x = -boardWidth * zoom;
    road.add(left);

    const right = createSection(0x393d49);
    right.position.x = boardWidth * zoom;
    road.add(right);

    return road;
  }

  function Grass() {
    const grass = new THREE.Group();

    const createSection = (color: number) =>
      new THREE.Mesh(
        new THREE.BoxGeometry(boardWidth * zoom, positionWidth * zoom, 3 * zoom),
        new THREE.MeshPhongMaterial({ color })
      );

    const middle = createSection(0xbaf455);
    middle.receiveShadow = true;
    grass.add(middle);

    const left = createSection(0x99c846);
    left.position.x = -boardWidth * zoom;
    grass.add(left);

    const right = createSection(0x99c846);
    right.position.x = boardWidth * zoom;
    grass.add(right);

    grass.position.z = 1.5 * zoom;
    return grass;
  }

  function Lane(index: number): any {
    const lane: any = { index };
    lane.type = index <= 0 ? "field" : laneTypes[Math.floor(Math.random() * laneTypes.length)];

    switch (lane.type) {
      case "field":
        lane.mesh = Grass();
        break;
      case "forest":
        lane.mesh = Grass();
        lane.occupiedPositions = new Set();
        lane.trees = [1, 2, 3, 4].map(() => {
          const tree = Tree();
          let position;
          do {
            position = Math.floor(Math.random() * columns);
          } while (lane.occupiedPositions.has(position));
          lane.occupiedPositions.add(position);
          tree.position.x =
            (position * positionWidth + positionWidth / 2) * zoom - (boardWidth * zoom) / 2;
          lane.mesh.add(tree);
          return tree;
        });
        break;
      case "car":
        lane.mesh = Road();
        lane.direction = Math.random() >= 0.5;
        const carOccupiedPositions = new Set();
        lane.vechicles = [1, 2, 3].map(() => {
          const vechicle = Car();
          let position;
          do {
            position = Math.floor((Math.random() * columns) / 2);
          } while (carOccupiedPositions.has(position));
          carOccupiedPositions.add(position);
          vechicle.position.x =
            (position * positionWidth * 2 + positionWidth / 2) * zoom - (boardWidth * zoom) / 2;
          if (!lane.direction) vechicle.rotation.z = Math.PI;
          lane.mesh.add(vechicle);
          return vechicle;
        });
        lane.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
        break;
      case "truck":
        lane.mesh = Road();
        lane.direction = Math.random() >= 0.5;
        const truckOccupiedPositions = new Set();
        lane.vechicles = [1, 2].map(() => {
          const vechicle = Truck();
          let position;
          do {
            position = Math.floor((Math.random() * columns) / 3);
          } while (truckOccupiedPositions.has(position));
          truckOccupiedPositions.add(position);
          vechicle.position.x =
            (position * positionWidth * 3 + positionWidth / 2) * zoom - (boardWidth * zoom) / 2;
          if (!lane.direction) vechicle.rotation.z = Math.PI;
          lane.mesh.add(vechicle);
          return vechicle;
        });
        lane.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
        break;
    }

    return lane;
  }

  const generateLanes = () =>
    [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      .map((index) => {
        const lane = Lane(index);
        lane.mesh.position.y = index * positionWidth * zoom;
        scene.add(lane.mesh);
        return lane;
      })
      .filter((lane: any) => lane.index >= 0);

  const addLane = () => {
    const index = lanes.length;
    const lane = Lane(index);
    lane.mesh.position.y = index * positionWidth * zoom;
    scene.add(lane.mesh);
    lanes.push(lane);
  };

  const chicken = Chicken();
  scene.add(chicken);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
  scene.add(hemiLight);

  const initialDirLightPositionX = -100;
  const initialDirLightPositionY = -100;
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
  dirLight.castShadow = true;
  dirLight.target = chicken;
  scene.add(dirLight);

  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  const d = 500;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;

  const backLight = new THREE.DirectionalLight(0x000000, 0.4);
  backLight.position.set(200, 200, 50);
  backLight.castShadow = true;
  scene.add(backLight);

  const initialiseValues = () => {
    lanes = generateLanes();
    currentLane = 0;
    currentColumn = Math.floor(columns / 2);
    previousTimestamp = null;
    startMoving = false;
    moves = [];
    stepStartTimestamp = null;

    chicken.position.x = 0;
    chicken.position.y = 0;

    camera.position.y = initialCameraPositionY;
    camera.position.x = initialCameraPositionX;

    dirLight.position.x = initialDirLightPositionX;
    dirLight.position.y = initialDirLightPositionY;
  };

  initialiseValues();

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  function move(direction: string) {
    const finalPositions = moves.reduce(
      (position: any, move: string) => {
        if (move === "forward") return { lane: position.lane + 1, column: position.column };
        if (move === "backward") return { lane: position.lane - 1, column: position.column };
        if (move === "left") return { lane: position.lane, column: position.column - 1 };
        if (move === "right") return { lane: position.lane, column: position.column + 1 };
        return position;
      },
      { lane: currentLane, column: currentColumn }
    );

    if (direction === "forward") {
      if (
        lanes[finalPositions.lane + 1].type === "forest" &&
        lanes[finalPositions.lane + 1].occupiedPositions.has(finalPositions.column)
      )
        return;
      if (!stepStartTimestamp) startMoving = true;
      addLane();
    } else if (direction === "backward") {
      if (finalPositions.lane === 0) return;
      if (
        lanes[finalPositions.lane - 1].type === "forest" &&
        lanes[finalPositions.lane - 1].occupiedPositions.has(finalPositions.column)
      )
        return;
      if (!stepStartTimestamp) startMoving = true;
    } else if (direction === "left") {
      if (finalPositions.column === 0) return;
      if (
        lanes[finalPositions.lane].type === "forest" &&
        lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column - 1)
      )
        return;
      if (!stepStartTimestamp) startMoving = true;
    } else if (direction === "right") {
      if (finalPositions.column === columns - 1) return;
      if (
        lanes[finalPositions.lane].type === "forest" &&
        lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column + 1)
      )
        return;
      if (!stepStartTimestamp) startMoving = true;
    }
    moves.push(direction);

    // Play jump sound
    jumpAudio.currentTime = 0;
    jumpAudio.play().catch(() => {
      // Silently handle autoplay restrictions
    });
  }

  function animate(timestamp: number) {
    if (!isGameRunning) return;
    animationFrameId = requestAnimationFrame(animate);

    if (!previousTimestamp) previousTimestamp = timestamp;
    const delta = timestamp - previousTimestamp;
    previousTimestamp = timestamp;

    lanes.forEach((lane: any) => {
      if (lane.type === "car" || lane.type === "truck") {
        const aBitBeforeTheBeginingOfLane = (-boardWidth * zoom) / 2 - positionWidth * 2 * zoom;
        const aBitAfterTheEndOFLane = (boardWidth * zoom) / 2 + positionWidth * 2 * zoom;
        lane.vechicles.forEach((vechicle: any) => {
          if (lane.direction) {
            vechicle.position.x =
              vechicle.position.x < aBitBeforeTheBeginingOfLane
                ? aBitAfterTheEndOFLane
                : (vechicle.position.x -= (lane.speed / 16) * delta);
          } else {
            vechicle.position.x =
              vechicle.position.x > aBitAfterTheEndOFLane
                ? aBitBeforeTheBeginingOfLane
                : (vechicle.position.x += (lane.speed / 16) * delta);
          }
        });
      }
    });

    if (startMoving) {
      stepStartTimestamp = timestamp;
      startMoving = false;
    }

    if (stepStartTimestamp) {
      const moveDeltaTime = timestamp - stepStartTimestamp;
      const moveDeltaDistance = Math.min(moveDeltaTime / stepTime, 1) * positionWidth * zoom;
      const jumpDeltaDistance = Math.sin(Math.min(moveDeltaTime / stepTime, 1) * Math.PI) * 8 * zoom;

      switch (moves[0]) {
        case "forward": {
          const positionY = currentLane * positionWidth * zoom + moveDeltaDistance;
          camera.position.y = initialCameraPositionY + positionY;
          dirLight.position.y = initialDirLightPositionY + positionY;
          chicken.position.y = positionY;
          chicken.position.z = jumpDeltaDistance;
          break;
        }
        case "backward": {
          const positionY = currentLane * positionWidth * zoom - moveDeltaDistance;
          camera.position.y = initialCameraPositionY + positionY;
          dirLight.position.y = initialDirLightPositionY + positionY;
          chicken.position.y = positionY;
          chicken.position.z = jumpDeltaDistance;
          break;
        }
        case "left": {
          const positionX =
            (currentColumn * positionWidth + positionWidth / 2) * zoom -
            (boardWidth * zoom) / 2 -
            moveDeltaDistance;
          camera.position.x = initialCameraPositionX + positionX;
          dirLight.position.x = initialDirLightPositionX + positionX;
          chicken.position.x = positionX;
          chicken.position.z = jumpDeltaDistance;
          break;
        }
        case "right": {
          const positionX =
            (currentColumn * positionWidth + positionWidth / 2) * zoom -
            (boardWidth * zoom) / 2 +
            moveDeltaDistance;
          camera.position.x = initialCameraPositionX + positionX;
          dirLight.position.x = initialDirLightPositionX + positionX;
          chicken.position.x = positionX;
          chicken.position.z = jumpDeltaDistance;
          break;
        }
      }

      if (moveDeltaTime > stepTime) {
        switch (moves[0]) {
          case "forward":
            currentLane++;
            onScoreUpdate(currentLane);
            break;
          case "backward":
            currentLane--;
            onScoreUpdate(currentLane);
            break;
          case "left":
            currentColumn--;
            break;
          case "right":
            currentColumn++;
            break;
        }
        moves.shift();
        stepStartTimestamp = moves.length === 0 ? null : timestamp;
      }
    }

    // Check for collision in current lane
    if (lanes[currentLane].type === "car" || lanes[currentLane].type === "truck") {
      const chickenMinX = chicken.position.x - (chickenSize * zoom) / 2;
      const chickenMaxX = chicken.position.x + (chickenSize * zoom) / 2;
      const vehicleLengths: { car: number; truck: number } = { car: 60, truck: 105 };
      const vechicleLength = vehicleLengths[lanes[currentLane].type as "car" | "truck"];

      lanes[currentLane].vechicles.forEach((vechicle: any) => {
        const carMinX = vechicle.position.x - (vechicleLength * zoom) / 2;
        const carMaxX = vechicle.position.x + (vechicleLength * zoom) / 2;
        if (chickenMaxX > carMinX && chickenMinX < carMaxX) {
          // Play hit sound on collision
          hitAudio.currentTime = 0;
          hitAudio.play().catch(() => {
            // Silently handle autoplay restrictions
          });
          if (Date.now() - lastVehicleCollisionTime > 300) {
            lastVehicleCollisionTime = Date.now();
          }
          onGameOver();
        }
      });
    }

    // Check if any vehicles are nearby in any lane (within 3 lanes distance)
    let vehiclesNearby = false;
    const nearbyLaneRange = 3;

    for (let i = Math.max(0, currentLane - nearbyLaneRange); i <= Math.min(lanes.length - 1, currentLane + nearbyLaneRange); i++) {
      if (lanes[i].type === "car" || lanes[i].type === "truck") {
        if (lanes[i].vechicles && lanes[i].vechicles.length > 0) {
          vehiclesNearby = true;
          break;
        }
      }
    }

    // Play road audio when vehicles are nearby, stop otherwise
    if (vehiclesNearby) {
      if (!isRoadAudioPlaying) {
        isRoadAudioPlaying = true;
        roadAudio.play().catch(() => {
          // Silently handle autoplay restrictions
        });
      }
    } else {
      if (isRoadAudioPlaying) {
        isRoadAudioPlaying = false;
        roadAudio.pause();
        roadAudio.currentTime = 0;
      }
    }

    renderer.render(scene, camera);
  }

  animationFrameId = requestAnimationFrame(animate);

  const stop = () => {
    isGameRunning = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    roadAudio.pause();
    jumpAudio.pause();
  };

  const retry = () => {
    lanes.forEach((lane: any) => scene.remove(lane.mesh));
    roadAudio.pause();
    roadAudio.currentTime = 0;
    isRoadAudioPlaying = false;
    isGameRunning = true;
    initialiseValues();
    animationFrameId = requestAnimationFrame(animate);
  };

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    // Arrow keys
    if (event.keyCode === 38 || key === "arrowup") move("forward");
    else if (event.keyCode === 40 || key === "arrowdown") move("backward");
    else if (event.keyCode === 37 || key === "arrowleft") move("left");
    else if (event.keyCode === 39 || key === "arrowright") move("right");

    // WASD keys
    else if (key === "w") move("forward");
    else if (key === "s") move("backward");
    else if (key === "a") move("left");
    else if (key === "d") move("right");
  });

  return {
    move,
    retry,
    stop,
  };
}
