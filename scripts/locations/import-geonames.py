#!/usr/bin/env python3
"""Download a GeoNames snapshot and emit transactional psql import SQL.
Usage: python3 scripts/locations/import-geonames.py --cache /tmp/geonames --output /tmp/geonames.sql
Then: psql "$DATABASE_ADMIN_URL" -v ON_ERROR_STOP=1 -f /tmp/geonames.sql
Downloads are cached; manifest records SHA256 for repeatability. Runtime uses no GeoNames API.
"""
import argparse, gzip, hashlib, io, json, pathlib, urllib.request, zipfile

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--reference-output', help='Write pinned geonames.tsv.gz and manifest for the migrator')
    args = parser.parse_args()
    cache = pathlib.Path(args.cache); cache.mkdir(parents=True, exist_ok=True)
    manifest = {'license':'CC BY 4.0', 'attribution':'GeoNames — https://www.geonames.org/', 'files':{}}
    for name in ['countryInfo.txt','admin1CodesASCII.txt','cities500.zip']:
        path = cache / name
        url = 'https://download.geonames.org/export/dump/' + name
        if not path.exists(): urllib.request.urlretrieve(url, path)
        manifest['files'][name] = {'url':url,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    rows = []
    countries = set()
    for line in (cache/'countryInfo.txt').read_text().splitlines():
        if not line or line.startswith('#'): continue
        r=line.split('\t')
        if r[0] in {'AN','CS'}: continue  # GeoNames explicitly marks these countries as dissolved.
        countries.add(r[0]); rows.append([r[0],'country',r[0],'',r[4],r[4],r[0]+' '+r[1],r[7] or '0'])
    states = set()
    for line in (cache/'admin1CodesASCII.txt').read_text().splitlines():
        r=line.split('\t'); country,code=r[0].split('.',1)
        if country not in countries: continue
        states.add((country,code)); rows.append([r[0],'state',country,code,r[1],r[2],'',0])
    with zipfile.ZipFile(cache/'cities500.zip') as archive:
        for line in io.TextIOWrapper(archive.open('cities500.txt'),encoding='utf8'):
            r=line.rstrip('\n').split('\t')
            if r[8] not in countries: continue
            # An unknown administrative code must not create an unselectable city.
            state = r[10] if (r[8],r[10]) in states else ''
            rows.append(['gn:'+r[0],'city',r[8],state,r[1],r[2],r[3],r[14] or '0'])
    def esc(v): return str(v).replace('\\','\\\\').replace('\t','\\t').replace('\n','\\n').replace('\r','\\r')
    if args.reference_output:
        root=pathlib.Path(args.reference_output); root.mkdir(parents=True,exist_ok=True)
        with open(root/'geonames.tsv.gz','wb') as file:
            with gzip.GzipFile(fileobj=file,mode='wb',mtime=0) as archive:
                for row in rows: archive.write(('\t'.join(map(esc,row))+'\n').encode())
        manifest['snapshotSha256']=hashlib.sha256((root/'geonames.tsv.gz').read_bytes()).hexdigest()
        (root/'geonames-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    with open(args.output,'w') as out:
        out.write('BEGIN;\nCREATE TEMP TABLE incoming_locations (LIKE location_catalogue INCLUDING DEFAULTS) ON COMMIT DROP;\nCOPY incoming_locations(id,kind,country_code,state_code,name,ascii_name,aliases,population) FROM stdin;\n')
        for row in rows: out.write('\t'.join(map(esc,row))+'\n')
        out.write('\\.\nDELETE FROM location_catalogue WHERE source=\'GeoNames\' AND id NOT IN (SELECT id FROM incoming_locations);\nINSERT INTO location_catalogue SELECT * FROM incoming_locations ON CONFLICT(id) DO UPDATE SET name=excluded.name,ascii_name=excluded.ascii_name,aliases=excluded.aliases,country_code=excluded.country_code,state_code=excluded.state_code,population=excluded.population,updated_at=now();\n')
        payload=json.dumps(manifest).replace("'","''")
        out.write("INSERT INTO location_catalogue_imports(source,manifest) VALUES ('GeoNames','"+payload+"'::jsonb) ON CONFLICT(source) DO UPDATE SET manifest=excluded.manifest,imported_at=now();\nCOMMIT;\n")
    print(json.dumps({'rows':len(rows),'output':args.output,'manifest':manifest}))
if __name__ == '__main__': main()
