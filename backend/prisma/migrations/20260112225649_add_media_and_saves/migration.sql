-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "isReel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mediaType" TEXT,
ADD COLUMN     "thumbnailUrl" TEXT;

-- CreateTable
CREATE TABLE "saves" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saves_userId_postId_key" ON "saves"("userId", "postId");

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
