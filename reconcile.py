"""Rebuild the dated overlay without changing either supplied catalog."""
import copy, csv, hashlib, json, unicodedata
from pathlib import Path
P = Path(__file__).resolve().parent
H = P / 'handoff-2026-11-21'
books = json.loads((P/'source/books.json').read_text(encoding='utf-8-sig'))
locations = json.loads((H/'pretty_side/locations.json').read_text(encoding='utf-8-sig'))
def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', s or '').lower() if c.isalnum())
byrow = {r['_source_row']: r for r in books}
current = copy.deepcopy(byrow)
# Explicit edition/contents matches; title-only matching is never used for duplicates.
overrides = {
 'P01': ['new'], 'P02':[173,174], 'P03':[63,66,65,64,59,60,61,62,58],
 'P04':[175,176,178,177,179,180,181,182,183,184], 'P05':[12],
 'P06':[19,18,17,30,None,28,20,21,22,23,24], 'P07':[67],
 'P08':[170,171,172], 'P09':[13], 'P10':[14,15,16,27,26,25],
 'P11':[78,76,80,68,74,70,71], 'P12':[75,81,73,79,77,72,69],
 'P13':[2,None,3,50,8,48], 'P14':[4,49,45,362,556,None],
 'P15':[42,41,40,39,38,37,None,None,None,33,32,31],
 'P16':[53,54,55,56,57,51,None], 'P17':[44,None,467,412,488,47],
 'P18':[152,153,154,156,157,158,None,160,161,155],
 'P19':[141,142,143,144,145,151,163,162], 'P20':[146,147,148,149,150],
 'P21':[None,None,None,349,None,46], 'P22':[11,7,10,5,6,9],
 'P23':[43,330,481,446,411,424], 'P24':[None,166,167,168,169]
}
pending_reasons = {
 'P06-5': '1990 Vol. 2 in handoff; original row 29 says 1980 Vol. 2. Year correction versus different copy is unconfirmed.',
 'P15-7': 'Both existing Sorcerer copies (rows 35 and 36) are at P15; individual sequence cannot be determined.',
 'P15-8': 'Both existing Sorcerer copies (rows 35 and 36) are at P15; individual sequence cannot be determined.',
 'P15-9': 'Two existing Skandia copies (rows 34 and 52) were both cataloged paperback. Which copy is the hardcover at P16 needs confirmation.',
 'P16-7': 'Two existing Skandia copies (rows 34 and 52) were both cataloged paperback. Which copy is the hardcover at P16 needs confirmation.',
 'P18-7': 'Two additional Red Pyramid prose copies exist (rows 159 and 164); displayed copy identity needs confirmation.',
 'P24-1': 'Two hardcover Lord of the Rings omnibuses exist (rows 165 and 323); handoff does not specify which cover is displayed.'
}
confirmed_new={'Dance of Thieves':'P11','Agnes at the End of the World':'P11','Dune':'P17','The Bone Shard Daughter':'P20','The Thousandth Floor':'P20','The Stardust Thief':'P20','Nolyn':'P21'}
placements=[]; new=[]; used=set()
for loc in locations:
    key=f"{loc['position']}-{loc['sequence']}"
    row=overrides[loc['position']][loc['sequence']-1]
    # Latest direct user inventory confirmation supersedes the attached placement list.
    if key in ['P18-8','P18-9','P18-10']:continue
    if key=='P18-7':row=164
    if key=='P06-5':row=29
    if key=='P24-1':row=165
    if key in ['P15-9','P16-7']:row='reidentified-'+loc['binding'].lower()
    if loc['title'] in confirmed_new:row='new-'+norm(loc['title'])
    observation=copy.deepcopy(loc)
    if loc['title'] in confirmed_new:
        observation['position']=confirmed_new[loc['title']]
        observation['sequence']=None # Latest location confirmed; within-cubby order not supplied.
        observation['verification']='Direct owner confirmation, 2026-11-21'
    observation['placement_id']=key
    observation['copy_id']=None
    if row is None:
        observation['review']=pending_reasons.get(key,'No matching original catalog record. Confirm whether to add a separate physical copy.')
    else:
        assert row not in used
        used.add(row)
        if isinstance(row,str):
            r={k:None for k in books[0] if k!='_source_row'}
            r.update(Title=loc['title'], Author=loc['author'], **{'Date Added':'2026-11-21'})
            cid=('inventory-2026-11-21-skandia-'+loc['binding'].lower()) if str(row).startswith('reidentified-') else 'acquisition-2026-11-21-'+norm(loc['title'])
            if str(row).startswith('reidentified-'):
                r['Date Added']=None
                r['Historical Identity']='One of original rows 34 and 52; individual correspondence unresolved. This is an existing physical copy, not a new acquisition.'
            new.append({'id':cid,'data':r,'deleted':False})
        else:
            r=current[row]; cid=f'source-row-{row}'
        observation['copy_id']=cid
        r.update({'Shelf Area':'Pretty Side','Shelf Code':observation['position'],'Shelf Look':'Pretty',
                  'Shelf Sequence':observation['sequence'],'Location Verified':'2026-11-21 — photo + owner handoff / direct confirmation',
                  'Format':loc['binding'],'Handoff Title':loc['title'],
                  'Handoff Edition / Cover':loc['edition_or_cover'], 'Handoff Notes':loc['notes'] or None})
        if row in [2,556]: r['Title']=loc['title']
        if isinstance(row,str): r['Edition / Cover']=loc['edition_or_cover'] or None
        if row==29:
            r['Title']=loc['title']
            r['Edition / Cover']='Hardcover anthology — 1990, Volume 2'
            r['Handoff Notes']='Owner directly confirmed year correction 1980 → 1990; same physical copy. Contents: Straight; No Roof But Heaven; The Evening News; The Courtship of Peggy McCoy.'
        if row in [20,24]:r['Handoff Notes']=(loc['notes']+' Year/volume from older catalog retained as historical identification; not reverified in this handoff.')
    placements.append(observation)
