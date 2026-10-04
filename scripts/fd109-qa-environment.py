import json,os,secrets,subprocess,sys,time
from pathlib import Path
os.umask(0o077)
root=Path(os.environ["LSV_QA_EVIDENCE_DIRECTORY"]).resolve()
assert root != Path("/") and not root.is_relative_to(Path.cwd()), "PRIVATE_EVIDENCE_OUTSIDE_REPOSITORY_REQUIRED"
root.mkdir(parents=True, exist_ok=True, mode=0o700)
root.chmod(0o700)
network='lsv72-qa'
names=['lsv72-qa-db','lsv72-qa-mail','lsv72-qa-api','lsv72-qa-web']
def run(args):
    result=subprocess.run(args,capture_output=True,text=True)
    if result.returncode: raise RuntimeError('QA_COMMAND_FAILED_'+args[0])
    return result.stdout.strip()
if len(sys.argv) > 1 and sys.argv[1] == "cleanup":
    identity=json.loads((root/'qa-app-identity.json').read_text())
    assert identity['containers']==names, 'OWNED_CONTAINER_IDENTITY_REQUIRED'
    network_row=json.loads(run(['docker','network','inspect',network]))[0]
    assert network_row['Internal'] is True, 'INTERNAL_NETWORK_REQUIRED'
    assert {row['Name'] for row in network_row['Containers'].values()}==set(names), 'UNEXPECTED_NETWORK_MEMBER'
    inspected=json.loads(run(['docker','inspect',*names]))
    expected={'db':'postgres:16-alpine','mail':'axllent/mailpit:v1.27.4',**identity['images']}
    for row in inspected:
        kind=row['Name'].split('-')[-1]
        assert row['Config']['Image']==expected[kind], 'OWNED_IMAGE_REQUIRED'
        assert set(row['NetworkSettings']['Networks'])=={network}, 'OWNED_NETWORK_REQUIRED'
    for name in reversed(names):
        run(['docker','stop',name]); run(['docker','container','rm',name])
    run(['docker','network','rm',network])
    for filename in ['qa-db.env','qa-app.env','qa-mail.env','qa-key.pem']:
        (root/filename).unlink(missing_ok=True)
    print(json.dumps({'isolatedFixturesPurged':True,'containersRemoved':4,'networkRemoved':True,'privateCredentialsRemoved':True}))
    sys.exit(0)
assert not subprocess.run(['docker','network','inspect',network],capture_output=True).returncode==0, 'QA_NETWORK_ALREADY_EXISTS'
for name in names:
    if subprocess.run(['docker','inspect',name],capture_output=True).returncode==0: raise RuntimeError('QA_NAME_ALREADY_EXISTS')
rows=json.loads(run(['docker','inspect','lasoviet-mvp-web-1','lasoviet-mvp-api-1','lasoviet-mvp-worker-1']))
images={row['Name'].split('-')[-2]:row['Config']['Image'] for row in rows}
assert len({image.split(':sha-')[1] for image in images.values()})==1,'RELEASE_IDENTITY_REQUIRED'
revision=next(iter(images.values())).split(':sha-')[1]
run(['docker','pull','axllent/mailpit:v1.27.4'])
run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','2','-keyout',str(root/'qa-key.pem'),'-out',str(root/'qa-cert.pem'),'-subj','/CN=lsv72-qa-mail','-addext','subjectAltName=DNS:lsv72-qa-mail,DNS:lasoviet.net'])
(root/'qa-cert.pem').chmod(0o644)
password=secrets.token_hex(32)
shared={'NODE_ENV':'production','DATABASE_URL':'postgresql://qa:'+password+'@lsv72-qa-db:5432/lsv72_qa',
'REDIS_URL':'redis://lsv72-qa-unused-redis:6379','BETTER_AUTH_URL':'https://lasoviet.net',
'BETTER_AUTH_SECRET':secrets.token_hex(32),'INTERNAL_ACTOR_SECRET':secrets.token_hex(32),
'PRIVATE_API_URL':'http://lsv72-qa-api:3001','SEPAY_ENV':'disabled','FREE_PALACE_GENERATION_ENABLED':'false',
'SMTP_HOST':'lsv72-qa-mail','SMTP_PORT':'587','SMTP_USERNAME':'qa','SMTP_PASSWORD':password,
'SMTP_FROM_ADDRESS':'QA <qa@example.test>','SMTP_USE_SSL':'1','NODE_EXTRA_CA_CERTS':'/qa-cert.pem'}
def envfile(name,values):
    path=root/name
    path.write_text(''.join(key+'='+str(value)+'\n' for key,value in values.items()))
    return str(path)
dbfile=envfile('qa-db.env',{'POSTGRES_USER':'qa','POSTGRES_PASSWORD':password,'POSTGRES_DB':'lsv72_qa'})
appfile=envfile('qa-app.env',shared)
mailfile=envfile('qa-mail.env',{'MP_SMTP_BIND_ADDR':'0.0.0.0:587','MP_SMTP_TLS_CERT':'/qa-cert.pem',
'MP_SMTP_TLS_KEY':'/qa-key.pem','MP_SMTP_REQUIRE_STARTTLS':'true','MP_SMTP_AUTH':'qa:'+password})
run(['docker','network','create','--internal',network])
created=[]
try:
    run(['docker','run','-d','--name',names[0],'--network',network,'--env-file',dbfile,'--tmpfs','/var/lib/postgresql/data','postgres:16-alpine']);created.append(names[0])
    for attempt in range(60):
        if subprocess.run(['docker','exec',names[0],'pg_isready','-U','qa','-d','lsv72_qa'],capture_output=True).returncode==0: break
        time.sleep(0.5)
    else: raise RuntimeError('QA_DATABASE_NOT_READY')
    migration=run(['docker','run','--rm','--network',network,'--env-file',appfile,'--entrypoint','node',images['worker'],'-e',
      "import('@lasoviet/database').then(async d=>{if(new URL(process.env.DATABASE_URL).hostname!=='lsv72-qa-db')throw Error('ISOLATION');await d.runMigrations(process.env.DATABASE_URL);process.exit(0)})"])
    (root/'qa-migrations.log').write_text(migration)
    run(['docker','run','-d','--name',names[1],'--network',network,'--user','0','--env-file',mailfile,
      '-v',str(root/'qa-cert.pem')+':/qa-cert.pem:ro','-v',str(root/'qa-key.pem')+':/qa-key.pem:ro','axllent/mailpit:v1.27.4']);created.append(names[1])
    run(['docker','run','-d','--name',names[2],'--network',network,'--env-file',appfile,'-v',str(root/'qa-cert.pem')+':/qa-cert.pem:ro',images['api']]);created.append(names[2])
    run(['docker','run','-d','--name',names[3],'--network',network,'--env-file',appfile,'-v',str(root/'qa-cert.pem')+':/qa-cert.pem:ro',
      '-p','127.0.0.1:65520:3000',images['web']]);created.append(names[3])
    output={'releaseSha':revision,'images':images,'internalNetwork':True,'isolatedDatabase':True,'smtpCaptureOnly':True,
      'noWorkerRunning':True,'freeAiOff':True,'loopbackWebOrigin':'http://127.0.0.1:65520','containers':created}
    (root/'qa-app-identity.json').write_text(json.dumps(output,indent=2));print(json.dumps(output))
except BaseException:
    for name in reversed(created):
        subprocess.run(['docker','stop',name],capture_output=True);subprocess.run(['docker','rm',name],capture_output=True)
    subprocess.run(['docker','network','rm',network],capture_output=True)
    raise
