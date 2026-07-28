import app from './app.js';
import request from 'supertest';
import { describe,it,expect,vi, beforeEach, afterEach} from "vitest";

//Tests for endpoints.

describe('POST /api/allow-request/:userId',() => {

    beforeEach(()=>{
        vi.useFakeTimers();
    });

    afterEach(()=>{
        vi.useRealTimers();
    });


    it('allows requests with a status code 200 within the capacity', async()=>{
        const userId = "user-1";
        //Filling up the bucket of user-1 to default capacity 5 at the same timestamp.
        for (let i = 1 ; i <= 5; i++){
            const response = await request(app).post(`/api/allow-request/${userId}`);
            //expecting successful response
            expect(response.status).toBe(200);
            let bucket = response.body.bucket;
            expect(bucket.userId).toBe("user-1");
            expect(bucket.requestCount).toBe(i);
        }
    })

    it('rejects requests with a status code 429 once user exceeds the request capacity', async()=>{
        const userId = "user-2";
        //Filling up the bucket of user-2 to default capacity 5.
        for (let i = 1 ; i <= 5; i++){
            const response = await request(app).post(`/api/allow-request/${userId}`);
            //expecting successful response
            expect(response.status).toBe(200);
            let bucket = response.body.bucket;
            expect(bucket.userId).toBe("user-2");
            expect(bucket.requestCount).toBe(i);
        }

        // Making an additional call,at the same timestamp, which exceeds capacity.
        const response = await request(app).post(`/api/allow-request/${userId}`);
        // The extra call is expected to fail with status code 429.
        expect(response.status).toBe(429);
    })

    it('it allows requests seperated by time after leaking', async()=>{
        const userId = "user-3";
        //Filling up the bucket of user-2 to default capacity 5.
        for (let i = 1 ; i <= 5; i++){
            const response = await request(app).post(`/api/allow-request/${userId}`);
            //expecting successful response
            expect(response.status).toBe(200);
            let bucket = response.body.bucket;
            expect(bucket.userId).toBe("user-3");
            expect(bucket.requestCount).toBe(i);
        }
        // Making an additional call,at the same timestamp, which exceeds capacity.
        const overFlowResponse = await request(app).post(`/api/allow-request/${userId}`);
        // The extra call is expected to fail with status code 429.
        expect(overFlowResponse.status).toBe(429);
        let bucket = overFlowResponse.body.bucket;
        expect(bucket.userId).toBe("user-3");
        expect(bucket.requestCount).toBe(5);
        
        //Waiting for 2 seconds to elapse, by which the user's bucket should leak 2 requests(default leak rate =1.0)
        vi.advanceTimersByTime(2000);
        //Making the request after 2 seconds
        const timeSeperatedResponse = await request(app).post(`/api/allow-request/${userId}`);
        //Expecting successful response.
        expect(timeSeperatedResponse.status).toBe(200);
        bucket = timeSeperatedResponse.body.bucket;
        expect(bucket.userId).toBe("user-3");
        //Expecting the user's bucket to have 4 requests after the last successful request.
        expect(bucket.requestCount).toBe(4);
    })
})

//Bucket state endpoint
describe('GET /api/bucket-state/:userId',()=>{

    beforeEach(()=>{
        vi.useFakeTimers();
        vi.setSystemTime(0);
    });

    afterEach(()=>{
        vi.useRealTimers();
    });

    it('returns the bucket state for a user if userId is valid', async()=>{
        const userId = "user-4";
        //Making requests to create user bucket first time as well as to update requestCount
        for (let i = 1 ; i <= 4; i++){
            const response = await request(app).post(`/api/allow-request/${userId}`);
        }

        //Elapsing 2 seconds, which should essentially make the requestCount => 4-2=2
        vi.advanceTimersByTime(2000);
        //Making a bucket-state request after 2 seconds, which should not alter the user object
        const response = await request(app).get(`/api/bucket-state/${userId}`);
        //Expecting a successful response after the new request made after 2 second gap
        expect(response.status).toBe(200);
        let bucket = response.body.bucket;
        expect(bucket.userId).toBe("user-4");
        //Expected requestCount should remain 2 since bucket-state is a readonly endpoint.
        expect(bucket.requestCount).toBe(2);
        expect(bucket.lastCheck).toBe(2);
    });


    it('returns null bucket for a user if userId is not found', async() =>{
        const userId = "user-5";
        //Making a bucket-state request for a user who doesnt have a bucket on global map.
        const response = await request(app).get(`/api/bucket-state/${userId}`);
        //User expected to be not found. 
        expect(response.status).toBe(404);
    });
});