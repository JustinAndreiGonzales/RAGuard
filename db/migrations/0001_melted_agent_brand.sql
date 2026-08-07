DROP INDEX "document_permissions_document_id_idx";--> statement-breakpoint
CREATE INDEX "document_owner_id_idx" ON "documents" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "document_status_idx" ON "documents" USING btree ("status");