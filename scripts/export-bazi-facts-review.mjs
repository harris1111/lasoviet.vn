import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { calculateBaziFacts } from "../packages/engine-adapters/dist/index.js";
const inputs = [{ localSolarDate:"1992-06-15", localTime:"08:30", offsetMinutes:420 },
  { localSolarDate:"2027-02-04", localTime:null, offsetMinutes:420 },
  { localSolarDate:"1992-06-15", localTime:"23:30", offsetMinutes:420 }];
const path = process.argv[2] ?? "plan/evidence/lsv91/bazi-synthetic-facts-3.json";
await mkdir(dirname(path), { recursive:true });
await writeFile(path, JSON.stringify({ synthetic:true, providerCalls:0, accepted:false,
  note:"Private vendor facts only. No interpretation, compatibility score, persisted birth record or independent reference accuracy is claimed. Methodology and manual sample acceptance remain pending.",
  cases:inputs.map((input,index) => ({ id:`synthetic-${index+1}`, input, output:calculateBaziFacts(input) })) },null,2)+"\n");
console.log(path);
