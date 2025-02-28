-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own files
CREATE POLICY "Allow users to update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'attachments' AND
  owner = auth.uid()
);

-- Allow public access to read files
CREATE POLICY "Allow public to read files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'attachments');

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments' AND
  owner = auth.uid()
);