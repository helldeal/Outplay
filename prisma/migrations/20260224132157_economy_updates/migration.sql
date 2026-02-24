/*
  Warnings:

  - You are about to drop the column `number` on the `cards` table. All the data in the column will be lost.
  - The primary key for the `user_cards` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `user_cards` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `user_cards` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `user_cards` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OpeningType" AS ENUM ('SHOP', 'DAILY');

-- DropIndex
DROP INDEX "cards_series_id_number_key";

-- DropIndex
DROP INDEX "user_cards_user_id_card_id_key";

-- AlterTable
ALTER TABLE "booster_openings" ADD COLUMN     "pc_gained" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "OpeningType" NOT NULL DEFAULT 'SHOP';

-- AlterTable
ALTER TABLE "boosters" ADD COLUMN     "price_pc" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "cards" DROP COLUMN "number",
ADD COLUMN     "pc_value" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_cards" DROP CONSTRAINT "user_cards_pkey",
DROP COLUMN "created_at",
DROP COLUMN "id",
DROP COLUMN "quantity",
ADD COLUMN     "obtained_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "user_cards_pkey" PRIMARY KEY ("user_id", "card_id");

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pc_balance" INTEGER NOT NULL DEFAULT 0;
