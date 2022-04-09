/*
This script is the mother script.
T
he idea is to,

receive and save file in POST request.Provide publicKey and privatekey as response. All files are saved with an unique file name which is the publicKey.
client can download the file sending a GET request including the publicKey as a parameter. publicKey which is the unique file name excluding the extension 
s encryted and the encrypted string is sent as the privateKey. client can send a DELETE request including this privateKey as parameter and the file corresponding 
to this privateKey will be deleted.
    
*/


require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const multer = require("multer");
const rateLimit = require("express-rate-limit");

//middleware
const {
  uploadFile,
  downloadFile,
  deleteFile,
} = require("./helpers/middleware");

//port initialized
const PORT = process.env.PORT;

//Cors
const corsOption = {
  origin: process.env.ALLOWED_CLIENTS.split(","),
};
app.use(cors(corsOption));

//Upload/Download limiter
//Upload Limiter, blocks if same ip hits the corresponding endpoint for more than, value specified in process.env.UPLOAD_LIMIT
const uploadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: parseInt(process.env.UPLOAD_LIMIT),
  message: `More than ${process.env.UPLOAD_LIMIT} file upload attempts from this IP, please try again after 24 hour`,
});

//Download Limiter
const downloadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: parseInt(process.env.DOWNLOAD_LIMIT),
  message: `More than ${process.env.UPLOAD_LIMIT} file download attempts from this IP, please try again after 24 hour`,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, //File size limit 10 mb
}).single("file");

//POST API
app.post("/files", uploadLimiter, upload, uploadFile, (req, res) => {});

//GET API
app.get("/files/:publicKey", downloadLimiter, downloadFile, (req, res) => {});

//DELETE API
app.delete("/files/:privateKey", deleteFile, (req, res) => {});

// Listening on port
app.listen(PORT, console.log(`Server is listening on port ${PORT}.`));

module.exports = app;
