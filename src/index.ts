import { KeyDisplay } from './utils';
import { CharacterControls } from './characterControls';
import * as THREE from 'three'
import { CameraHelper } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as YUKA from 'yuka';

// Ensure Vector3 is imported from Three.js
import { Vector3 } from 'three';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 5;
camera.position.z = 5;
camera.position.x = 0;

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true

// CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true
orbitControls.minDistance = 5
orbitControls.maxDistance = 15
orbitControls.enablePan = false
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05
orbitControls.update();

// LIGHTS
light()

// FLOOR
generateFloor()

// MODEL WITH ANIMATIONS
var characterControls: CharacterControls
new GLTFLoader().load('models/Soldier.glb', function (gltf) {
    const model = gltf.scene;
    model.traverse(function (object: any) {
        if (object.isMesh) object.castShadow = true;
    });
    scene.add(model);

    const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap: Map<string, THREE.AnimationAction> = new Map()
    gltfAnimations.filter(a => a.name != 'TPose').forEach((a: THREE.AnimationClip) => {
        animationsMap.set(a.name, mixer.clipAction(a))
    })

    // Initialize the global characterControlsInstance
    characterControlsInstance = new CharacterControls(model, mixer, animationsMap, orbitControls, camera, 'Idle');
});

// CONTROL KEYS
const keysPressed = {  }
const keyDisplayQueue = new KeyDisplay();
document.addEventListener('keydown', (event) => {
    keyDisplayQueue.down(event.key)
    if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle()
    } else {
        (keysPressed as any)[event.key.toLowerCase()] = true
    }
}, false);
document.addEventListener('keyup', (event) => {
    keyDisplayQueue.up(event.key);
    (keysPressed as any)[event.key.toLowerCase()] = false
}, false);

const clock = new THREE.Clock();
// ANIMATE
function animate() {
    let mixerUpdateDelta = clock.getDelta();
    if (characterControls) {
        characterControls.update(mixerUpdateDelta, keysPressed);
    }
    orbitControls.update()
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
document.body.appendChild(renderer.domElement);
animate();

// RESIZE HANDLER
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    keyDisplayQueue.updatePosition()
}
window.addEventListener('resize', onWindowResize);

function generateFloor() {
    // TEXTURES
    const textureLoader = new THREE.TextureLoader();
    const placeholder = textureLoader.load("./textures/placeholder/placeholder.png");
    const sandBaseColor = textureLoader.load("./textures/sand/Sand 002_COLOR.jpg");
    const sandNormalMap = textureLoader.load("./textures/sand/Sand 002_NRM.jpg");
    const sandHeightMap = textureLoader.load("./textures/sand/Sand 002_DISP.jpg");
    const sandAmbientOcclusion = textureLoader.load("./textures/sand/Sand 002_OCC.jpg");

    const WIDTH = 80
    const LENGTH = 80

    const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
    const material = new THREE.MeshStandardMaterial(
        {
            map: sandBaseColor, normalMap: sandNormalMap,
            displacementMap: sandHeightMap, displacementScale: 0.1,
            aoMap: sandAmbientOcclusion
        })
    wrapAndRepeatTexture(material.map)
    wrapAndRepeatTexture(material.normalMap)
    wrapAndRepeatTexture(material.displacementMap)
    wrapAndRepeatTexture(material.aoMap)
    // const material = new THREE.MeshPhongMaterial({ map: placeholder})

    const floor = new THREE.Mesh(geometry, material)
    floor.receiveShadow = true
    floor.rotation.x = - Math.PI / 2
    scene.add(floor)
}

function wrapAndRepeatTexture (map: THREE.Texture) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.repeat.x = map.repeat.y = 10
}

function light() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.7))

    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(- 60, 100, - 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = - 50;
    dirLight.shadow.camera.left = - 50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    scene.add(dirLight);
    // scene.add( new THREE.CameraHelper(dirLight.shadow.camera))
}

// Create a Yuka vehicle
const vehicle = new YUKA.Vehicle();
vehicle.position.set(0, 0, 0); // Initial position
vehicle.maxSpeed = 6; // Increase speed to 3 times the original

