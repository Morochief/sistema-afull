$env:DATABASE_URL="postgresql://postgres.opscthfkeqlqyrfvafmv:Mjjagkaz012.@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:DIRECT_URL="postgresql://postgres.opscthfkeqlqyrfvafmv:Mjjagkaz012.@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
npx prisma generate
npx prisma db push --accept-data-loss