# Same shelf and binding are known for both copies, but their within-shelf order is not.
for row in [35,36]:
    current[row].update({'Shelf Area':'Pretty Side','Shelf Code':'P15','Format':'Paperback','Shelf Sequence':None,
                        'Location Verified':'2026-11-21 — both copies at P15; individual order unknown'})
    used.add(row)
for row,r in current.items():
    old=byrow[row]
    if old['Shelf Area']=='Pretty Side' and row not in used:
        r['Shelf Code']=None
        r['Shelf Area']='Location unconfirmed'
        r['Location Verified']='Not individually matched in 2026-11-21 rearrangement'
    elif row not in used:
        r['Location Verified']='Last catalog location; not reverified by this handoff'
    if r['Shelf Code']!=old['Shelf Code'] or r['Shelf Area']!=old['Shelf Area']:
        r['Previous Location']=f"{old['Shelf Area']} / {old['Shelf Code']} (original catalog)"
# Interior-page and owner corrections supplied explicitly in this handoff.
current[211]['ISBN']='0-8024-9035-2'
current[189].update(Title='365 Days of Prayer for Women',Author='Stephanie Sample (prayers)',ISBN='978-1-4245-5815-5',**{'Edition / Cover':'BroadStreet Publishing, 2019'})
current[208].update({'Edition / Cover':'Gaither Music Company; copyright 1987','Handoff Notes':'Printed identifier supplied as G-941565-00-9; retained verbatim, not normalized to an ISBN.'})
current[458]['Author']='John Westwood'
current[188]['Format']='Unverified'
current[188]['Handoff Notes']='Autographed; paperback-style cover, but binding explicitly not confirmed in handoff.'
owners=list(csv.DictReader((H/'owner_confirmed_details.csv').open(encoding='utf-8-sig')))
display=list(csv.DictReader((H/'display_and_edition_notes.csv').open(encoding='utf-8-sig')))
aliases={'Aeon’s Gate collection':405,'Skulduggery Pleasant: Mortal Coil':394,'Skulduggery Pleasant: Kingdom of the Wicked':393,'8 Days Till Sunrise':188,'God’s Big Plan and You':196,'365 Days of Prayer for Women':189,'The End Times in Chronological Order':216,'Brain Games: Large Print Bible Word Search':185,'NLT Bible':203,'New Testament — New International Version':218,'Things We Do for Love':489,'The Rose Cottage':279,'Around the World in Eighty Days':306}
owner_links=[]
for o in owners:
    rows=[r['_source_row'] for r in books if norm(r['Title'])==norm(o['item'])]
    if o['item'] in aliases:rows=[aliases[o['item']]]
    owner_links.append({**o,'Matched source rows':', '.join(map(str,rows)) or None})
    for row in rows:
        text=o['owner_confirmed_detail']+'; '+o['catalog_note']
        current[row]['Owner Confirmation (2026-11-21)']=' | '.join(filter(None,[current[row].get('Owner Confirmation (2026-11-21)'),text]))
