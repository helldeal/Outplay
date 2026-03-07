import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  const projectRoot = process.cwd();
  const sourceDir = resolve(projectRoot, "src/assets");
  const targetDir = resolve(projectRoot, "public/assets");

  await rm(targetDir, { recursive: true, force: true });
  await mkdir(resolve(projectRoot, "public"), { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true });
}

main().catch((error) => {
  console.error(
    "[sync-static-assets] Failed to copy src/assets to public/assets",
  );
  console.error(error);
  process.exit(1);
});
