-- AlterTable
ALTER TABLE `CustomerCooperation` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `CustomerCooperation_isDeleted_createdAt_idx` ON `CustomerCooperation`(`isDeleted`, `createdAt`);
