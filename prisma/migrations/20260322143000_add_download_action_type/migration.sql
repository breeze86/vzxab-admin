ALTER TABLE `DownloadCenterItem`
    ADD COLUMN `actionType` ENUM('PREVIEW', 'DOWNLOAD') NOT NULL DEFAULT 'DOWNLOAD';

CREATE INDEX `DownloadCenterItem_actionType_sortOrder_idx`
    ON `DownloadCenterItem`(`actionType`, `sortOrder`);
