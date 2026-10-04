import hashlib, json, os, secrets, subprocess, sys, time
from pathlib import Path
os.umask(0o077)
root = Path(os.environ["LSV_FUNNEL_EVIDENCE_DIRECTORY"]).resolve()
source = Path.cwd().resolve()
assert root != Path("/") and not root.is_relative_to(source), "PRIVATE_EVIDENCE_OUTSIDE_REPOSITORY_REQUIRED"
root.mkdir(parents=True, exist_ok=True, mode=0o700)
root.chmod(0o700)
network = "lsv80-qa"
names = [network + "-" + kind for kind in ["db", "mail", "api", "web"]]
node_image = "node:24.16.0-bookworm-slim"
def run(args):
    value = subprocess.run(args, capture_output=True, text=True)
    if value.returncode: raise RuntimeError("QA_COMMAND_FAILED:" + args[0])
    return value.stdout.strip()
if len(sys.argv) > 1 and sys.argv[1] == "cleanup":
    identity = json.loads((root / "identity.json").read_text())
    assert identity["containers"] == names
    run_id = identity["runId"]
    row = json.loads(run(["docker", "network", "inspect", network]))[0]
    assert row["Labels"].get("lasoviet.qa.run") == run_id
    assert row["Internal"] and {item["Name"] for item in row["Containers"].values()} == set(names)
    expected = {names[0]: "postgres:16-alpine", names[1]: "axllent/mailpit:v1.27.4", names[2]: node_image, names[3]: node_image}
    for item in json.loads(run(["docker", "inspect", *names])):
        assert item["Config"]["Image"] == expected[item["Name"].lstrip("/")]
        assert item["Config"]["Labels"].get("lasoviet.qa.run") == run_id
        assert set(item["NetworkSettings"]["Networks"]) == {network}
    for name in reversed(names):
        run(["docker", "stop", name]); run(["docker", "container", "rm", name])
    run(["docker", "network", "rm", network])
    for name in ["app.env", "db.env", "mail.env", "qa-key.pem"]: (root / name).unlink(missing_ok=True)
    print(json.dumps({"ownedFixturesPurged": True, "containersRemoved": 4, "networkRemoved": True, "credentialsRemoved": True}))
    sys.exit(0)
assert subprocess.run(["docker", "network", "inspect", network], capture_output=True).returncode != 0
for name in names:
    assert subprocess.run(["docker", "inspect", name], capture_output=True).returncode != 0
