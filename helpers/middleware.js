/*
In this script, I wrote the middlewares to upload, download and delete file. There are also some other helper functions which are called in the middlewares.

Multer is used to store the file in memory after receiving in the POST API, and then the fileUpload middleware is used to save the file. 
uploadFileToCloud is a helper fucntion which uploads file to GCS bucket.
downLoadFile middlware creates the stream response with proper mime type. A readStrea is created and piped to the response with status 200.
deleteFile middleware deletes file with proper privateKey.
listFileByPrefix is used to get the file name stored in GCS for a given prefix. It returns the corresponding file name, content type and creation date of the file.
listFiles doesn't take any argument. It returns the file name and creating date for each file stored in GCS bucket as an array of object.
*/

require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const find = require("find");
const path = require("path");
const mime = require("mime");
const crypt = require("./crypt");

//modules and methods for GCS
if (process.env.PROVIDER === "google") {
  var gc = require("../config");
  var bucketName = process.env.BUCKET_NAME;
  var bucket = gc.bucket(bucketName);
}

const uploadFileToCloud = (file) =>
  new Promise((resolve, reject) => {
    const { originalname, buffer } = file;
    const blob = bucket.file(`${uuidv4()}${path.extname(originalname)}`); //creating a unique file name which wiill be sent as the publicKey in reponse.
    const blobStream = blob.createWriteStream({
      // a filestream is created
      resumable: false,
    });
    blobStream
      .on("finish", () => {
        resolve(blob.name);
      })
      .on("error", () => {
        reject(`Unable to upload file, something went wrong`);
      })
      .end(buffer);
  });

const listFilesByPrefix = async (prefix) => {
  // Lists files in the bucket, filtered by a prefix
  const files = await bucket.getFiles({
    prefix: prefix,
  });
  if (files[0].length > 0) {
    return {
      fileName: files[0][0].name, //name
      contentType: files[0][0].metadata.contentType, //content type
      timeCreated: files[0][0].metadata.timeCreated, //time Created
    };
  }
};

const listFiles = async () => {
  // Lists all files in the bucket
  const [files] = await bucket.getFiles(); // listing all file of GCS Bucket
  let allFiles = [];
  files.forEach((file) => {
    allFiles.push({
      fileName: file.name,
      timeCreated: file.metadata.timeCreated,
    });
  });
  return allFiles;
};

//file upload middleware
const uploadFile = async (req, res, next) => {
  if (!req.file) {
    // checkinng if file is sent? if yes => proceed to following tasks, not => BAD request status is sent
    res.status(400).send({ error: "No file received" });
  }
  const file = req.file;
  try {
    if (process.env.PROVIDER === "google") {
      var fileName = await uploadFileToCloud(file);
    } else {
      var fileName = `${uuidv4()}${path.extname(file.originalname)}`; //unique file name with extension of orginial name
      var filePath = `${process.env.FOLDER}/storage/${fileName}`;

      fs.writeFile(filePath, file.buffer, (err) => {
        if (err) res.status(500).send({ error: "Internal server error!" }); // fs throws error while writing the file
      });
    }
    let publicKey = fileName.split(".").shift(); // unique file name excludimg the extention is sent as the publicKey
    let privateKey = crypt //encrypted version of the unique file name is sent as the privateKey
      .encrypt(publicKey)
      .replace(new RegExp("/", "g"), "--"); //"/" in privateKey creates problem while sending a POST request , so replaced the "/" with "--"
    res.send({
      publicKey: publicKey,
      privateKey: privateKey,
    });
  } catch (error) {
    res.status(500).send({
      // sends 500 sttus after catching errors.
      error: "Internal server error!",
    });
  }
};

const downloadFile = async (req, res, next) => {
  const publicKey = req.params.publicKey; //provided publicKey in the post request which will be used to get the file
  try {
    if (process.env.PROVIDER === "google") {
      const file = await listFilesByPrefix(publicKey); //listing the GCS bucket file with name == publicKey
      if (file) {
        res.set("Content-Type", file.contentType);
        let readStream = await bucket.file(file.fileName).createReadStream(); //stream is created
        readStream.pipe(res);
      } else {
        res.status(400).send({ error: "Invalid publicKey" });
      }
    } else {
      find.file(
        new RegExp(publicKey),
        `${process.env.FOLDER}/storage/`,
        (files) => {
          if (files.length > 0) {
            let filePath = files[0];
            res.set("Content-Type", mime.getType(filePath));
            let readStream = fs.createReadStream(filePath); // readStream is created
            readStream.pipe(res);
          } else {
            res.status(400).send({ error: "Invalid publicKey" });
          }
        }
      );
    }
  } catch (error) {
    res.status(500).send({
      error: "Internal server error!",
    });
  }
};

const deleteFile = async (req, res, next) => {
  try {
    var key = crypt.decrypt(
      req.params.privateKey.replace(new RegExp("--", "g"), "/") //privateKey will first be decrypted and the decrypted string will be used as the prefix to find that one file
    );
  } catch (error) {
    return res.status(400).send({ error: "Invalid privateKey" }); // when privayekey cannot be decrypted to the publicKey
  }
  try {
    if (process.env.PROVIDER === "google") {
      const file = await listFilesByPrefix(key);
      if (file) {
        await bucket.file(file.fileName).delete();
        res.send({
          message: "File Deleted",
        });
      } else {
        res.status(400).send({ error: "Invalid privateKey" });
      }
    } else {
      find.file(new RegExp(key), `${process.env.FOLDER}/storage/`, (files) => {
        if (files.length > 0) {
          let filePath = files[0];
          fs.unlinkSync(filePath);
          res.send({
            message: "File Deleted",
          });
        } else {
          res.status(400).send({ error: "Invalid privateKey" });
        }
      });
    }
  } catch (error) {
    res.status(500).send({
      error: "Internal server error!",
    });
  }
};

module.exports = {
  uploadFile: uploadFile,
  downloadFile: downloadFile,
  deleteFile: deleteFile,
  listFiles: listFiles,
  listFilesByPrefix: listFilesByPrefix,
  uploadFileToCloud: uploadFileToCloud,
};
