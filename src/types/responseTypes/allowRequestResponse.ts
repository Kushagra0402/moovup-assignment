import type { BucketState } from "../bucketState.js";

export type AllowRequestResponse = 
    | { 
        success: true;
        message: string;
        bucket: BucketState|null
    } | {
        error: string;
        message: string;
    }