/*
This is the scheduled cleaner to cleanup inactive files.

In this script, a function(cleanFile()) will be iterating through all the files in the storage(based on the process.env.PROVIDER)
and checks if any files are available which are not accessed(local storage) or created(Googole Colud Storage) within a 
specific period(process.env.CLEANING_PERIOD (in hours)) and deletes them. 
The last accessed time isn't available for files in Google Cloud Strogae which forced me to comoare on the creation time.
This script will run daily one time as a cronjob and cleanup the inactive files based on the given Cleaning Period.

*/

require("dotenv").config();
const fs = require("fs");
const find = require("find");

// Modules and methods for GCS file cleaning
if (process.env.PROVIDER === "google") {
  var gc = require("./config");
  var bucketName = process.env.BUCKET_NAME;
  var bucket = gc.bucket(bucketName);
  var listFiles = require("./helpers/middleware").listFiles;
}

// threshold Datetime ( Cleaning Period in hours)
const dt = new Date(
  Date.now() - parseInt(process.env.CLEANING_PERIOD) * 60 * 60 * 1000
);

const cleanFile = async () => {
  if (process.env.PROVIDER === "google") {
    try {
      let files = await listFiles(); // Extracting the file list for GCS
      await Promise.all(
        files.map(async (file) => {
          // Iterating through the files
          if (dt > file.timeCreated) {
            await bucket.file(file.fileName).delete(); // If file is created before the threshold time, it gets deleted
          }
        })
      );
    } catch (err) {
      console.log(`Error while deleting file ${err} `);
    }
  } else {
    find.file(`${process.env.FOLDER}/storage/`, (files) => {    // extracting file list for local storage
      files.forEach((file) => {
        fs.stat(file, (error, stats) => {
          // fs.stat provides fs.stat.atime which is the last accessed(regardless of modified or not) time of a file
          if (error) {
            console.log(error);
          } else {
            if (dt > stats.atime) {   // if file is accessed before the threshold time it gets deleted
              try {
                console.log(file);
                fs.unlinkSync(file); //fs.unlinkSync is a synchronous method to delete file
                console.log("Successfully deleted");
              } catch (err) {
                console.log(`Error while deleting file ${err} `);
              }
            }
          }
        });
      });
    });
  }
  console.log("Cleaning completed");
};

//Function Execution
cleanFile();
