-- AlterTable
ALTER TABLE `movielist` ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'tmdb';

-- CreateIndex
CREATE INDEX `MovieList_movieId_idx` ON `MovieList`(`movieId`);

-- RenameIndex
ALTER TABLE `movielist` RENAME INDEX `MovieList_userId_fkey` TO `MovieList_userId_idx`;
