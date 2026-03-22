CREATE TABLE `DownloadCenterItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `downloadUrl` VARCHAR(500) NOT NULL,
    `fileType` VARCHAR(50) NOT NULL DEFAULT '文件',
    `fileSize` VARCHAR(50) NOT NULL DEFAULT '1M',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DownloadCenterItem_sortOrder_idx`(`sortOrder`),
    INDEX `DownloadCenterItem_fileType_idx`(`fileType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
