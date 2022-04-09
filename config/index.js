/*
This is the script for creating GCS  storagefor file accesiblty.
Takes data from service account key (.json) file
*/

require("dotenv").config();
const Cloud = require("@google-cloud/storage");

const serviceKey = process.env.CONFIG;
const projectId = require(serviceKey).project_id;  

const { Storage } = Cloud;
const storage = new Storage({
  keyFilename: serviceKey,
  projectId: projectId,
});

module.exports = storage; // exports the GCS storage to access(upload, download, delete etc.) files.
