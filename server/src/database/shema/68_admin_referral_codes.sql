-- Génère un code de parrainage pour chaque administrateur qui n'en a pas.
-- Même logique que le script generate_missing_referral_codes.ts :
-- code unique de 8 caractères pris dans l'alphabet A-Z0-9.

DO $$
DECLARE
    admin_record RECORD;
    alphabet CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    generated_code TEXT;
    char_index INTEGER;
BEGIN
    FOR admin_record IN
        SELECT id, email
        FROM users
        WHERE role = 'ADMIN'
          AND (code_invitation IS NULL OR code_invitation = '')
        ORDER BY created_at
    LOOP
        LOOP
            generated_code := '';
            FOR char_index IN 1..8 LOOP
                generated_code := generated_code
                    || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
            END LOOP;

            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM users WHERE code_invitation = generated_code
            );
        END LOOP;

        UPDATE users
        SET code_invitation = generated_code,
            updated_at = NOW()
        WHERE id = admin_record.id;

        RAISE NOTICE 'Code de parrainage généré pour l''admin % (%) : %',
            admin_record.email, admin_record.id, generated_code;
    END LOOP;
END $$;
