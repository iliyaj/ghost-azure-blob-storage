# Ghost Azure Blob Storage Adapter

This module allows you to store your Ghost blog's media, images, and other files in Azure Blob Storage, instead of using the local server's file system.

## Installation

These instructions will guide you through installing the Ghost Azure Blob Storage Adapter directly from GitHub.

**1. Locate Your Ghost Installation:**

   - You'll need to know the directory where Ghost is installed. This might be something like `/var/www/ghost` or `/opt/ghost`, depending on your setup.
   - If you followed the [Ghost setup guide](https://docs.ghost.org/docs/install), it'll likely be in `/var/www/ghost`.

**2. Clone the Repository:**

-  Use `git` to clone the repository directly into your Ghost's `content/adapters/storage` directory:

   ```bash
   sudo mkdir -p /var/www/ghost/content/adapters/storage # Create the storage folder
   cd /var/www/ghost/content/adapters/storage # Go to the storage adapter folder
   sudo git clone https://github.com/iliyaj/ghost-azure-blob-storage.git ghost-azure-blob-storage
   sudo chown -R ghost:ghost /var/www/ghost/content # Sets correct user for Ghost
   ```

-  If you're running on a local machine, you may not need `sudo`.

-  If `git` is not installed please use your package manager to install it.

**3. Install Node Dependencies**

- Navigate to ghost directory

  ```bash
  cd /var/www/ghost/content/adapters/storage/ghost-azure-blob-storage
  npm install
  ```

**Note:** If you are planning to update the storage adapter in the future, this would be a more convenient option, as you would just run `git pull origin main` in the `ghost-azure-blob-storage` directory.

- Upgrade instructions

  ```bash
  cd /var/www/ghost/content/adapters/storage/ghost-azure-blob-storage
  sudo -u ghost git pull origin main
  ```


## Configuration

**1. Get Azure Storage Credentials:**

   -   Create a new Azure Storage Account and get the connection string, or use an existing one.
   -   Create a new container or use an existing one. Ensure the Anonymous access level is set to **Blob (anonymous read access for blobs only)**

   See below for detailed instructions on how to obtain the connection string and container name.

**2. Update Ghost Configuration:**

   -   Open your Ghost configuration file (`config.production.json`, `config.development.json`, etc.)
   - Add a `storage` block to your configuration like below:
        ```json
        {
            "storage": {
                "active": "ghost-azure-blob-storage",
                "media": "ghost-azure-blob-storage",
                "files": "ghost-azure-blob-storage",
                "ghost-azure-blob-storage": {
                    "connectionString": "YourConnectionStringHere",
                    "container": "YourContainerName",
                    "cdnUrl": "YourCDNEndpointDomain-Optional",
                    "useHttps": "true-Optional"
        
                }
            }
        }
        ```

        - **Replace `YourConnectionStringHere` with your Azure storage connection string.**
        - **Replace `YourContainerName` with the name of your Azure storage container.**
        -   `cdnUrl` is optional if you are not using a CDN.
        -   `useHttps` is optional. Set to `"true"` to enable HTTPS; defaults to HTTP if omitted.

## Finding the Azure Storage Connection String

1.  **Sign in to Azure Portal**:
    -   Visit the [Azure Portal](https://portal.azure.com) and log in.

2.  **Navigate to Your Storage Account**:
    -   In the Azure Portal, go to **Storage accounts**.
    -   Select the storage account you want to use from the list.

3.  **Retrieve the Connection String**:
    -   On the storage account's overview page, under the **Security + Networking** section, click on **Access keys**.
    -   You will see **Key1** and **Key2**. Each has an associated connection string.
    -   Click **Show** to reveal the connection strings.
    -   Copy the connection string from either Key1 or Key2.

## Finding the Container Name

1.  **Go to the Containers**:
    -   Still in your storage account, navigate to the **Data storage** section and click on **Containers**.

2.  **Select or Create a Container**:
    -   If you already have a container, its name will be listed here. Click on it to view or copy its name.
    -   If you need to create a new container, click **+ Container**, provide a name, and click **Create**.
        - Set the Anonymous access level to **Blob (anonymous read access for blobs only)**

## License

Released under the [MIT license](https://github.com/iliyaj/ghost-azure-blob-storage).
