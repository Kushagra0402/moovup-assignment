import type { RateLimiter } from "./types/rateLimiter.js";
import type { User } from "./types/user.js";
import type { BucketState } from "./types/bucketState.js";

//creates a new rate limiter for a given capacity and leakRate
export function createRateLimiter(capacity: number, leakRate: number): RateLimiter {
    return {
       capacity: capacity,
       leakRate: leakRate,
       users: new Map<string, User>()
    };
}

// Determines if a request is allowed
export function allowRequest(limiter: RateLimiter, userId: string, timestamp: number): [boolean, RateLimiter] {
    
    // extract current user info . If first time user, create the record.
    const user = limiter.users.get(userId) || { requestCount: 0, lastCheck: timestamp };
    
    //current bucket request count for the user
    const currentUserRequestCount = calculateCurrentUserRequestCount(limiter, user, timestamp);

    //check if the incoming request is allowed.
    const isAllowed = currentUserRequestCount + 1 <= limiter.capacity

    //update the request count of the user
    const updatedUserRequestCount = isAllowed ? currentUserRequestCount + 1: currentUserRequestCount;
    
    //Preventing mutation by updating a copy of users. 
    const newUserMap = new Map(limiter.users);
    newUserMap.set(userId, {
        requestCount: updatedUserRequestCount,
        lastCheck: timestamp
    })

    //Preventing mutation by updating a copy of limiter
    const updatedLimiter = {
        ...limiter,
        users: newUserMap
    }

    //returning [boolean_allowed, new_limiter_state]
    return [isAllowed, updatedLimiter]
}


//Important: This is only for lookup. It will not update user's requestCount or lastCheck in the global map, since that anyways happens in allowRequest and updating here will defeat the purpose of the API which is to only do bucket lookup at any point
export function getBucketState(limiter:RateLimiter, userId: string): BucketState|null {

    //Extract user info from userId.
    const user = limiter.users.get(userId);

    //If no user found, return null.
    if (!user){
        return null;
    }

    const currentTimeStamp = Date.now()/1000;

    //checking current request count of the user based on the time elapsed and leak rate.
    const currentUserRequestCount = calculateCurrentUserRequestCount(limiter,user,currentTimeStamp);

    return {
        userId: userId,
        capacity:limiter.capacity,
        leakRate: limiter.leakRate,
        requestCount: currentUserRequestCount,
        lastCheck: currentTimeStamp
    }
}

// Helper function to avoid duplication, required to calculate the current user request count based on the the amount leaked from the bucket since the last time the leak was checked. 
function calculateCurrentUserRequestCount(limiter:RateLimiter, user:User, timestamp: number): number{
    const timeElapsed = timestamp - user.lastCheck;
    const leakedNumberOfRequests = timeElapsed > 0 ? (timeElapsed * limiter.leakRate) : 0;
    const currentUserRequestCount = Math.max(user.requestCount - leakedNumberOfRequests, 0)
    return currentUserRequestCount;
}
