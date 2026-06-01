-- Up
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;

CREATE POLICY task_select_policy ON tasks
  FOR SELECT
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR
    EXISTS (
      SELECT 1 FROM workspace_memberships wm
      WHERE wm.workspace_id = tasks.workspace_id
        AND wm.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
  );

CREATE POLICY task_insert_policy ON tasks
  FOR INSERT
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR
    EXISTS (
      SELECT 1 FROM workspace_memberships wm
      WHERE wm.workspace_id = tasks.workspace_id
        AND wm.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND wm.role IN ('owner', 'member')
    )
  );

CREATE POLICY task_update_policy ON tasks
  FOR UPDATE
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR
    EXISTS (
      SELECT 1 FROM workspace_memberships wm
      WHERE wm.workspace_id = tasks.workspace_id
        AND wm.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND wm.role IN ('owner', 'member')
    )
  );

CREATE POLICY task_delete_policy ON tasks
  FOR DELETE
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR
    EXISTS (
      SELECT 1 FROM workspace_memberships wm
      WHERE wm.workspace_id = tasks.workspace_id
        AND wm.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND wm.role IN ('owner', 'member')
    )
  );

-- Down
DROP POLICY IF EXISTS task_delete_policy ON tasks;
DROP POLICY IF EXISTS task_update_policy ON tasks;
DROP POLICY IF EXISTS task_insert_policy ON tasks;
DROP POLICY IF EXISTS task_select_policy ON tasks;
ALTER TABLE tasks NO FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

