# API-Server-for-File-Sharing

Diagram:

![image](https://user-images.githubusercontent.com/60686516/162589798-e0bfa4db-64a5-436a-8d6b-a841e04861a9.png)





1. The API Server implements the following HTTP REST API endpoints:

    a. “​POST /files​”​ - this endpoint is used to upload new files. It accepts “​multipart/form-data​” requests and return a response in JSON format with the following attributes: “​publicKey​”, “​privateKey​”.
    
    b. “​GET /files/:publicKey​”​ - this endpoint is  used to download existing files. It accepts “​publicKey​” as a request parameter and return a response stream with a MIME type representing the actual file format.
    
    c. “​DELETE /files/:privateKey​”​ - this endpoint is used to remove existing files. It accepts “​privateKey​” as a request parameter and return a response in JSON format confirming the file removal.

2. All the file access functionality is implemented as a separate component. The default implementation works with local files located inside a root folder defined in the “​FOLDER​” environment variable.

   It is possible to implement other storage providers connected to the popular cloud APIs using the same interface. For example, Google Cloud Storage.      The following environment variables are used:

      a. “​PROVIDER​” - one of the provider types: “​google​”, “​local​”. Default value ​“local”
    
      b. “​CONFIG​” - the absolute path to the provider configuration file (includes storage credentials, bucket information, etc.)


3. The API Server implements configurable daily download and upload limits for the network traffic from the same IP address

4. The API Server has an internal job to cleanup uploaded files after configurable period of inactivity

5. All the HTTP REST API endpoints are covered by integration tests and the individual component methods are covered by unit tests.



Demonstration:
https://drive.google.com/file/d/1qmPtE9pMmE9-OoP3ehWok5Ykf5c2CzrW/view?usp=sharing


  
    
    


=> Install dependencies-

        npm install

=> Start the server

        npm start
        
 => Run test
 
         npm test
