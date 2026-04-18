-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "browser" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "deviceType" TEXT,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "os" TEXT,
ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SurveyView" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "deviceType" TEXT,
    "os" TEXT,
    "browser" TEXT,

    CONSTRAINT "SurveyView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurveyView_surveyId_idx" ON "SurveyView"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyView_viewedAt_idx" ON "SurveyView"("viewedAt");

-- CreateIndex
CREATE INDEX "Response_createdAt_idx" ON "Response"("createdAt");

-- AddForeignKey
ALTER TABLE "SurveyView" ADD CONSTRAINT "SurveyView_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
