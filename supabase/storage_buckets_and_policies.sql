-- Storage: criação idempotente de buckets e políticas com guardas
-- Este bloco só é executado se o schema "storage" existir.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    -- Buckets: criar "avatars" e "meetings" se não existirem
    INSERT INTO storage.buckets (id, name, public)
    SELECT 'avatars', 'avatars', TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM storage.buckets WHERE id = 'avatars'
    );

    INSERT INTO storage.buckets (id, name, public)
    SELECT 'meetings', 'meetings', TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM storage.buckets WHERE id = 'meetings'
    );

    -- Políticas: aplicar apenas se a tabela storage.objects existir
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'storage' AND table_name = 'objects'
    ) THEN
      -- Leitura pública para avatars/meetings
      DROP POLICY IF EXISTS "Public read for avatars and meetings" ON storage.objects;
      CREATE POLICY "Public read for avatars and meetings"
      ON storage.objects
      FOR SELECT
      TO PUBLIC
      USING (bucket_id IN ('avatars', 'meetings'));

      -- Inserção por usuários autenticados
      DROP POLICY IF EXISTS "Authenticated insert avatars and meetings" ON storage.objects;
      CREATE POLICY "Authenticated insert avatars and meetings"
      ON storage.objects
      FOR INSERT
      TO AUTHENTICATED
      WITH CHECK (bucket_id IN ('avatars', 'meetings'));

      -- Atualização por usuários autenticados
      DROP POLICY IF EXISTS "Authenticated update avatars and meetings" ON storage.objects;
      CREATE POLICY "Authenticated update avatars and meetings"
      ON storage.objects
      FOR UPDATE
      TO AUTHENTICATED
      USING (bucket_id IN ('avatars', 'meetings'))
      WITH CHECK (bucket_id IN ('avatars', 'meetings'));

      -- Exclusão por usuários autenticados
      DROP POLICY IF EXISTS "Authenticated delete avatars and meetings" ON storage.objects;
      CREATE POLICY "Authenticated delete avatars and meetings"
      ON storage.objects
      FOR DELETE
      TO AUTHENTICATED
      USING (bucket_id IN ('avatars', 'meetings'));
    END IF;
  END IF;
END$$;

-- Observação:
-- Se o schema "storage" não existir, ative o serviço no Supabase Studio:
-- Storage → Create bucket (ou habilite Storage no projeto). Após isso, reexecute este script.

