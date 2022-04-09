/*
This is the script to encrypt and decrypt the public and private key respectively

I wrote two functions. encrypt(data) is encrypting a provided string and returns the encrypted string.
decrypt(data) takes the encrypted string and return the decrypted string after decryption.
RSA algotithm is being used with key length of 1024 bit.
In this project I am using the unique file name as publicKey and the encrypted publicKey as private key.
*/


require("dotenv").config();
const NodeRSA = require("node-rsa");

//key for encryption
const public = process.env.PUBLIC;

//key for decryption
const private = process.env.PRIVATE;

const encryptKey = new NodeRSA(public);
const decryptKey = new NodeRSA(private);

module.exports = {
  encrypt: (data) => {
    return encryptKey.encrypt(data, "base64");
  },
  decrypt: (data) => {
    return decryptKey.decrypt(data, "utf8");
  },
};
