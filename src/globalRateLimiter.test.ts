import { describe,it,expect, beforeEach, afterEach, vi} from "vitest";
import { allowRequest, createRateLimiter, getBucketState } from "./globalRateLimiter.js";
import type { RateLimiter } from "./types/rateLimiter.js";
import type { User } from "./types/user.js";

describe('Leaky Bucket Rate Limiter' , ()=>{

    beforeEach(()=>{
        vi.useFakeTimers();
        vi.setSystemTime(0); //Mocking current time
    });

    afterEach(()=>{
        vi.useRealTimers();
    });
    it('allows the request if they do not fill up the bucket',()=>{
        let limiter:RateLimiter = createRateLimiter(5,1.0);
        let allowed1:boolean, allowed2: boolean;

        //request 1 at timestamp 0 should be allowed
        [allowed1, limiter] =  allowRequest(limiter, "user-1", 0);
        expect(allowed1).toBe(true);

        //request 2 at timestamp 1 should be allowed. Also 1 request should be leaked within this time.
        [allowed2, limiter] =  allowRequest(limiter, "user-1", 1);
        expect(allowed2).toBe(true);

        //Total requests made = 2. 1 request should be leaked within the timestamps 0->1.So request count should be 2-1=1.
        let user = limiter.users.get("user-1");
        expect (user?.requestCount).toBe(1);
    });

    it('handles bursts and rejects requests exceeding bucket capacity', ()=>{
        let limiter:RateLimiter = createRateLimiter(5,1.0);
        let allowed:boolean;
        //We will fill up the bucket to its capacity initially at 0th timestamp, and each request should be allowed.
        for(let i = 0; i<5;i++){
            [allowed, limiter] = allowRequest(limiter, "user-1",0);
            expect(allowed).toBe(true);
        }

        //We make one more request at 0th timestamp itself to exceed the capacity.
        [allowed, limiter] = allowRequest(limiter, "user-1",0);

        //Once request exceeded bucket capacity,it should be rejected.
        expect(allowed).toBe(false);

        let user = limiter.users.get("user-1");
        //The request count of the user should be the limiter bucket capacity after rejection.
        expect(user?.requestCount).toBe(5);
    })

    it('allows requests after time-based-leaking',()=>{
        let limiter:RateLimiter = createRateLimiter(5,1.0);
        let allowed:boolean;
        let user:User|undefined;
        //We will fill up the bucket initially at 0th timestamp, and each request should be allowed.
        for(let i = 0; i<5;i++){
            [allowed, limiter] = allowRequest(limiter, "user-1",0);
            expect(allowed).toBe(true);
        }

        //At 0th timestamp, the bucket is already full with its capacity 5. No more request will be allowed at that timestamp
        [allowed, limiter] = allowRequest(limiter, "user-1",0)
        expect(allowed).toBe(false);
        user = limiter.users.get("user-1");
        expect(user?.requestCount).toBe(5);
        expect(user?.lastCheck).toBe(0);
        
        //After 1 sec, 1 request has already leaked out, allowing space for one more request.
        [allowed,limiter]=allowRequest(limiter, "user-1",1)
        expect(allowed).toBe(true);
        user = limiter.users.get("user-1");
        expect(user?.requestCount).toBe(5);
        expect(user?.lastCheck).toBe(1);
    })

    it('allows multiple users to have independent behaviour by maintaining different buckets for each user' , ()=>{
        
        // limiter of capacity 2
        let limiter:RateLimiter = createRateLimiter(2,1.0);
        let allowed:boolean;

        // request 1 made by user-1 at 0th timestamp should be allowed
        [ allowed, limiter ] = allowRequest(limiter, "user-1", 0);
        expect(allowed).toBe(true);

        // request 2 made by user-1 at 0th timestamp should be allowed
        [ allowed, limiter ] = allowRequest(limiter, "user-1", 0);
        expect(allowed).toBe(true);

        // request 3 made by user-1 at 0th timestamp should be rejected since it exceeds the capacity
        [ allowed, limiter ] = allowRequest(limiter, "user-1", 0);
        expect(allowed).toBe(false);

        // request 1 made by user-2 at 0th timestamp should be allowed and have its independent bucket
        [ allowed, limiter ] = allowRequest(limiter, "user-2", 0);
        expect(allowed).toBe(true);

        //expect bucket of user-1 to have 2 requests.
        const bucket1 = getBucketState(limiter, "user-1")
        expect(bucket1?.lastCheck).toBe(0);
        expect(bucket1?.requestCount).toBe(2);

        //expect bucket of user-2 to have 1 requests.
        const bucket2 = getBucketState(limiter, "user-2");
        expect(bucket2?.lastCheck).toBe(0);
        expect(bucket2?.requestCount).toBe(1);
    })

    it('handles unknown user by returning null for a user who has never made a request',()=>{
        let limiter:RateLimiter = createRateLimiter(2,1.0);
        let allowed:boolean;

        //user-1 calls allowRequest first time and gets created.
        [ allowed, limiter ] = allowRequest(limiter, "user-1", 0);
        
        // checking bucket of user-1, the function returns user bucket info.
        let bucket = getBucketState(limiter, "user-1");
        expect(bucket).not.toBeNull();
        expect(bucket?.userId).toBe("user-1");
        expect(bucket?.requestCount).toBe(1);

        // checking bucket of user-2 who has not been created yet.
        bucket = getBucketState(limiter, "user-2");
        // It is expected to return null.
        expect(bucket).toBeNull();
    }) 

});