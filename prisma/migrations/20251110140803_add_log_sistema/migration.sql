/*
  Warnings:

  - The values [EMPLEADO] on the enum `RolUsuario` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RolUsuario_new" AS ENUM ('ADMIN', 'VENDEDOR', 'PRODUCCION');
ALTER TABLE "public"."Usuario" ALTER COLUMN "rol" DROP DEFAULT;
ALTER TABLE "Usuario" ALTER COLUMN "rol" TYPE "RolUsuario_new" USING ("rol"::text::"RolUsuario_new");
ALTER TYPE "RolUsuario" RENAME TO "RolUsuario_old";
ALTER TYPE "RolUsuario_new" RENAME TO "RolUsuario";
DROP TYPE "public"."RolUsuario_old";
ALTER TABLE "Usuario" ALTER COLUMN "rol" SET DEFAULT 'VENDEDOR';
COMMIT;

-- AlterTable
ALTER TABLE "Usuario" ALTER COLUMN "rol" SET DEFAULT 'VENDEDOR';

-- CreateTable
CREATE TABLE "LogSistema" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "detalles" TEXT,
    "ip" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogSistema_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LogSistema" ADD CONSTRAINT "LogSistema_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
