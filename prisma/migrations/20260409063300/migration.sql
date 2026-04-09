-- AlterTable
ALTER TABLE `DownloadCenterItem` ADD COLUMN `downloadUrlEn` VARCHAR(500) NULL,
    ADD COLUMN `nameEn` VARCHAR(200) NULL;

-- AlterTable
ALTER TABLE `FaqItem` ADD COLUMN `answerEn` TEXT NULL,
    ADD COLUMN `questionEn` VARCHAR(200) NULL;

-- AlterTable
ALTER TABLE `HeroBanner` ADD COLUMN `linkUrlEn` VARCHAR(500) NULL,
    ADD COLUMN `summaryEn` VARCHAR(500) NULL,
    ADD COLUMN `titleEn` VARCHAR(120) NULL;
