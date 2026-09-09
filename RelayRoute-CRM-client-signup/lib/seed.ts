type Db = D1Database;

const vendors = [
  ['ven_abc','ABC Appliance Rentals','Tasha Green','214-555-0188','partners@abcappliance.test','Dallas','75212,75211,75208,75224',5,25,85,70,15,82,94,1,1,0,1,'https://example.com/abc-relayroute','https://example.com/abc-tracking'],
  ['ven_metro','Metro Washer Rentals','Marcus Bell','469-555-0139','leads@metrowasher.test','Dallas, Mesquite','75212,75217,75227,75228',3,15,85,75,10,68,88,0,1,1,1,'https://example.com/metro-signup','https://example.com/metro-tracking'],
  ['ven_dfw','DFW Appliance Leasing','Priya Shah','972-555-0152','referrals@dfwappliance.test','Irving, Las Colinas','75060,75061,75062,75063',8,40,90,70,20,76,91,1,1,0,1,'https://example.com/dfw-onboarding','https://example.com/dfw-dashboard'],
  ['ven_south','South Dallas Home Rentals','Andre Woods','214-555-0114','hello@southdallashome.test','DeSoto, Lancaster','75115,75116,75134,75137',4,20,85,73,12,59,86,0,1,1,1,'https://example.com/south-signup',''],
] as const;

const requirements = [
  ['req_abc_hookup','ven_abc','dryer_hookup','Dryer hookup','Is your dryer hookup electric?','single_select','["Electric","Gas","Unknown"]','["Electric"]','["Gas"]','Confirm electric dryer hookup',1],
  ['req_abc_ach','ven_abc','ach_consent','ACH enrollment','Would automatic ACH monthly payments work for you?','boolean','["Yes","No"]','[true,"Yes"]','[false,"No"]','Confirm ACH enrollment',2],
  ['req_abc_term','ven_abc','minimum_term','Six-month minimum','Would a 6-month minimum rental work for you?','boolean','["Yes","No"]','[true,"Yes"]','[false,"No"]','Confirm six-month minimum',3],
  ['req_abc_stairs','ven_abc','stairs','Stairs','Is the laundry area no more than one flight up?','single_select','["None","One flight","Multiple flights","Unknown"]','["None","One flight"]','["Multiple flights"]','Confirm stairs access',4],
  ['req_metro_hookup','ven_metro','dryer_hookup','Dryer hookup','Is your dryer hookup electric or gas?','single_select','["Electric","Gas","Unknown"]','["Electric","Gas"]','[]','Confirm dryer hookup',1],
  ['req_metro_autopay','ven_metro','autopay','Autopay','Would automatic monthly payments work for you?','boolean','["Yes","No"]','[true,"Yes"]','[false,"No"]','Confirm automatic payments',2],
  ['req_metro_address','ven_metro','delivery_address','Delivery address','What is the delivery address?','text','[]','[]','[]','Collect delivery address',3],
  ['req_dfw_id','ven_dfw','photo_id','Photo ID','Do you have a current photo ID?','boolean','["Yes","No"]','[true,"Yes"]','[false,"No"]','Confirm photo ID',1],
  ['req_dfw_term','ven_dfw','minimum_term','Three-month minimum','Would a 3-month minimum rental work for you?','boolean','["Yes","No"]','[true,"Yes"]','[false,"No"]','Confirm three-month minimum',2],
  ['req_dfw_hookup','ven_dfw','dryer_hookup','Dryer hookup','Is your dryer hookup electric?','single_select','["Electric","Gas","Unknown"]','["Electric"]','["Gas"]','Confirm electric dryer hookup',3],
  ['req_south_hookup','ven_south','dryer_hookup','Dryer hookup','Is your dryer hookup electric or gas?','single_select','["Electric","Gas","Unknown"]','["Electric","Gas"]','[]','Confirm dryer hookup',1],
  ['req_south_autopay','ven_south','autopay','Autopay','Would automatic monthly payments work for you?','boolean','["Yes","No"]','[true,"Yes"]','[false,"No"]','Confirm automatic payments',2],
] as const;

