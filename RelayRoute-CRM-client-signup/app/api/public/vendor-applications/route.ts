import { getDb } from '@/db';
import { cleanText, enforceRateLimit, validateVendorApplication } from '@/lib/public-intake';

export async function POST(request:Request) {
  const db=getDb();
  if (!(await enforceRateLimit(db,request,'vendor-application',5))) return Response.json({error:'Too many requests. Please try again later.'},{status:429});
  let body:Record<string,unknown>;
  try { body=await request.json() as Record<string,unknown>; } catch { return Response.json({error:'Invalid request'},{status:400}); }
  const validated=validateVendorApplication(body);
  if (!validated.ok) return Response.json({error:validated.error},{status:400});
  const value=validated.value; const now=new Date().toISOString(); const id=crypto.randomUUID();
  const {requirements,...data}=value;
  await db.prepare('INSERT INTO vendor_applications (id,status,company_name,contact_name,phone,email,website,primary_market,data_json,requirements_json,source,submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id,'pending',value.companyName,value.contactName,value.phone,value.email,value.website,value.primaryMarket,JSON.stringify(data),JSON.stringify(requirements),cleanText(body.source,100)||'public_vendor_application',now).run();
  return Response.json({ok:true},{status:201});
}
