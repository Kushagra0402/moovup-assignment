# Leaky Bucket Rate Limiter

## Setup Instructions

### Environment used:
**npm**: v11.16.0
**node**: v14.18.0 

### Installation and build

1. Clone the repository and navigate to the project-root:
```bash
git clone <repo-url>
cd moovup-assignment
```

2. Configure Env variables(Optional since default vals are provided):
Create a `.env` file in the root directory
Copy the contents in `.env.example` file into the `.env` file.

3. Build the App:
```bash
npm run build
```

### Running the application

* Run the below command once the build is complete
```bash
npm run start
```

* Endpoints: 
1. For checking if request is allowed: POST http://localhost:3000/api/allow-request/{userId}

2. For checking bucket state: GET http://localhost:3000/api/bucket-state/{userId}

### Running tests

* Run the below command once the build is complete
```bash
npm run test
```

## Design Decisions and Trade Offs

###1. Lazy Check on leaked requests: 
* Since there is no timer running to check for leakage at specific intervals, we simply calculate and update the user info globally at the time of checking allow-request endpoint. It allows zero idle CPU consumption and saves wasteful CPU cycles.
* Tradeoff: A user who had a single request and never returned back again, will remain on the Map forever, since there is no background job to check for inactive users and clean their record from memory, so they will continue to contribute to memory usage.

###2. Avoiding mutations of shared/global objects:
* Eliminates any possible concurrency bugs or race conditions. 
* In cases, where we need single limiter object to do testing for multiple cases(not needed in our case), we can rely upon original object since allowRequest always returns a new object
* Tradeoff: Increased memory allocation since allowRequest returns a new Object everytime.

###3. Timestamp:
* The functions allowRequest and getBucketState accept timestamp in their arguments. Generally makes it easier to write unit-tests by providing timestamps.
* Tradeoff : It can be exploited or misused if any external function call is made by mistake which provides non-monotonic timestamp and lead to unexpected behaviour.

###4. Map Storage:
* Good for single server instance applications, since everything is in memory.
* Tradeoff: External storage like Redis would be a better option if there are multiple server instances, so they can share the data.

###5. Bucket-state endpoint does not alter the User bucket(doesnt update the lastCheck and requestCount in memory) :
* Get endpoint, doesnt modify any object, calculates the bucket information on the fly using lazy check based on timestamp, but doesnt update the lastCheck or new requestCount in the map.
It doesnt cause any lost update, since allow-update also does the calculation based on lastCheck and currentTimeStamp, and based on that, it calculates and updates the User correctly.
This leads to GET /api/bucket-state endpoint serving its sole purpose of bucket info lookup without needing to do anything else. 