export async function seedIfEmpty(db: Db, ownerUserId: string) {
  const now = new Date();
  const claim = await db.prepare('INSERT OR IGNORE INTO routing_settings (id,capacity_weight,priority_weight,revenue_weight,conversion_weight,reliability_weight,preferred_weight,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind('default',30,20,20,15,10,5,now.toISOString()).run();
  if (!claim.meta.changes) return;
  const statements: D1PreparedStatement[] = [];
  for (const v of vendors) {
    const slug=v[0].replace('ven_','');
    statements.push(db.prepare(`INSERT INTO vendors (id,name,contact_name,phone,email,cities,public_slug,public_form_enabled,show_vendor_branding,lead_delivery_mode,max_leads_day,max_leads_week,customer_monthly_price,fulfillment_cost,recurring_revenue,priority,reliability,preferred,supports_electric,supports_gas,stairs_allowed,signup_url,tracking_url,conversion_rate,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(v[0],v[1],v[2],v[3],v[4],v[5],slug,1,0,'manual',v[7],v[8],v[9],v[10],v[11],v[12],v[13],v[14],v[15],v[16],v[17],v[18],v[19],v[0]==='ven_abc'?63:v[0]==='ven_metro'?54:v[0]==='ven_dfw'?61:47,now.toISOString(),now.toISOString()));
    for (const zip of v[6].split(',')) statements.push(db.prepare('INSERT INTO vendor_service_zips (id,vendor_id,zip) VALUES (?,?,?)').bind(crypto.randomUUID(),v[0],zip));
  }
  for (const r of requirements) statements.push(db.prepare(`INSERT INTO vendor_requirements (id,vendor_id,key,name,question,type,options_json,qualifying_json,disqualifying_json,customer_label,sort_order,description,required) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`).bind(r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],r[9],r[10],''));
  await db.batch(statements);

  const demo = [
    ['Jordan','Davis','2145551234','75212','Dallas','qualifying','ven_abc',15,-1,{}],
    ['Monica','Lewis','2145556018','75217','Dallas','new',null,0,-2,{}],
    ['Carlos','Vega','4695554402','75228','Dallas','sent_to_vendor','ven_metro',10,-3,{dryer_hookup:'Gas',autopay:true,delivery_address:'2711 Pine St'}],
    ['Alicia','Brown','9725558090','75060','Irving','converted','ven_dfw',20,-4,{dryer_hookup:'Electric',photo_id:true,minimum_term:true}],
    ['Devon','Price','2145557755','99999','','no_vendor_available',null,0,-5,{}],
    ['Nina','Foster','2145551129','75211','Dallas','installed','ven_abc',15,-8,{dryer_hookup:'Electric',ach_consent:true,minimum_term:true,stairs:'None'}],
    ['Omar','Reed','2145553377','75115','DeSoto','qualified','ven_south',12,-10,{dryer_hookup:'Gas',autopay:true}],
    ['Grace','Kim','4695552930','75227','Dallas','lost','ven_metro',10,-12,{dryer_hookup:'Electric',autopay:true,delivery_address:'815 Oak Ave'}],
  ] as const;
  let displayId = 1042;
  for (const lead of demo) {
    const created = new Date(now); created.setDate(created.getDate()+lead[8]);
    const id = crypto.randomUUID();
    await db.prepare(`INSERT INTO leads (id,display_id,owner_user_id,first_name,last_name,phone,zip,city,status,assigned_vendor_id,expected_monthly_revenue,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,displayId++,ownerUserId,lead[0],lead[1],lead[2],lead[3],lead[4],lead[5],lead[6],lead[7],'Facebook Messenger',created.toISOString(),created.toISOString()).run();
    const answerStatements = Object.entries(lead[9]).map(([key,value]) => db.prepare('INSERT INTO lead_requirement_answers (id,lead_id,requirement_key,value_json,updated_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),id,key,JSON.stringify(value),created.toISOString()));
    answerStatements.push(db.prepare('INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,ownerUserId,'created','Lead created',created.toISOString()));
    await db.batch(answerStatements);
  }
}
