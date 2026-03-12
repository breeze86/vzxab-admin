-- CreateTable
CREATE TABLE `FeatureBannerItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(120) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `mediaType` ENUM('IMAGE', 'VIDEO') NOT NULL,
    `imageUrl` VARCHAR(500) NULL,
    `videoUrl` VARCHAR(500) NULL,
    `videoCoverUrl` VARCHAR(500) NULL,
    `ctaText` VARCHAR(40) NULL,
    `ctaLink` VARCHAR(500) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FeatureBannerItem_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    INDEX `FeatureBannerItem_mediaType_idx`(`mediaType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
