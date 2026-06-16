CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "classYear" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");
CREATE INDEX "waitlist_entries_createdAt_idx" ON "waitlist_entries"("createdAt");
