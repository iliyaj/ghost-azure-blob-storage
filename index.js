'use strict';
const BaseStorage = require('ghost-storage-base');
const mime = require('mime-types');
const { BlobServiceClient } = require('@azure/storage-blob');

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
      throw new Error(`Error parsing URL "${urlString}": ${error.message}`);
    }
  }

  async exists(filename) {
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(options.connectionString);
      const containerClient = blobServiceClient.getContainerClient(options.container);
      const blobClient = containerClient.getBlobClient(filename);
      return await blobClient.exists();
    } catch (error) {
      console.error(`Error checking if file "${filename}" exists: ${error.message}`);
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
      console.error(`Error during file upload of "${image.name}": ${error.message}`);
      throw new Error(`Error uploading file "${image.name}": ${error.message}`);
    }
  }


  serve() {
    return async (req, res) => {
      try {
        const basePath = '/content/';
        const fileUrl = req.url.replace(basePath, '');

        if (fileUrl.includes('..')) {
          res.status(400).send('Bad Request: Invalid file path');
          return;
        }

        const containerClient = this.getContainerClient();
        const blobClient = containerClient.getBlobClient(fileUrl);

        if (!(await blobClient.exists())) {
          res.status(404).send(`File "${fileUrl}" not found`);
          return;
        }

        const properties = await blobClient.getProperties();
        const contentType = mime.lookup(fileUrl) || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': properties.contentLength,
          'Cache-Control': 'public, max-age=31536000',
          'Accept-Ranges': 'bytes',
        });

        const downloadResponse = await blobClient.download();
        downloadResponse.readableStreamBody.pipe(res).on('error', (streamError) => {
          console.error(`Error streaming file "${fileUrl}": ${streamError.message}`);
          res.status(500).send('Internal Server Error');
        });
      } catch (error) {
        console.error(`Error serving file "${req.url}": ${error.message}`);
        res.status(500).send('Internal Server Error');
      }
    };
  }

  delete() {
    // Ghost CMS does not currently require a delete function for storage adapters.
    // This method is intentionally left unimplemented.
  }

  async read(options) {
    try {
      const response = await fetch(options.path);
      if (!response.ok) {
        throw new Error(`HTTP error while fetching "${options.path}": status ${response.status}`);
      }
      const data = await response.buffer();
      return data;
    } catch (error) {
      console.error(`Error reading file "${options.path}": ${error.message}`);
      throw new Error(`Cannot download image "${options.path}": ${error.message}`);
    }
  }
}

module.exports = AzureStorageAdapter;