for image in [node_image, "postgres:16-alpine", "axllent/mailpit:v1.27.4"]: run(["docker", "pull", image])
created = []
network_attempted = False
run_id = secrets.token_hex(16)
expected = {names[0]: "postgres:16-alpine", names[1]: "axllent/mailpit:v1.27.4", names[2]: node_image, names[3]: node_image}
try:
    run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "2", "-keyout", str(root / "qa-key.pem"), "-out", str(root / "qa-cert.pem"), "-subj", "/CN=lsv80-qa-mail", "-addext", "subjectAltName=DNS:lsv80-qa-mail,DNS:lasoviet.net"])
    (root / "qa-cert.pem").chmod(0o644)
    password = secrets.token_hex(32)
    def envfile(filename, values):
        path = root / filename
        path.write_text("".join(key + "=" + str(value) + "\n" for key, value in values.items()))
        return str(path)
    appfile = envfile("app.env", {"NODE_ENV": "production", "DATABASE_URL": "postgresql://qa:" + password + "@lsv80-qa-db:5432/lsv80_qa", "REDIS_URL": "redis://lsv80-qa-unused-redis:6379", "BETTER_AUTH_URL": "https://lasoviet.net", "BETTER_AUTH_SECRET": secrets.token_hex(32), "INTERNAL_ACTOR_SECRET": secrets.token_hex(32), "PRIVATE_API_URL": "http://lsv80-qa-api:3001", "SEPAY_ENV": "disabled", "SEPAY_AUTO_APPROVE_TOPUPS": "true", "FREE_PALACE_GENERATION_ENABLED": "false", "SMTP_HOST": "lsv80-qa-mail", "SMTP_PORT": "587", "SMTP_USERNAME": "qa", "SMTP_PASSWORD": password, "SMTP_FROM_ADDRESS": "QA <qa@example.test>", "SMTP_USE_SSL": "1", "NODE_EXTRA_CA_CERTS": "/qa-cert.pem"})
    dbfile = envfile("db.env", {"POSTGRES_USER": "qa", "POSTGRES_PASSWORD": password, "POSTGRES_DB": "lsv80_qa"})
    mailfile = envfile("mail.env", {"MP_SMTP_BIND_ADDR": "0.0.0.0:587", "MP_SMTP_TLS_CERT": "/qa-cert.pem", "MP_SMTP_TLS_KEY": "/qa-key.pem", "MP_SMTP_REQUIRE_STARTTLS": "true", "MP_SMTP_AUTH": "qa:" + password})
    network_attempted = True
    run(["docker", "network", "create", "--internal", "--label", "lasoviet.qa.run=" + run_id, network])
    created.append(names[0])
    run(["docker", "run", "--label", "lasoviet.qa.run=" + run_id, "-d", "--name", names[0], "--network", network, "--env-file", dbfile, "--tmpfs", "/var/lib/postgresql/data", "postgres:16-alpine"])
    for attempt in range(60):
        if subprocess.run(["docker", "exec", names[0], "pg_isready", "-U", "qa", "-d", "lsv80_qa"], capture_output=True).returncode == 0: break
        time.sleep(0.5)
    else: raise RuntimeError("QA_DATABASE_NOT_READY")
    base = ["docker", "run", "--label", "lasoviet.qa.run=" + run_id, "--network", network, "--env-file", appfile, "-v", str(source) + ":/app:ro", "-v", str(root / "qa-cert.pem") + ":/qa-cert.pem:ro", "-w", "/app"]
    run(base + ["--rm", node_image, "node", "-e", "import('./packages/database/dist/index.js').then(async d=>{if(new URL(process.env.DATABASE_URL).hostname!=='lsv80-qa-db')throw Error('ISOLATION');await d.runMigrations(process.env.DATABASE_URL);process.exit(0)})"])
    created.append(names[1])
    run(["docker", "run", "--label", "lasoviet.qa.run=" + run_id, "-d", "--name", names[1], "--user", "0", "--network", network, "--env-file", mailfile, "-v", str(root / "qa-cert.pem") + ":/qa-cert.pem:ro", "-v", str(root / "qa-key.pem") + ":/qa-key.pem:ro", "axllent/mailpit:v1.27.4"])
    created.append(names[2])
    run(base + ["-d", "--name", names[2], "-e", "PORT=3001", node_image, "node", "apps/api/dist/main.js"])
    created.append(names[3])
    run(base + ["-d", "--name", names[3], "-e", "PORT=3000", "-e", "HOSTNAME=0.0.0.0", node_image, "node", "apps/web/.next/standalone/apps/web/server.js"])
    artifacts = {name: hashlib.sha256((source / name).read_bytes()).hexdigest() for name in ["apps/web/.next/BUILD_ID", "apps/api/dist/main.js", "packages/backend/dist/commerce/wallet-unlock.service.js"]}
    identity = {"runId": run_id, "builtArtifacts": artifacts, "revision": run(["git", "rev-parse", "HEAD"]), "builtCandidateNotPublishedArtifact": True, "sourceRoot": str(source), "containers": names, "network": network, "noWorkerRunning": True, "freeAiOff": True, "paymentSimulationNotRevenue": True, "smtpCaptureOnly": True, "browserInitialNow": "2026-10-04T12:00:00.000Z"}
    (root / "identity.json").write_text(json.dumps(identity, indent=2))
    print(json.dumps(identity))
except BaseException:
    try:
        for name in reversed(created):
            result = subprocess.run(["docker", "inspect", name], capture_output=True, text=True)
            if result.returncode == 0:
                item = json.loads(result.stdout)[0]
                assert item["Config"]["Image"] == expected[name] and item["Config"]["Labels"].get("lasoviet.qa.run") == run_id and item["HostConfig"]["NetworkMode"] == network and set(item["NetworkSettings"]["Networks"]).issubset({network}), "OWNED_PARTIAL_FIXTURE_REQUIRED"
                run(["docker", "stop", name]); run(["docker", "container", "rm", name])
        if network_attempted:
            result = subprocess.run(["docker", "network", "inspect", network], capture_output=True, text=True)
            if result.returncode == 0:
                item = json.loads(result.stdout)[0]
                if item["Labels"].get("lasoviet.qa.run") == run_id:
                    assert item["Internal"] and not item["Containers"], "OWNED_EMPTY_NETWORK_REQUIRED"
                    run(["docker", "network", "rm", network])
    finally:
        for filename in ["app.env", "db.env", "mail.env", "qa-key.pem"]: (root / filename).unlink(missing_ok=True)
    raise
