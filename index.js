'use strict';
const BaseStorage = require('ghost-storage-base');
const { BlobServiceClient } = require('@azure/storage-blob');
const { URL } = require('url');

let options = {};

class AzureStorageAdapter extends BaseStorage {
  constructor(config) {
    super();
    options = config || {};
    options.connectionString = options.connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
    options.container = options.container || 'ghost';
    options.useHttps = options.useHttps == 'true';
  }

  urlToPath(urlString) {
    try {
      const url = new URL(urlString);
      const pathName = decodeURIComponent(url.pathname);
      const blobPath = pathName.replace(/^\/.+?\//, '');
      return blobPath;
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }

  async exists(filename) {
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(options.connectionString);
      const containerClient = blobServiceClient.getContainerClient(options.container);
      const blobClient = containerClient.getBlobClient(filename);
      const exists = await blobClient.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  async save(image, folder = '') {
    const blobServiceClient = BlobServiceClient.fromConnectionString(options.connectionString);
    const containerClient = blobServiceClient.getContainerClient(options.container);
    const date = new Date();

    let fileTypeFolder = '';
    if (image.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      fileTypeFolder = 'images';
    } else if (image.name.match(/\.(mp4|webm|ogv|m4a|mp3|wav|ogg)$/i)) {
      fileTypeFolder = 'media';
    } else {
      fileTypeFolder = 'files';
    }
    folder = folder ? folder.replace(/^\/|\/$/g, '') : fileTypeFolder;

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const datePath = `${date.getFullYear()}/${month}`;
    const sanitizedImageName = image.name.replace(/[\s%]+/g, '_');
    let finalImageName = sanitizedImageName;

    const fullPath = folder.includes(datePath) ?
      `${folder}/${finalImageName}` :
      `${folder}/${datePath}/${finalImageName}`;

    try {
      await containerClient.createIfNotExists({
        access: 'blob'
      });

      const blockBlobClient = containerClient.getBlockBlobClient(fullPath);
      await blockBlobClient.uploadFile(image.path);
      const urlValue = blockBlobClient.url;

      if (!options.cdnUrl) {
        return urlValue;
      } else {
        const parsedUrl = new URL(urlValue);
        const protocol = (options.useHttps ? 'https' : 'http') + '://';
        const finalUrl = protocol + options.cdnUrl + parsedUrl.pathname;
        return finalUrl;
      }
    } catch (error) {
      throw new Error('Error uploading file: ' + error.message);
    }
  }

  serve() {
    return async function customServe(req, res) {
      const fileUrl = req.url.replace('/content/images/', '');
      const blobServiceClient = BlobServiceClient.fromConnectionString(options.connectionString);
      const containerClient = blobServiceClient.getContainerClient(options.container);
      const blobClient = containerClient.getBlobClient(fileUrl);

      try {
        if (!(await blobClient.exists())) {
          res.status(404).send('File not found');
          return;
        }

        const downloadBlockBlobResponse = await blobClient.download();
        const contentType = downloadBlockBlobResponse.contentType || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': downloadBlockBlobResponse.contentLength,
          'Accept-Ranges': 'bytes'
        });

        downloadBlockBlobResponse.readableStreamBody.pipe(res);
      } catch (error) {
        res.status(500).send('Internal Server Error');
      }
    };
  }

  delete() { }

  async read(options) {
    try {
      const request = require('request-promise-native');
      const data = await request({
        method: 'GET',
        uri: options.path,
        encoding: null,
      });
      return data;
    } catch (error) {
      throw new Error('Cannot download image ' + options.path);
    }
  }
}

module.exports = AzureStorageAdapter;