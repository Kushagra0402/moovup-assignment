import type { BucketState } from "../bucketState.js";

export type BucketStateResponse = 
    | {
        success: true;
        bucket: BucketState
    } | {
        error:string;
        message: string;
    }