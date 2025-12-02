-- Add storage policies for tenant-logos bucket (admins only)
CREATE POLICY "Admins can upload tenant logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update tenant logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'tenant-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete tenant logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'tenant-logos' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can view tenant logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'tenant-logos');