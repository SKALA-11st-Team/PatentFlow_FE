// CONTRACT-10(3단계): BE가 빌드 시 박제한 openapi.json(계약 단일 소스)을 FE 벤더 사본으로 동기화한다.
//
// 로컬은 형제 레포 레이아웃(final_project/PatentFlow_BE, /PatentFlow_FE)을 가정한다.
// 분리 레포 CI에서는 BE 릴리스 아티팩트(openapi.json)를 같은 경로(../../PatentFlow_BE/openapi.json)에
// 내려받아 두면 동일하게 동작한다. 동기화 후 `npm run openapi:gen`으로 타입을 재생성한다.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../../PatentFlow_BE/openapi.json");
const dest = resolve(here, "../openapi/patentflow-openapi.json");

if (!existsSync(source)) {
  console.error(
    `[sync-openapi] BE 스펙을 찾을 수 없습니다: ${source}\n` +
      "  BE 모듈에서 `mvn -Dtest=OpenApiSpecExportTest -Dopenapi.update=true test` 로 생성하거나,\n" +
      "  CI라면 BE 빌드 아티팩트(openapi.json)를 해당 경로에 배치하세요.",
  );
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(source, dest);
console.log(`[sync-openapi] 동기화 완료: ${source}\n             → ${dest}`);
