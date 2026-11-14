/*
  Warnings:

  - You are about to drop the column `defaultRoles` on the `Permission` table. All the data in the column will be lost.
  - You are about to drop the column `ownerOnly` on the `Permission` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `RolePermission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_merchantId_fkey";

-- DropIndex
DROP INDEX "User_merchantId_role_idx";

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "defaultRoles",
DROP COLUMN "ownerOnly",
ADD COLUMN     "adminOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultRoleKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roleId" TEXT;

-- DropTable
DROP TABLE "RolePermission";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 10,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleGrant" (
    "roleId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,

    CONSTRAINT "RoleGrant_pkey" PRIMARY KEY ("roleId","permission")
);

-- CreateIndex
CREATE INDEX "Role_merchantId_idx" ON "Role"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_merchantId_key_key" ON "Role"("merchantId", "key");

-- CreateIndex
CREATE INDEX "User_merchantId_roleId_idx" ON "User"("merchantId", "roleId");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleGrant" ADD CONSTRAINT "RoleGrant_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
