-- Custom SQL migration file, put your code below! --
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select_policy ON documents
FOR SELECT USING (
  current_setting('app.current_user_is_admin', true) = 'true'
  OR visibility = 'public'
  OR owner_id = current_setting('app.current_user_id', true)::uuid
  OR EXISTS (
    SELECT 1 FROM document_permissions dp
    WHERE dp.document_id = documents.id
    AND (
      (dp.principal_type = 'user' AND dp.principal_id = current_setting('app.current_user_id', true)::uuid)
      OR (dp.principal_type = 'team' AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = dp.principal_id AND tm.user_id = current_setting('app.current_user_id', true)::uuid
      ))
    )
  )
);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_chunks_select_policy ON document_chunks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_chunks.document_id
    AND (
      current_setting('app.current_user_is_admin', true) = 'true'
      OR d.visibility = 'public'
      OR d.owner_id = current_setting('app.current_user_id', true)::uuid
      OR EXISTS (
        SELECT 1 FROM document_permissions dp
        WHERE dp.document_id = d.id
        AND (
          (dp.principal_type = 'user' AND dp.principal_id = current_setting('app.current_user_id', true)::uuid)
          OR (dp.principal_type = 'team' AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = dp.principal_id AND tm.user_id = current_setting('app.current_user_id', true)::uuid
          ))
        )
      )
    )
  )
);


