import { deploymentPolicy } from "../lib/deployment";
console.log(JSON.stringify(deploymentPolicy(process.env), null, 2));
