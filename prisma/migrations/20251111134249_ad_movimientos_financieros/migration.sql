/*
  Warnings:

  - The values [VENTA,COMPRA,GASTO] on the enum `TipoMovimientoFinanciero` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `categoria` to the `MovimientoFinanciero` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TipoMovimientoFinanciero_new" AS ENUM ('INGRESO', 'EGRESO');
ALTER TABLE "MovimientoFinanciero" ALTER COLUMN "tipo" TYPE "TipoMovimientoFinanciero_new" USING ("tipo"::text::"TipoMovimientoFinanciero_new");
ALTER TYPE "TipoMovimientoFinanciero" RENAME TO "TipoMovimientoFinanciero_old";
ALTER TYPE "TipoMovimientoFinanciero_new" RENAME TO "TipoMovimientoFinanciero";
DROP TYPE "public"."TipoMovimientoFinanciero_old";
COMMIT;

-- AlterTable
ALTER TABLE "MovimientoFinanciero" ADD COLUMN     "categoria" TEXT NOT NULL;
