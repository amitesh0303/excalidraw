-- Improved RLS Policies for Enhanced Security
-- Run this migration to strengthen Row Level Security

-- Drop existing policies
DROP POLICY IF EXISTS "Users can CRUD own folders" ON folders;
DROP POLICY IF EXISTS "Users can CRUD own scenes" ON scenes;

-- ============================================
-- FOLDERS TABLE - Separate policies per operation
-- ============================================

-- SELECT: Users can view their own folders
CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Users can create their own folders
CREATE POLICY "Users can create own folders" ON folders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      parent_id IS NULL 
      OR parent_id IN (
        SELECT id FROM folders WHERE user_id = auth.uid()
      )
    )
  );

-- UPDATE: Users can update their own folders
CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own folders
CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- SCENES TABLE - Separate policies per operation
-- ============================================

-- SELECT: Users can view their own scenes
CREATE POLICY "Users can view own scenes" ON scenes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Users can create their own scenes
-- Ensures folder_id belongs to the user if specified
CREATE POLICY "Users can create own scenes" ON scenes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      folder_id IS NULL 
      OR folder_id IN (
        SELECT id FROM folders WHERE user_id = auth.uid()
      )
    )
  );

-- UPDATE: Users can update their own scenes
-- Ensures folder_id belongs to the user if changed
CREATE POLICY "Users can update own scenes" ON scenes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      folder_id IS NULL 
      OR folder_id IN (
        SELECT id FROM folders WHERE user_id = auth.uid()
      )
    )
  );

-- DELETE: Users can delete their own scenes
CREATE POLICY "Users can delete own scenes" ON scenes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- ADDITIONAL CONSTRAINTS
-- ============================================

-- Ensure folder parent_id references valid folders (handled by foreign key)
ALTER TABLE folders 
  DROP CONSTRAINT IF EXISTS check_folder_parent_ownership;

-- Ensure scene folder_id references valid folders (handled by foreign key)
ALTER TABLE scenes 
  DROP CONSTRAINT IF EXISTS check_scene_folder_ownership;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Already created in initial migration, but ensuring they exist
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_scenes_user_id ON scenes(user_id);
CREATE INDEX IF NOT EXISTS idx_scenes_folder_id ON scenes(folder_id);
CREATE INDEX IF NOT EXISTS idx_scenes_updated_at ON scenes(updated_at DESC);

-- ============================================
-- FUNCTIONS FOR ADDITIONAL SECURITY
-- ============================================

-- Function to check if user owns a folder
CREATE OR REPLACE FUNCTION user_owns_folder(folder_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM folders 
    WHERE id = folder_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a scene
CREATE OR REPLACE FUNCTION user_owns_scene(scene_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM scenes 
    WHERE id = scene_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR AUTOMATIC CLEANUP
-- ============================================

-- Automatically delete scenes when folder is deleted
-- (CASCADE is already set in foreign key, but this is explicit)

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_scenes_updated_at ON scenes;

CREATE TRIGGER update_scenes_updated_at
  BEFORE UPDATE ON scenes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON POLICY "Users can view own folders" ON folders IS 
  'Allows authenticated users to view only their own folders';

COMMENT ON POLICY "Users can create own folders" ON folders IS 
  'Allows authenticated users to create folders, ensuring parent_id belongs to them';

COMMENT ON POLICY "Users can view own scenes" ON scenes IS 
  'Allows authenticated users to view only their own scenes';

COMMENT ON POLICY "Users can create own scenes" ON scenes IS 
  'Allows authenticated users to create scenes, ensuring folder_id belongs to them';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify policies are working:

-- 1. Check all policies on folders
-- SELECT * FROM pg_policies WHERE tablename = 'folders';

-- 2. Check all policies on scenes
-- SELECT * FROM pg_policies WHERE tablename = 'scenes';

-- 3. Test as a user (replace with actual user ID)
-- SET LOCAL role TO authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub": "user-id-here"}';
-- SELECT * FROM folders;
-- SELECT * FROM scenes;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- To rollback to original policies:
-- DROP POLICY IF EXISTS "Users can view own folders" ON folders;
-- DROP POLICY IF EXISTS "Users can create own folders" ON folders;
-- DROP POLICY IF EXISTS "Users can update own folders" ON folders;
-- DROP POLICY IF EXISTS "Users can delete own folders" ON folders;
-- DROP POLICY IF EXISTS "Users can view own scenes" ON scenes;
-- DROP POLICY IF EXISTS "Users can create own scenes" ON scenes;
-- DROP POLICY IF EXISTS "Users can update own scenes" ON scenes;
-- DROP POLICY IF EXISTS "Users can delete own scenes" ON scenes;
-- 
-- CREATE POLICY "Users can CRUD own folders" ON folders
--   FOR ALL USING (auth.uid() = user_id);
-- 
-- CREATE POLICY "Users can CRUD own scenes" ON scenes
--   FOR ALL USING (auth.uid() = user_id);
