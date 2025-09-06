declare module 'yuka' {
    import { Vector3 } from 'three';

    export class Vehicle {
        position: Vector3;
        maxSpeed: number;
        steering: {
            add(behavior: SteeringBehavior): void;
        };
        update(delta: number): void;
    }

    export class SteeringBehavior {}

    export class SeekBehavior extends SteeringBehavior {
        constructor(target: Vector3);
        target: Vector3;
    }

    export class Time {
        update(): { getDelta(): number };
    }
}
