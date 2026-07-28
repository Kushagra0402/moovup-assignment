import type { User } from "./user.js";

export interface BucketState extends User {
    userId: string;
    capacity: number;
    leakRate: number;
}