// Define a target position
const target = new Vector3(10, 0, 10);
const seekBehavior = new YUKA.SeekBehavior(target);
vehicle.steering.add(seekBehavior);

// Create a time instance for updates
const time = new YUKA.Time();

// Link the Yuka vehicle to a Three.js object
const threeObject = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
scene.add(threeObject);

// Define a bounding area for the AI to roam freely
const boundingBox = {
    min: new Vector3(-50, 0, -50),
    max: new Vector3(50, 0, 50)
};

// Function to generate a random target within the bounding box
function getRandomTarget() {
    return new Vector3(
        Math.random() * (boundingBox.max.x - boundingBox.min.x) + boundingBox.min.x,
        0,
        Math.random() * (boundingBox.max.z - boundingBox.min.z) + boundingBox.min.z
    );
}

// Update the target position periodically
setInterval(() => {
    const newTarget = getRandomTarget();
    seekBehavior.target.copy(newTarget);
}, 5000); // Change target every 5 seconds

// Update the logic to make the AI run away from the character model
function runAwayFromCharacter() {
    if (characterControls && characterControls.currentAction === 'Run') { // Check if the character is running
        const directionAway = new Vector3().subVectors(vehicle.position, characterControls.model.position).normalize();
        const newTarget = vehicle.position.clone().add(directionAway.multiplyScalar(10)); // Move 10 units away
        seekBehavior.target.copy(newTarget);
    }
}

// Update the logic to make the AI approach the character model when it is idle
function approachCharacter() {
    if (characterControls && characterControls.currentAction === 'Idle') { // Check if the character is idle
        const directionToCharacter = new Vector3().subVectors(characterControls.model.position, vehicle.position).normalize();
        const newTarget = vehicle.position.clone().add(directionToCharacter.multiplyScalar(2)); // Move 10 units closer
        seekBehavior.target.copy(newTarget);
    }
}

// Periodically check the character's state and update the AI's behavior
setInterval(() => {
    if (characterControls) {
        if (characterControls.currentAction === 'Run') {
            runAwayFromCharacter();
        } else if (characterControls.currentAction === 'Idle') {
            approachCharacter();
        }
    }
}, 1000); // Check every second

// Add 10 boxes to the scene, each with its own AI behavior
const boxVehicles: { mesh: THREE.Mesh; vehicle: YUKA.Vehicle }[] = [];
for (let i = 0; i < 10; i++) {
    const box = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
    );
    box.position.set(
        Math.random() * 100 - 50, // Random x position between -50 and 50
        0.5, // Slightly above the ground
        Math.random() * 100 - 50  // Random z position between -50 and 50
    );
    box.castShadow = true;
    scene.add(box);

    // Create a Yuka vehicle for the box
    const boxVehicle = new YUKA.Vehicle();
    boxVehicle.position.copy(box.position);
    boxVehicle.maxSpeed = 4; // Set a speed for the box AI

    // Add a random roaming behavior
    const boxTarget = getRandomTarget();
    const boxSeekBehavior = new YUKA.SeekBehavior(boxTarget);
    boxVehicle.steering.add(boxSeekBehavior);

    // Periodically update the target for random roaming
    setInterval(() => {
        const newTarget = getRandomTarget();
        boxSeekBehavior.target.copy(newTarget);
    }, 5000); // Change target every 5 seconds

    boxVehicles.push({ mesh: box, vehicle: boxVehicle });
}

// Update loop for all box vehicles
function updateBoxVehicles(delta: number) {
    boxVehicles.forEach(({ mesh, vehicle }) => {
        vehicle.update(delta);
        mesh.position.copy(vehicle.position);
    });
}

// Update the main update loop to include box vehicles
function update() {
    const delta = time.update().getDelta();
    vehicle.update(delta);
    threeObject.position.copy(vehicle.position);

    updateBoxVehicles(delta); // Update all box vehicles

    requestAnimationFrame(update);
}
update();

// Fix the emoji texture path
const emojiTexture = new THREE.TextureLoader().load('./textures/emoji.png'); // Ensure the emoji.png file exists in the textures folder