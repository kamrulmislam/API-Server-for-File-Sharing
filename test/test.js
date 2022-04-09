/*
This is the Unit and Integration Testing Script

In this script, I wrote test cases for unit testing of functions and integration testing of APIs. I tried to cover most of the cases but there should
be a few more cases.
*/

require("dotenv").config();
const chai = require("chai");
const server = require("../server");
const crypt = require("../helpers/crypt");
const chaiHttp = require("chai-http");
const { v4: uuidv4 } = require("uuid");
const mime = require("mime");

//modules and methods for Google Cloud Storage
if (process.env.PROVIDER === "google") {
  var gc = require("../config");
  var bucketName = process.env.BUCKET_NAME;
  var bucket = gc.bucket(bucketName);
  var {
    uploadFileToCloud,
    listFilesByPrefix,
    listFiles,
  } = require("../helpers/middleware");
}

//Assertion style
chai.should();

//chaiHttp allow us to test API integration
chai.use(chaiHttp);

describe("API", () => {
  //Testing the POST API
  describe("POST /files", () => {
    var privateKey;
    it("It should provide us the publicKey and PrivateKey associated with the file", (done) => {
      chai
        .request(server)
        .post("/files")
        .attach("file", `${__dirname}/testfiles/test.jpg`) // test file attachment
        .end(function (err, res) {
          privateKey = res.body.privateKey;
          res.should.have.status(200); // 'success' status
          res.body.should.be.a("object"); //  post response  { publicKey: "", privateKey: ""}
          res.body.should.have.property("publicKey");
          res.body.should.have.property("privateKey");
          done();
        });
    });

    // without file attachment
    it("It should show an error for not attaching file", (done) => {
      chai
        .request(server)
        .post("/files")
        .end(function (err, res) {
          res.should.have.status(400); // Bad Request status
          res.body.should.be.a("object"); //  post response  { error: "No file Received"}
          res.body.should.have.property("error").eql("No file received");
          done();
        });
    });

    //Wrong route
    it("It should show a 404 error", (done) => {
      chai
        .request(server)
        .post("/file") // wrong endpoint
        .attach("file", `${__dirname}/testfiles/test.jpg`)
        .end((err, res) => {
          res.should.have.status(404); // "Not Found" status
          done();
        });
    });

    //Deleting the uploaded file after the test
    after((done) => {
      chai
        .request(server)
        .delete(`/files/${privateKey}`)
        .end(function (err, res) {
          done();
        });
    });
  });

  //Test the get api
  describe("GET /files/:publicKey", () => {
    var publicKey, privateKey;
    //Upoading a file before the test
    before((done) => {
      chai
        .request(server)
        .post("/files")
        .attach("file", `${__dirname}/testfiles/test.jpg`) // test file attachment
        .end(function (err, res) {
          publicKey = res.body.publicKey; //pulicKey of the response will be used to test the GET Request
          privateKey = res.body.privateKey; //privateKey of the responsewill be used to delete the file after testing
          done();
        });
    });
    it("It should GET the file associated with pulicKey", (done) => {
      let contentType = mime.getType(`${__dirname}/testfiles/test.jpg`); // contentType of test file
      chai
        .request(server)
        .get(`/files/${publicKey}`)
        .end((err, res) => {
          res.should.have.status(200); // Success status
          res.should.have.header("content-type");
          res.header["content-type"].should.be.equal(contentType); // content type of the available file which we are trying to download
          done();
        });
    });

    //No or wrong pulicKey provided
    it("It should show a 400 error with an error Key", (done) => {
      let publicKey = "aksjssjdj"; //wrong publicKey
      chai
        .request(server)
        .get(`/files/${publicKey}`)
        .end((err, res) => {
          res.should.have.status(400); // Bad Request Status
          res.body.should.be.a("object"); // Response { error: "Invalid publicKey" }
          res.body.should.have.property("error").eql("Invalid publicKey");
          done();
        });
    });

    //Deleting the uploaded file after the test
    after((done) => {
      chai
        .request(server)
        .delete(`/files/${privateKey}`)
        .end(function (err, res) {
          done();
        });
    });
  });

  //Test the delete api
  describe("DELETE /files/:privateKey", () => {
    var privateKey;
    //Upoading a file before the test
    before((done) => {
      chai
        .request(server)
        .post("/files")
        .attach("file", `${__dirname}/testfiles/test.jpg`) // test file attachment
        .end(function (err, res) {
          publicKey = res.body.publicKey;
          privateKey = res.body.privateKey;
          done();
        });
    });
    it("It should delete the file for a given privateKey", (done) => {
      chai
        .request(server)
        .delete(`/files/${privateKey}`)
        .end(function (err, res) {
          res.should.have.status(200); // 'success' status
          res.body.should.be.a("object"); // Response { success: "", Key: "" }
          res.body.should.have.property("message");
          done();
        });
    });

    //No or wrong privateKey provided
    it("It should show a 400 error with an error Key", (done) => {
      let privateKey = "aksjssjdj"; // wrong privateKey
      chai
        .request(server)
        .delete(`/files/${privateKey}`)
        .end((err, res) => {
          res.should.have.status(400); // Bad Request Status
          res.body.should.be.a("object"); // Response { error: "Invalid privateKey" }
          res.body.should.have.property("error").eql("Invalid privateKey");
          done();
        });
    });
  });
});

