export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { deploymentPolicy } = await import("./lib/deployment");
    deploymentPolicy(process.env);
  }
}
