/*
  Warnings:

  - You are about to drop the `FeatureBannerItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `FeatureBannerItem`;

-- CreateTable
CREATE TABLE `HeroBanner` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(120) NOT NULL,
    `summary` VARCHAR(500) NOT NULL,
    `mediaType` ENUM('IMAGE', 'VIDEO') NOT NULL,
    `imageUrl` VARCHAR(500) NULL,
    `videoUrl` VARCHAR(500) NULL,
    `videoPosterUrl` VARCHAR(500) NULL,
    `linkUrl` VARCHAR(500) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HeroBanner_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
