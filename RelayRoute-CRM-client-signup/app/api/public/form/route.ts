import { loadState } from '@/lib/server-data';
import { cleanSlug, toPublicFormConfig } from '@/lib/public-intake';

export async function GET(request:Request) {
  const slug=cleanSlug(new URL(request.url).searchParams.get('slug'));
  const state=await loadState('public-intake');
  if (slug) {
    const vendor=state.vendors.find((item)=>item.publicSlug===slug && item.publicFormEnabled);
    if (!vendor) return Response.json({error:'This rental form is unavailable.'},{status:404});
    return Response.json(toPublicFormConfig(vendor));
  }
  const seen=new Set<string>();
  const generic=state.vendors.filter((vendor)=>vendor.active&&vendor.publicFormEnabled).flatMap((vendor)=>vendor.requirements).filter((requirement)=>!seen.has(requirement.key)&&seen.add(requirement.key));
  return Response.json(toPublicFormConfig(null,generic));
}
