import type { User } from "./user.js";

export interface RateLimiter {
    capacity: number;
    leakRate: number;
    users: Map<string, User>
}