/*
  Warnings:

  - Added the required column `versionId` to the `Response` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'DROPDOWN';
ALTER TYPE "QuestionType" ADD VALUE 'TEXTAREA';
ALTER TYPE "QuestionType" ADD VALUE 'NUMBER';
ALTER TYPE "QuestionType" ADD VALUE 'NPS';
ALTER TYPE "QuestionType" ADD VALUE 'CES';
ALTER TYPE "QuestionType" ADD VALUE 'PHONE';
ALTER TYPE "QuestionType" ADD VALUE 'EMAIL';
ALTER TYPE "QuestionType" ADD VALUE 'DATETIME';
ALTER TYPE "QuestionType" ADD VALUE 'RANKING';
ALTER TYPE "QuestionType" ADD VALUE 'MATRIX_SINGLE';
ALTER TYPE "QuestionType" ADD VALUE 'NAME';
ALTER TYPE "QuestionType" ADD VALUE 'GENDER';
ALTER TYPE "QuestionType" ADD VALUE 'BIRTHDAY';
ALTER TYPE "QuestionType" ADD VALUE 'IMAGE_SINGLE_CHOICE';
ALTER TYPE "QuestionType" ADD VALUE 'IMAGE_MULTIPLE_CHOICE';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "description" TEXT,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedBy" TEXT;

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "versionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "currentVersionId" TEXT,
ADD COLUMN     "maxCollaborators" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "settings" JSONB;

-- CreateTable
CREATE TABLE "SurveyCollaborator" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canViewResults" BOOLEAN NOT NULL DEFAULT false,
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyInvite" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "permissions" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyLog" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyVersion" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "questions" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurveyCollaborator_surveyId_idx" ON "SurveyCollaborator"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyCollaborator_userId_idx" ON "SurveyCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyCollaborator_surveyId_userId_key" ON "SurveyCollaborator"("surveyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyInvite_code_key" ON "SurveyInvite"("code");

-- CreateIndex
CREATE INDEX "SurveyInvite_surveyId_idx" ON "SurveyInvite"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyInvite_code_idx" ON "SurveyInvite"("code");

-- CreateIndex
CREATE INDEX "SurveyLog_surveyId_idx" ON "SurveyLog"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyLog_createdAt_idx" ON "SurveyLog"("createdAt");

-- CreateIndex
CREATE INDEX "SurveyVersion_surveyId_idx" ON "SurveyVersion"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyVersion_publishedAt_idx" ON "SurveyVersion"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyVersion_surveyId_version_key" ON "SurveyVersion"("surveyId", "version");

-- CreateIndex
CREATE INDEX "Question_lockedBy_idx" ON "Question"("lockedBy");

-- CreateIndex
CREATE INDEX "Response_versionId_idx" ON "Response"("versionId");

-- CreateIndex
CREATE INDEX "Survey_currentVersionId_idx" ON "Survey"("currentVersionId");

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SurveyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyCollaborator" ADD CONSTRAINT "SurveyCollaborator_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyCollaborator" ADD CONSTRAINT "SurveyCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyInvite" ADD CONSTRAINT "SurveyInvite_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyLog" ADD CONSTRAINT "SurveyLog_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyLog" ADD CONSTRAINT "SurveyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyVersion" ADD CONSTRAINT "SurveyVersion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
