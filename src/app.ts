import express, { type Response } from "express";
import { allowRequest, createRateLimiter, getBucketState } from "./globalRateLimiter.js";
import dotenv from 'dotenv';
import type { RateLimiter } from "./types/rateLimiter.js";
import type { BucketStateResponse } from "./types/responseTypes/bucketStateResponse.js";
import type { AllowRequestResponse } from "./types/responseTypes/allowRequestResponse.js";

dotenv.config();

const app = express();
app.use(express.json());

const leakRate = Number(process.env.LEAK_RATE) || 1.0;
const capacity = Number(process.env.CAPACITY) || 5 ;

//Creating the global rate limiter which runs once the server is started.
let limiter:RateLimiter = createRateLimiter(capacity, leakRate);

// POST endpoint to check if a request is allowed. It uses userId as path parameter. It modifies the user bucket and it returns appropriate message along with bucket state.
app.post("/api/allow-request/:userId", (req, res: Response<AllowRequestResponse>) => {
  const { userId } = req.params;

  //convert to seconds.
  const currentTimeStamp = Date.now()/1000;

  //calling allowRequest to check if the request is allowed and updating the limiter
  const[isAllowed, updatedLimiter] = allowRequest(limiter, userId, currentTimeStamp);

  limiter = updatedLimiter
  const bucketState = getBucketState(limiter, userId)

  if (isAllowed){
  res.status(200).json({
    success: true,
    message: 'Request Allowed and Successful',
    bucket: bucketState
  })
  }
  else{
    res.status(429).json({
      error: 'Too many requests.',
      message: 'Rate Limited exceeded. Please try Later',
      bucket: bucketState
    })
  }
});

//GET endpoint to just fetch bucket state at a given moment of time. It does not actually change the limiter object. 
app.get("/api/bucket-state/:userId",(req, res: Response<BucketStateResponse>) => {
  const { userId } = req.params;
  const bucketState = getBucketState(limiter, userId);
  if(!bucketState){
    return res.status(404).json({
      error: 'Not Found',
      message: 'No user Found for this userId'
    });
  }

  return res.status(200).json({
    success: true,
    bucket: bucketState
  });

});

export default app;