ledger=[]
for row,r in current.items():
    for field,value in r.items():
        if value!=byrow[row].get(field):ledger.append({'Copy ID':f'source-row-{row}','Title':r['Title'],'Field':field,'Before':byrow[row].get(field),'After':value,'Evidence':'2026-11-21 full handoff'})
review=[{'Title':x['title'],'Position':x['placement_id'],'Status':'Needs confirmation','Reason':x['review']} for x in placements if x.get('review')]
review.append({'Title':'The Sacketts / The Scarlet Sackett','Status':'Needs confirmation','Reason':'Sackett exists at source row 498. The separate title The Sacketts has no matching catalog record; ambiguous Scarlet Sackett transcription is not used to create another copy.'})
records=[{'id':f'source-row-{row}','data':r,'deleted':False,**({'historicalOnly':True} if row in [34,52] else {})} for row,r in current.items()]+new
review.append({'Title':'The Battle for Skandia','Status':'Historical correspondence unresolved','Reason':'Two current copies: paperback P15 and hardcover P16. Original rows 34 (P06) and 52 (G01) retained as historical-only records, without assigning either to a current copy. No additional physical books counted.'})
payload={'revision':'2026-11-21','records':records,'placements':placements,'changes':ledger,'review':review,'ownerDetails':owner_links,'displayNotes':display}
payload['directOwnerConfirmation']={'date':'2026-11-21','newCopies':confirmed_new,'digestCorrection':{'source_row':29,'year':1990,'additionalCopy':False},'P18':{'sourceRows':[152,153,154,156,157,158,164],'physicalCount':7,'standaloneProseSourceRow':164},'supersededPlacementIds':['P18-8','P18-9','P18-10']}
payload['identityGroups']=[{'Title':'The Battle for Skandia','historicalIds':['source-row-34','source-row-52'],'currentIds':['inventory-2026-11-21-skandia-paperback','inventory-2026-11-21-skandia-hardcover'],'physicalCount':2,'individualMatch':'Unresolved by owner; no assumed correspondence'}]
payload['directOwnerConfirmation']['P24']='Red sprayed-edge single-volume hardcover; source row 165; blue omnibus remains separate.'
payload['directOwnerConfirmation']['Skandia']=payload['identityGroups'][0]
(P/'handoff.js').write_text('const HANDOFF = '+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(P/'reconciliation.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
hashes={str(f.relative_to(P)).replace('\\','/'):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(H.rglob('*')) if f.is_file()}
(P/'handoff-sha256.json').write_text(json.dumps(hashes,indent=2),encoding='utf-8')
print(f'{sum(not r.get('historicalOnly') for r in records)} physical copies; {len(records)} total records; {sum(bool(x["copy_id"]) for x in placements)} linked placements; {len(review)} review entries; {len(ledger)} preserved field changes')
