import { PrismaClient } from '@prisma/client';

async function main() {
  const url = process.env.DATABASE_URL;
  
  if (!url) {
    console.log('❌ DATABASE_URL is not defined');
    return;
  }

  // Parse URL safely without logging the password
  try {
    // Regex to capture parts: postgresql://user:password@host:port/db?params
    const match = url.match(/^(postgres(?:ql)?):\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?(?:\/(.*))?$/);
    
    if (url.includes('@')) {
      const parts = url.split('@')[1]; // host:port/db?params
      const [hostPort, dbParams] = parts.split('/');
      const [host, port] = hostPort.split(':');
      
      console.log('--- Database Config Check ---');
      console.log(`✅ Host detected: ${host}`);
      console.log(`✅ Port: ${port || '5432'} (Default)`);
      
      if (dbParams) {
        const [dbName, params] = dbParams.split('?');
        console.log(`✅ Database: ${dbName}`);
        
        if (params) {
          console.log('--- Connection Parameters ---');
          params.split('&').forEach(p => {
            const [key, val] = p.split('=');
            console.log(`🔹 ${key}: ${val}`);
          });
        } else {
          console.log('⚠️ No connection parameters found (e.g., pgbouncer=true, connection_limit, etc.)');
        }
      }
      
      // Recommendation
      if (host.includes('supabase')) {
        console.log('\n--- Supabase Optimization Tips ---');
        if (port === '5432' && !url.includes('pgbouncer=true')) {
          console.log('⚠️ You are using port 5432 (Session mode) without pgbouncer=true.');
          console.log('   For serverless/Next.js, consider using port 6543 (Transaction mode) OR adding ?pgbouncer=true');
        } else if (port === '6543') {
          console.log('✅ You are using port 6543 (Transaction pooler). This is good for Next.js!');
        }
      }
    }
  } catch (e) {
    console.log('Error parsing URL format');
  }
}

main().catch(console.error);