//encryption decryption testing
describe("Encryption Decryption", () => {
  let Key = uuidv4(); //creating a random Key (string)
  describe("Encryption", () => {
    it("It should return a encrypted string", (done) => {
      var encrypted = crypt.encrypt(Key); // encryption
      encrypted.should.be.a("string"); //encrypted string
      done();
    });
    it("It should return a decrypted string", (done) => {
      var decrypted = crypt.decrypt(crypt.encrypt(Key)); // decryption
      decrypted.should.be.a("string"); //decrypted string
      decrypted.should.be.eql(Key); // decrypted string must be equal to the Key which was encrypted
      done();
    });
  });
});

//gcs file access functionality testing
describe("GCS file access functionality", () => {
  if (process.env.PROVIDER === "google") {
    // this test cases will only be executed for GCS
    describe("File upload to cloud", () => {
      var fileName;
      var buffer = Buffer.from(
        "These are the content of a test file..........."
      ); // file content
      var file = { originalname: "aNewFile.txt", buffer: buffer }; //creating a file
      it("It should return the file name", async () => {
        fileName = await uploadFileToCloud(file); // uploading the file
        fileName.should.be.a("string"); //fileName in string
      });

      //Deleting the uploaded file after the test
      after(async () => {
        try {
          await bucket.file(fileName).delete(); // Deliting file from GCS
        } catch (error) {
          console.log(error);
        }
      });
    });

    describe("List File by Prefix", () => {
      var publicKey, file;
      //Upoading a file before the test
      before((done) => {
        chai
          .request(server)
          .post("/files")
          .attach("file", `${__dirname}/testfiles/test.jpg`) // test file attachment
          .end(function (err, res) {
            publicKey = res.body.publicKey;
            done();
          });
      });
      it("It should return the file name, content type and creation time for a given prefix", async () => {
        let contentType = mime.getType(`${__dirname}/testfiles/test.jpg`); // contentType of test file
        file = await listFilesByPrefix(publicKey); // publicKey is given as prefix to list the uploaded file
        file.should.be.a("object"); //returns a object { fileName: "", contentType: "", timeCreated: "" }
        file.should.have.property("fileName");
        file.should.have.property("contentType").eql(contentType);
        file.should.have.property("timeCreated");
      });

      //Deleting the uploaded file after the test
      after(async () => {
        try {
          await bucket.file(file.fileName).delete(); // Deliting file from GCS
        } catch (error) {
          console.log(error);
        }
      });
    });

    describe("List all files", () => {
      var privateKey, files;
      //Upoading a file before the test
      before((done) => {
        chai
          .request(server)
          .post("/files")
          .attach("file", `${__dirname}/testfiles/test.jpg`) // test file attachment
          .end(function (err, res) {
            privateKey = res.body.privateKey;
            done();
          });
      });
      it("It should return all the file names with creation time", async () => {
        files = await listFiles(); // creating the list of all files
        files.should.be.a("array"); //returns a object [{ fileName: "" , timeCreated: "" }]
        files[0].should.have.deep.property("fileName");
        files[0].should.have.deep.property("timeCreated");
      });

      //Deleting the uploaded file after the test
      after((done) => {
        chai
          .request(server)
          .delete(`/files/${privateKey}`)
          .end(function (err, res) {
            done();
          });
      });
    });
  } else
    console.log(
      "PROVIDER must be set to google to test GCS file access dunctionality"
    );
});
